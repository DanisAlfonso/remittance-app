import { Router, Response, RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { obpApiService } from '../services/obp-api';
import { transferService } from '../services/transfer';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All Wise routes require authentication
router.use(authenticateToken);

// Validation schemas
const createAccountSchema = z.object({
  currency: z.string().length(3, 'Currency must be 3 characters'),
  country: z.string().length(2, 'Country must be 2 characters'),
  type: z.enum(['SAVINGS', 'CHECKING']),
  name: z.string().min(1, 'Account name is required').max(100),
});

// OAuth schema removed - using direct OBP-API integration

const updateBalanceSchema = z.object({
  amount: z.number().min(0, 'Amount must be positive'),
});

// OAuth functionality removed - using direct OBP-API integration

// OAuth callback functionality removed - using direct OBP-API integration

/**
 * POST /api/v1/wise/accounts
 * Create a new Wise account (virtual IBAN)
 */
const createAccountHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createAccountSchema.parse(req.body);
    const userId = req.user?.id;
    
    // Check if user already has an account for this currency
    const existingAccount = await prisma.wiseAccount.findFirst({
      where: {
        userId,
        currency: validatedData.currency,
        status: 'ACTIVE',
      },
    });
    
    if (existingAccount) {
      res.status(409).json({
        error: 'Account already exists',
        message: `You already have an active ${validatedData.currency} account`,
      });
      return;
    }
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    // Create account through OBP-API
    console.log('🏦 Creating account via OBP-API...');
    const createResult = await obpApiService.createAccount({
      userId,
      currency: validatedData.currency,
      country: validatedData.country,
      type: validatedData.type,
      name: validatedData.name,
    });
    
    if (!createResult.success) {
      res.status(400).json({
        error: 'Account creation failed',
        message: createResult.error?.error_description || 'Failed to create Wise account',
      });
      return;
    }
    
    const wiseAccount = createResult.data!;
    
    // Get account details including IBAN from OBP-API (optional - fallback if fails)
    console.log('🔍 Getting OBP account details...');
    console.log('🔍 Using OBP bank ID:', wiseAccount.obp_bank_id);
    console.log('🔍 Using OBP account ID:', wiseAccount.obp_account_id);
    let detailsResult: any = { success: false, data: null };
    try {
      if (wiseAccount.obp_bank_id && wiseAccount.obp_account_id) {
        detailsResult = await obpApiService.getAccountDetails(wiseAccount.obp_bank_id, wiseAccount.obp_account_id);
        console.log('✅ Successfully retrieved account details with BIC:', detailsResult.data?.bic);
      } else {
        console.log('⚠️ Missing OBP bank ID or account ID, skipping account details retrieval');
      }
    } catch (error) {
      console.log('⚠️ Could not get account details, using data from account creation:', error);
    }
    
    // Store account in database
    const savedAccount = await prisma.wiseAccount.create({
      data: {
        userId,
        wiseAccountId: wiseAccount.id,
        wiseProfileId: wiseAccount.profile,
        obpBankId: wiseAccount.obp_bank_id,
        obpAccountId: wiseAccount.obp_account_id,
        currency: validatedData.currency,
        country: validatedData.country,
        accountType: validatedData.type,
        name: validatedData.name,
        status: wiseAccount.status,
        iban: wiseAccount.iban || detailsResult.data?.iban,
        accountNumber: wiseAccount.account_number || detailsResult.data?.account_number,
        sortCode: wiseAccount.sort_code || detailsResult.data?.sort_code,
        routingNumber: detailsResult.data?.routing_number,
        bic: detailsResult.data?.bic || 'ENHBK1XXXX', // Default to Enhanced Bank BIC
        bankName: detailsResult.data?.bank_name || 'Enhanced Test Bank Limited',
        bankAddress: detailsResult.data?.bank_address || 'Enhanced Bank Location',
        lastBalance: wiseAccount.balance.amount,
        balanceUpdatedAt: new Date(),
      },
    });
    
    res.status(201).json({
      message: 'Wise account created successfully',
      account: {
        id: savedAccount.id,
        currency: savedAccount.currency,
        country: savedAccount.country,
        type: savedAccount.accountType,
        name: savedAccount.name,
        status: savedAccount.status,
        iban: savedAccount.iban,
        accountNumber: savedAccount.accountNumber,
        sortCode: savedAccount.sortCode,
        routingNumber: savedAccount.routingNumber,
        bic: savedAccount.bic,
        bankName: savedAccount.bankName,
        balance: savedAccount.lastBalance,
        createdAt: savedAccount.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Account creation error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    
    // Show the actual OBP error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Real error message:', errorMessage);
    
    res.status(500).json({
      error: 'OBP Account Creation Failed',
      message: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * GET /api/v1/wise/accounts
 * Get all user's Wise accounts
 */
const getAccountsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const accounts = await prisma.wiseAccount.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        wiseAccountId: true, // Added for integration tests
        currency: true,
        country: true,
        accountType: true,
        name: true,
        status: true,
        iban: true,
        accountNumber: true,
        sortCode: true,
        routingNumber: true,
        bic: true,
        bankName: true,
        lastBalance: true,
        balanceUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    res.json({
      message: 'Accounts retrieved successfully',
      accounts,
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve accounts',
    });
  }
};

/**
 * GET /api/v1/wise/balance
 * Get balance for user's primary account (first active account)
 */
const getBalanceHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    // Find user's first active account
    const account = await prisma.wiseAccount.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'asc', // First created account
      },
    });
    
    if (!account) {
      res.status(404).json({
        error: 'No account found',
        message: 'No active Wise account found for this user',
      });
      return;
    }
    
    // Return cached balance (sandbox mode)
    res.json({
      message: 'Balance retrieved successfully',
      balance: {
        amount: account.lastBalance,
        currency: account.currency,
        updatedAt: account.balanceUpdatedAt,
        cached: true,
        accountId: account.id,
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve balance',
    });
  }
};

/**
 * GET /api/v1/wise/accounts/:id/balance
 * Get account balance
 */
const getAccountBalanceHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Find account
    const account = await prisma.wiseAccount.findFirst({
      where: {
        id,
        userId,
        status: 'ACTIVE',
      },
    });
    
    if (!account) {
      res.status(404).json({
        error: 'Account not found',
        message: 'Wise account not found or not accessible',
      });
      return;
    }
    
    // Get balance from REAL OBP-API only
    console.log('💰 Getting REAL OBP balance for account:', account.obpAccountId);
    
    try {
      const balanceResult = await obpApiService.getAccountBalance(account.obpAccountId || account.id, account.currency);
      
      if (balanceResult.success && balanceResult.data) {
        // Use real OBP balance
        const balance = balanceResult.data;
        
        res.json({
          message: 'Real OBP balance retrieved successfully',
          balance: {
            amount: balance.availableAmount.value,
            currency: balance.currency,
            reservedAmount: balance.reservedAmount.value,
            totalAmount: balance.amount.value,
            updatedAt: new Date(),
            cached: false,
          },
        });
        return;
      }
    } catch (error) {
      console.error('❌ Real OBP balance retrieval failed:', error);
    }
    
    // If OBP fails, return the stored balance (but mark it clearly as cached)
    console.log('📦 Using stored balance as fallback');
    res.json({
      message: 'Balance retrieved from database (OBP unavailable)',
      balance: {
        amount: parseFloat(account.lastBalance || '0'),
        currency: account.currency,
        updatedAt: account.balanceUpdatedAt,
        cached: true,
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve balance',
    });
  }
};

/**
 * GET /api/v1/wise/accounts/:id
 * Get detailed account information
 */
const getAccountDetailsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Find account with transactions
    const account = await prisma.wiseAccount.findFirst({
      where: {
        id,
        userId,
        status: 'ACTIVE',
      },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Last 10 transactions
        },
      },
    });
    
    if (!account) {
      res.status(404).json({
        error: 'Account not found',
        message: 'Wise account not found or not accessible',
      });
      return;
    }
    
    res.json({
      message: 'Account details retrieved successfully',
      account: {
        id: account.id,
        currency: account.currency,
        country: account.country,
        type: account.accountType,
        name: account.name,
        status: account.status,
        iban: account.iban,
        accountNumber: account.accountNumber,
        sortCode: account.sortCode,
        routingNumber: account.routingNumber,
        bic: account.bic,
        bankName: account.bankName,
        bankAddress: account.bankAddress,
        balance: account.lastBalance,
        balanceUpdatedAt: account.balanceUpdatedAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        recentTransactions: account.transactions,
      },
    });
  } catch (error) {
    console.error('Get account details error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve account details',
    });
  }
};

/**
 * PUT /api/v1/wise/accounts/:id/balance
 * Update account balance (sandbox only)
 */
const updateAccountBalanceHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateBalanceSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    // Find account
    const account = await prisma.wiseAccount.findFirst({
      where: {
        id,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!account) {
      res.status(404).json({
        error: 'Account not found',
        message: 'Account not found or not accessible',
      });
      return;
    }

    // Update balance
    const updatedAccount = await prisma.wiseAccount.update({
      where: { id },
      data: {
        lastBalance: validatedData.amount,
        balanceUpdatedAt: new Date(),
      },
    });

    res.json({
      message: 'Balance updated successfully',
      balance: {
        amount: updatedAccount.lastBalance,
        currency: updatedAccount.currency,
        updatedAt: updatedAccount.balanceUpdatedAt,
        cached: false,
      },
    });
  } catch (error) {
    console.error('Update balance error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update balance',
    });
  }
};

// Transfer validation schema for IBAN transfers
const simpleTransferSchema = z.object({
  recipientAccount: z.object({
    type: z.string().min(1, 'Account type is required'),
    iban: z.string().min(1, 'IBAN is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    currency: z.string().length(3, 'Currency must be 3 characters'),
    country: z.string().length(2, 'Country must be 2 characters'),
    holderName: z.string().min(1, 'Account holder name is required'),
    bankName: z.string().min(1, 'Bank name is required'),
  }),
  transferDetails: z.object({
    amount: z.number().min(0.01, 'Amount must be greater than 0').max(1000000, 'Amount too large'),
    reference: z.string().max(100, 'Reference too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
  }),
});

/**
 * POST /api/v1/wise/transfers
 * Create a simple transfer with amount from frontend
 */
const createSimpleTransferHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = simpleTransferSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    // Convert to the format expected by transferService
    const transferRequest = {
      quoteId: `temp_quote_${Date.now()}`, // Temporary quote ID
      recipientAccount: {
        type: validatedData.recipientAccount.type as 'iban',
        iban: validatedData.recipientAccount.iban,
        accountNumber: validatedData.recipientAccount.accountNumber,
        currency: validatedData.recipientAccount.currency,
        country: validatedData.recipientAccount.country,
        holderName: validatedData.recipientAccount.holderName,
        bankName: validatedData.recipientAccount.bankName,
      },
      reference: validatedData.transferDetails.reference,
      description: validatedData.transferDetails.description || `Transfer to ${validatedData.recipientAccount.holderName}`,
    };

    // Execute transfer with the user's requested amount
    const transfer = await transferService.executeTransferWithAmount(transferRequest, userId, validatedData.transferDetails.amount);

    res.status(201).json({
      message: 'Transfer created successfully',
      transfer,
    });
  } catch (error) {
    console.error('Simple transfer creation error:', error);

    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    // Log the full error for debugging
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      request: req.body,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to create transfer',
    });
  }
};

/**
 * GET /api/v1/wise/transfers
 * Get user's transfer history
 */
const getTransferHistoryHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    const transfers = await transferService.getUserTransfers(userId, limit, offset);

    res.json({
      message: 'Transfer history retrieved successfully',
      transfers,
      pagination: {
        limit,
        offset,
        total: transfers.length,
      },
    });
  } catch (error) {
    console.error('Get transfer history error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve transfer history',
    });
  }
};

/**
 * GET /api/v1/wise/test-connectivity
 * Test OBP-API connectivity and show available features
 */
const testConnectivityHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const obpResult = await obpApiService.testConnectivity();
    
    res.json({
      message: 'OBP-API connectivity test completed',
      obpApi: obpResult,
    });
  } catch (error) {
    console.error('Connectivity test error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to test OBP-API connectivity',
    });
  }
};

/**
 * GET /api/v1/wise/test-obp-account/:bankId/:accountId
 * Test OBP account details retrieval directly
 */
const testObpAccountHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { bankId, accountId } = req.params;
    
    console.log(`🔍 Testing OBP account details for ${bankId}/${accountId}`);
    
    const detailsResult = await obpApiService.getAccountDetails(bankId, accountId);
    
    res.json({
      message: 'OBP account details test completed',
      bankId,
      accountId,
      result: detailsResult,
    });
  } catch (error) {
    console.error('OBP account test error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to test OBP account details',
    });
  }
};

/**
 * GET /api/v1/wise/list-obp-accounts
 * List all OBP accounts for current user
 */
const listObpAccountsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📋 Listing all OBP accounts for current user');
    
    const result = await obpApiService.makeRequest<{ accounts: Array<{ 
      id: string; 
      bank_id: string; 
      label: string; 
      account_routings?: Array<{ scheme: string; address: string }>;
      balance: { currency: string; amount: string };
    }> }>('/obp/v4.0.0/my/accounts');
    
    if (result.success && result.data) {
      res.json({
        message: 'OBP accounts listed successfully',
        accounts: result.data.accounts,
      });
    } else {
      res.status(500).json({
        error: 'Failed to list OBP accounts',
        message: result.error?.error_description || 'Unknown error',
      });
    }
  } catch (error) {
    console.error('List OBP accounts error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to list OBP accounts',
    });
  }
};

/**
 * POST /api/v1/wise/transfers/:id/simulate-status
 * Simulate transfer status change (sandbox development)
 */
const simulateTransferStatusHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    // Validate status
    const validStatuses = ['processing', 'funds_converted', 'outgoing_payment_sent', 'incoming_payment_sent', 'bounced_back', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: ' + validStatuses.join(', '),
      });
      return;
    }

    // Find the transfer
    const transfer = await prisma.wiseTransaction.findFirst({
      where: {
        id,
        wiseAccount: {
          userId,
        },
      },
      include: {
        wiseAccount: true,
      },
    });

    if (!transfer) {
      res.status(404).json({
        error: 'Transfer not found',
        message: 'Transfer not found or not accessible',
      });
      return;
    }

    // Map Wise status to our internal status
    const statusMapping: Record<string, string> = {
      'processing': 'PROCESSING',
      'funds_converted': 'PROCESSING',
      'outgoing_payment_sent': 'SENT',
      'incoming_payment_sent': 'COMPLETED',
      'bounced_back': 'FAILED',
      'cancelled': 'CANCELLED',
    };

    const internalStatus = statusMapping[status] || 'PROCESSING';

    // Update transfer status in database
    await prisma.wiseTransaction.update({
      where: { id },
      data: {
        status: internalStatus,
        updatedAt: new Date(),
        completedAt: internalStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });

    // Update corresponding incoming transaction if exists
    const incomingTxId = `${id}_incoming`;
    await prisma.wiseTransaction.updateMany({
      where: { id: incomingTxId },
      data: {
        status: internalStatus,
        updatedAt: new Date(),
        completedAt: internalStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });

    // If completed, update recipient balance
    if (internalStatus === 'COMPLETED') {
      const incomingTx = await prisma.wiseTransaction.findFirst({
        where: { id: incomingTxId },
        include: { wiseAccount: true },
      });

      if (incomingTx && Number(incomingTx.amount) > 0) {
        const newBalance = Number(incomingTx.wiseAccount.lastBalance || 0) + Number(incomingTx.amount);
        await prisma.wiseAccount.update({
          where: { id: incomingTx.wiseAccountId },
          data: {
            lastBalance: newBalance,
            balanceUpdatedAt: new Date(),
          },
        });
      }
    }

    // For OBP-API, we handle status updates directly in the database
    console.log('📊 OBP-API transfer status updated directly in database');

    res.json({
      message: 'Transfer status updated successfully',
      transferId: id,
      newStatus: internalStatus,
      wiseStatus: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Simulate transfer status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to simulate transfer status',
    });
  }
};

// Register routes
router.get('/test-connectivity', testConnectivityHandler);
router.get('/test-obp-account/:bankId/:accountId', testObpAccountHandler);
router.get('/list-obp-accounts', listObpAccountsHandler);
// OAuth routes removed - using direct OBP-API integration
router.get('/balance', getBalanceHandler);
router.post('/accounts', createAccountHandler);
router.get('/accounts', getAccountsHandler);
router.get('/accounts/:id/balance', getAccountBalanceHandler);
router.put('/accounts/:id/balance', updateAccountBalanceHandler);
router.get('/accounts/:id', getAccountDetailsHandler);
router.post('/transfers', createSimpleTransferHandler);
router.get('/transfers', getTransferHistoryHandler);
router.post('/transfers/:id/simulate-status', simulateTransferStatusHandler);

export default router;