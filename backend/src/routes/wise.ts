import { Router, Response, RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { wiseService } from '../services/wise';
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

const authCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

const updateBalanceSchema = z.object({
  amount: z.number().min(0, 'Amount must be positive'),
});

/**
 * GET /api/v1/wise/auth/url
 * Generate OAuth authorization URL for Wise account linking
 */
const getAuthUrlHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const state = `${userId}-${Date.now()}`;
    
    const authUrl = wiseService.generateAuthorizationUrl(state);
    
    res.json({
      message: 'Authorization URL generated successfully',
      authUrl,
      state,
    });
  } catch (error) {
    console.error('Auth URL generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate authorization URL',
    });
  }
};

/**
 * POST /api/v1/wise/auth/callback
 * Handle OAuth callback and exchange code for tokens
 */
const authCallbackHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = authCallbackSchema.parse(req.body);
    
    // Exchange code for token
    const tokenResult = await wiseService.exchangeCodeForToken(validatedData.code);
    
    if (!tokenResult.success) {
      res.status(400).json({
        error: 'OAuth exchange failed',
        message: tokenResult.error?.error_description || 'Failed to exchange authorization code',
      });
      return;
    }
    
    // Get user profiles (we'll use the first one for simplicity)
    const profilesResult = await wiseService.getProfiles();
    
    if (!profilesResult.success || !profilesResult.data || profilesResult.data.length === 0) {
      res.status(400).json({
        error: 'Profile retrieval failed',
        message: 'No profiles found for this account',
      });
      return;
    }
    
    const profile = profilesResult.data[0];
    
    res.json({
      message: 'OAuth authentication successful',
      profile: profile,
      tokenData: {
        expiresIn: tokenResult.data?.expires_in,
        scope: tokenResult.data?.scope,
      },
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    
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
      message: 'Failed to process OAuth callback',
    });
  }
};

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

    // Create account through Wise API with real profile creation
    const createResult = await wiseService.createAccount({
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
    
    // Get account details including IBAN
    const detailsResult = await wiseService.getAccountDetails(wiseAccount.profile, wiseAccount.id);
    
    // Store account in database
    const savedAccount = await prisma.wiseAccount.create({
      data: {
        userId,
        wiseAccountId: wiseAccount.id,
        wiseProfileId: wiseAccount.profile,
        currency: validatedData.currency,
        country: validatedData.country,
        accountType: validatedData.type,
        name: validatedData.name,
        status: wiseAccount.status,
        iban: wiseAccount.iban || detailsResult.data?.iban,
        accountNumber: wiseAccount.account_number || detailsResult.data?.account_number,
        sortCode: wiseAccount.sort_code || detailsResult.data?.sort_code,
        routingNumber: detailsResult.data?.routing_number,
        bic: detailsResult.data?.bic,
        bankName: detailsResult.data?.bank_name,
        bankAddress: detailsResult.data?.bank_address,
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
    console.error('Account creation error:', error);
    
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
      message: 'Failed to create Wise account',
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
    
    // In sandbox mode, prioritize our cached balance over API balance
    // because transfers are simulated locally and not reflected in Wise sandbox
    
    // Try to get fresh balance from Wise API, but don't overwrite our local balance
    const balanceResult = await wiseService.getAccountBalance(account.wiseProfileId, account.currency);
    
    if (!balanceResult.success || process.env.NODE_ENV === 'development') {
      // Return cached balance for sandbox/development mode
      res.json({
        message: 'Balance retrieved from cache',
        balance: {
          amount: account.lastBalance,
          currency: account.currency,
          updatedAt: account.balanceUpdatedAt,
          cached: true,
        },
      });
      return;
    }
    
    // Only in production: sync with real Wise API
    const balances = Array.isArray(balanceResult.data) ? balanceResult.data : [balanceResult.data];
    const balance = balances.find(b => b.currency === account.currency);
    
    if (!balance) {
      res.status(404).json({
        error: 'Balance not found',
        message: 'Balance for this currency not found',
      });
      return;
    }
    
    res.json({
      message: 'Balance retrieved successfully',
      balance: {
        amount: balance.availableAmount.value,
        currency: balance.currency,
        reservedAmount: balance.reservedAmount.value,
        totalAmount: balance.amount.value,
        updatedAt: new Date(),
        cached: false,
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
 * Test real API connectivity and show available features
 */
const testConnectivityHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const result = await wiseService.testRealApiConnectivity();
    
    res.json({
      message: 'API connectivity test completed',
      ...result,
    });
  } catch (error) {
    console.error('Connectivity test error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to test API connectivity',
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

    // Try to simulate with real Wise API if available
    try {
      const transferIdNumber = parseInt(id.replace(/\D/g, '').slice(-8));
      if (transferIdNumber) {
        await wiseService.simulateTransferStatus(transferIdNumber, status);
      }
    } catch (apiError) {
      console.warn('Real API simulation failed:', apiError);
    }

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
router.get('/auth/url', getAuthUrlHandler);
router.post('/auth/callback', authCallbackHandler);
router.post('/accounts', createAccountHandler);
router.get('/accounts', getAccountsHandler);
router.get('/accounts/:id/balance', getAccountBalanceHandler);
router.put('/accounts/:id/balance', updateAccountBalanceHandler);
router.get('/accounts/:id', getAccountDetailsHandler);
router.post('/transfers', createSimpleTransferHandler);
router.get('/transfers', getTransferHistoryHandler);
router.post('/transfers/:id/simulate-status', simulateTransferStatusHandler);

export default router;