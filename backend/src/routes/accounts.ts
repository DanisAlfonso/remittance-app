import { Router, Response, RequestHandler } from 'express';
import { masterAccountBanking } from '../services/master-account-banking';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Get user's virtual accounts
 */
const getUserAccountsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    
    const virtualAccounts = await masterAccountBanking.getUserAccountBalances(userId);
    
    
    res.json({
      message: 'Accounts retrieved successfully',
      accounts: virtualAccounts.map(account => ({
        id: account.userId + '-' + account.currency, // Unique ID for frontend
        currency: account.currency,
        iban: account.virtualIBAN,
        balance: account.balance,
        status: account.status,
        masterAccountReference: account.masterAccountReference,
        name: `${account.currency} Digital Account`, // Add name field for display
        type: 'virtual_remittance',
        // Complete banking details for Banking Details section
        bankName: account.bankName,
        bankAddress: account.bankAddress,
        bic: account.bic,
        accountNumber: account.accountNumber,
        country: account.country,
      })),
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while retrieving accounts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Create additional virtual account for user
 */
const createVirtualAccountSchema = z.object({
  currency: z.enum(['EUR', 'HNL']),
  accountLabel: z.string().min(1, 'Account label is required').max(100),
});

const createVirtualAccountHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const validatedData = createVirtualAccountSchema.parse(req.body);
    
    
    const virtualAccount = await masterAccountBanking.createVirtualAccount(
      userId,
      validatedData.currency,
      validatedData.accountLabel
    );
    
    
    res.status(201).json({
      message: 'Virtual account created successfully',
      account: {
        currency: virtualAccount.currency,
        iban: virtualAccount.virtualIBAN,
        balance: virtualAccount.balance,
        status: virtualAccount.status,
        masterAccountReference: virtualAccount.masterAccountReference,
      },
    });
  } catch (error) {
    console.error('Create virtual account error:', error);
    
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
      message: 'An error occurred while creating virtual account',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get transaction history for user's accounts
 */
const getTransactionHistorySchema = z.object({
  currency: z.enum(['EUR', 'HNL']).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
});

const getTransactionHistoryHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const validatedQuery = getTransactionHistorySchema.parse(req.query);
    
    
    const transactions = await masterAccountBanking.getTransactionHistory(
      userId,
      validatedQuery.currency,
      validatedQuery.limit
    );
    
    
    res.json({
      message: 'Transaction history retrieved successfully',
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        referenceNumber: tx.referenceNumber,
        platformFee: tx.platformFee,
        providerFee: tx.providerFee,
        totalFee: tx.totalFee,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      })),
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    
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
      message: 'An error occurred while retrieving transaction history',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Register routes
router.get('/', getUserAccountsHandler);
router.post('/', createVirtualAccountHandler);
router.get('/transactions', getTransactionHistoryHandler);

export default router;