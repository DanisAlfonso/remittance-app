import { Router, Response, RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { obpApiService } from '../services/obp-api';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All banking routes require authentication
router.use(authenticateToken);

// Validation schemas with proper banking terminology
const createBankAccountSchema = z.object({
  currency: z.string().length(3, 'Currency must be 3 characters'),
  country: z.string().length(2, 'Country must be 2 characters'),
  type: z.enum(['SAVINGS', 'CHECKING']),
  name: z.string().min(1, 'Account name is required').max(100),
});

// Balance update functionality would be added here if needed
// const updateBalanceSchema = z.object({
//   amount: z.number().min(0, 'Amount must be positive'),
// });

/**
 * POST /api/v1/banking/accounts
 * Create a new bank account via Banking Service
 */
const createAccountHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createBankAccountSchema.parse(req.body);
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    console.log('🏦 Creating bank account via OBP-API...');
    const result = await obpApiService.createAccount({
      ...validatedData,
      userId,
    });
    
    if (!result.success) {
      res.status(result.statusCode || 500).json({
        error: result.error?.error || 'Account creation failed',
        message: result.error?.message || 'Failed to create bank account',
      });
      return;
    }
    
    const obpAccount = result.data;
    
    if (!obpAccount) {
      res.status(500).json({
        error: 'Account Creation Failed',
        message: 'No account data returned',
      });
      return;
    }

    // Save the OBP account to our database for banking service visibility
    console.log('💾 Saving OBP account to local database...');
    try {
      const dbAccount = await prisma.bankAccount.create({
        data: {
          userId: userId,
          bankAccountId: obpAccount.id, // Use OBP account ID
          bankProfileId: obpAccount.profile || Math.floor(Math.random() * 100000),
          currency: obpAccount.currency,
          country: obpAccount.country || 'GB',
          accountType: obpAccount.type.toLowerCase(),
          name: obpAccount.name,
          status: obpAccount.status || 'ACTIVE',
          iban: obpAccount.iban || '',
          accountNumber: obpAccount.account_number || '',
          sortCode: obpAccount.sort_code,
          bic: 'ENHBK1XXXX', // Enhanced Bank BIC
          bankName: 'Enhanced Test Bank Limited',
          lastBalance: obpAccount.balance?.amount || 0,
          balanceUpdatedAt: new Date(),
          // Store OBP-specific references
          obpBankId: obpAccount.obp_bank_id,
          obpAccountId: obpAccount.obp_account_id,
        },
      });
      
      console.log(`✅ Saved OBP account to database: ${dbAccount.id}`);
      
      // Return the database account (which matches our frontend expectations)
      res.status(201).json({
        message: 'Bank account created successfully',
        account: dbAccount,
      });
    } catch (dbError) {
      console.error('❌ Failed to save OBP account to database:', dbError);
      
      // Still return success since OBP account was created, but log the DB issue
      res.status(201).json({
        message: 'Bank account created successfully',
        account: {
          id: obpAccount.id,
          currency: obpAccount.currency,
          country: obpAccount.country,
          type: obpAccount.type,
          name: obpAccount.name,
          status: obpAccount.status,
          iban: obpAccount.iban,
          accountNumber: obpAccount.account_number,
          sortCode: obpAccount.sort_code,
          bic: 'ENHBK1XXXX',
          bankName: 'Enhanced Test Bank Limited',
          balance: obpAccount.balance?.amount || 0,
          createdAt: obpAccount.created_at,
          updatedAt: obpAccount.updated_at,
      },
    });
    }
  } catch (error) {
    console.error('❌ Bank account creation error:', error);
    
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
      error: 'Account Creation Failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/v1/banking/accounts
 * Get all user's bank accounts
 */
const getAccountsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    console.log('📋 Getting bank accounts from database...');
    const accounts = await prisma.bankAccount.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    
    // Transform accounts to ensure consistent response format
    const bankAccounts = accounts.map((account) => ({
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
      balance: account.lastBalance,
      balanceUpdatedAt: account.balanceUpdatedAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));
    
    res.json({
      message: 'Bank accounts retrieved successfully',
      accounts: bankAccounts,
    });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve bank accounts',
    });
  }
};

/**
 * GET /api/v1/banking/accounts/:id/balance
 * Get account balance
 */
const getAccountBalanceHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    console.log('💰 Getting account balance from database...');
    const account = await prisma.bankAccount.findFirst({
      where: { id, userId, status: 'ACTIVE' },
    });

    if (!account) {
      res.status(404).json({
        error: 'Account not found',
        message: 'Account not found or not accessible',
      });
      return;
    }
    
    res.json({
      message: 'Balance retrieved successfully',
      balance: {
        amount: parseFloat(account.lastBalance?.toString() || '0'),
        currency: account.currency,
        reservedAmount: 0,
        totalAmount: parseFloat(account.lastBalance?.toString() || '0'),
        updatedAt: account.balanceUpdatedAt || new Date(),
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
 * GET /api/v1/banking/accounts/:id
 * Get detailed bank account information
 */
const getAccountDetailsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Find account with transactions
    const account = await prisma.bankAccount.findFirst({
      where: {
        id,
        userId,
        status: 'ACTIVE',
      },
    });
    
    if (!account) {
      res.status(404).json({
        error: 'Account not found',
        message: 'Bank account not found or not accessible',
      });
      return;
    }
    
    res.json({
      message: 'Bank account details retrieved successfully',
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
        recentTransactions: [], // Transactions feature will be re-added later
      },
    });
  } catch (error) {
    console.error('Get bank account details error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve bank account details',
    });
  }
};

/**
 * GET /api/v1/banking/transfers
 * Get transfer history (placeholder - returns empty array for now)
 */
const getTransfersHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    // For now, return empty transfers - this endpoint needs to be implemented
    // when transfer functionality is restored with banking terminology
    res.json({
      message: 'Transfer history retrieved successfully',
      transfers: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
      },
    });
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve transfer history',
    });
  }
};

/**
 * POST /api/v1/banking/transfers
 * Create a new transfer (placeholder - returns success for now)
 */
const createTransferHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    // For now, return success - this endpoint needs to be implemented
    // when transfer functionality is restored with banking terminology
    res.status(201).json({
      message: 'Transfer created successfully',
      transfer: {
        id: `transfer_${Date.now()}`,
        status: 'PENDING',
        amount: req.body.transferDetails?.amount || 0,
        currency: req.body.transferDetails?.currency || 'EUR',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create transfer',
    });
  }
};

// Register routes with proper banking terminology
router.post('/accounts', createAccountHandler);
router.get('/accounts', getAccountsHandler);
router.get('/accounts/:id/balance', getAccountBalanceHandler);
router.get('/accounts/:id', getAccountDetailsHandler);

// Transfer endpoints (placeholder implementations)
router.get('/transfers', getTransfersHandler);
router.post('/transfers', createTransferHandler);

export default router;