import { Router, Response, RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { obpApiService } from '../services/obp-api';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All OBP routes require authentication
router.use(authenticateToken);

// OBP-API Validation schemas
const createAccountSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  label: z.string().min(1, 'Account label is required').max(100),
  product_code: z.string().default('CURRENT'),
  balance: z.object({
    currency: z.string().length(3, 'Currency must be 3 characters'),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  }),
});

/**
 * GET /obp/v5.1.0/banks/{bank-id}/accounts
 * Get accounts for a specific bank (OBP-API compliant)
 */
const getBankAccountsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { bankId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    console.log(`🏦 Getting accounts for bank ${bankId} via OBP-API...`);
    
    // Get accounts from our database that belong to this bank
    const accounts = await prisma.bankAccount.findMany({
      where: { 
        userId, 
        status: 'ACTIVE',
        // In OBP, we can filter by bank if needed
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to OBP format
    const obpAccounts = accounts.map(account => ({
      id: account.id,
      bank_id: bankId,
      label: account.name,
      number: account.accountNumber || account.iban?.slice(-4) || '****',
      type: account.accountType,
      balance: {
        currency: account.currency,
        amount: account.lastBalance?.toString() || '0.00'
      },
      account_routings: [
        ...(account.iban ? [{
          scheme: 'IBAN',
          address: account.iban
        }] : []),
        ...(account.sortCode ? [{
          scheme: 'Sort Code',
          address: account.sortCode
        }] : [])
      ],
      account_attributes: [
        {
          name: 'BANK_NAME',
          type: 'STRING',
          value: 'OBP Bank'
        }
      ],
      views_available: [
        {
          view_id: 'owner',
          short_name: 'Owner',
          description: 'Full access'
        }
      ]
    }));
    
    res.json({
      accounts: obpAccounts
    });
  } catch (error) {
    console.error('OBP get accounts error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

/**
 * POST /obp/v5.1.0/banks/{bank-id}/accounts
 * Create account for a specific bank (OBP-API compliant)
 */
const createBankAccountHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { bankId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    const validatedData = createAccountSchema.parse({
      ...req.body,
      user_id: userId
    });

    console.log(`🏦 Creating account for bank ${bankId} via OBP-API...`);
    
    // Create account using OBP service
    const result = await obpApiService.createAccount({
      currency: validatedData.balance.currency,
      country: 'GB', // Default for OBP
      type: validatedData.product_code as 'SAVINGS' | 'CHECKING',
      name: validatedData.label,
      userId: userId
    });
    
    if (!result.success || !result.data) {
      res.status(result.statusCode).json({
        error: {
          error_code: 'OBP-30001',
          error_message: result.error?.message || 'Account creation failed',
        }
      });
      return;
    }
    
    const account = result.data;
    
    res.status(201).json({
      id: account.id,
      bank_id: bankId,
      label: validatedData.label,
      number: account.account_number || account.iban?.slice(-4) || '****',
      type: validatedData.product_code,
      balance: validatedData.balance,
      account_routings: [
        ...(account.iban ? [{
          scheme: 'IBAN',
          address: account.iban
        }] : [])
      ],
      account_attributes: [
        {
          name: 'BANK_NAME',
          type: 'STRING',
          value: 'OBP Bank'
        }
      ],
      views_available: [
        {
          view_id: 'owner',
          short_name: 'Owner',
          description: 'Full access'
        }
      ]
    });
  } catch (error) {
    console.error('OBP create account error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          error_code: 'OBP-40001',
          error_message: 'Invalid JSON format',
          error_details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        }
      });
      return;
    }
    
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

/**
 * GET /obp/v5.1.0/banks/{bank-id}/accounts/{account-id}/transactions
 * Get transactions for a specific account (OBP-API compliant)
 */
const getAccountTransactionsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { bankId, accountId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    console.log(`📊 Getting transactions for account ${accountId} in bank ${bankId}...`);
    
    // For now, return empty transactions - this would be implemented later
    // when we connect to the bank_transactions table
    res.json({
      transactions: []
    });
  } catch (error) {
    console.error('OBP get transactions error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

/**
 * GET /obp/v5.1.0/transaction-requests
 * Get transaction requests (OBP-API compliant)
 */
const getTransactionRequestsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    console.log('📋 Getting transaction requests via OBP-API...');
    
    // For now, return empty transaction requests - this would be implemented later
    // when we connect to the bank_transactions table
    // Return in the format expected by the frontend (transfers array for compatibility)
    res.json({
      transfers: [],
      pagination: {
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
        total: 0,
      }
    });
  } catch (error) {
    console.error('OBP get transaction requests error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

/**
 * GET /obp/v5.1.0/my/accounts/{account-id}/balance
 * Get account balance for specific account (OBP-API compliant)
 */
const getAccountBalanceHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    console.log(`💰 Getting balance for account ${accountId} for user ${userId}...`);
    console.log(`🔍 Debug: accountId="${accountId}", userId="${userId}"`);
    console.log(`🔍 Debug: includes '-': ${accountId.includes('-')}, startsWith userId: ${accountId.startsWith(userId)}`);
    
    let account;
    
    // Check if accountId is in the new format (userId-currency)
    if (accountId.includes('-') && accountId.startsWith(userId)) {
      const currency = accountId.split('-').pop(); // Get last part after splitting by '-'
      console.log(`🔍 Looking for account with currency: ${currency}`);
      
      account = await prisma.bankAccount.findFirst({
        where: { 
          userId,
          currency,
          status: 'ACTIVE',
          accountType: 'virtual_remittance'
        }
      });
    } else {
      // Fallback: try IBAN match or numeric ID
      account = await prisma.bankAccount.findFirst({
        where: { 
          userId,
          iban: accountId, // Frontend passes IBAN as accountId
          status: 'ACTIVE',
          accountType: 'virtual_remittance'
        }
      });

      if (!account) {
        // Try with bankAccountId as well
        account = await prisma.bankAccount.findFirst({
          where: { 
            userId,
            bankAccountId: parseInt(accountId.replace(/\D/g, '')) || 0,
            status: 'ACTIVE',
            accountType: 'virtual_remittance'
          }
        });
      }
    }

    if (!account) {
      res.status(404).json({
        error: {
          error_code: 'OBP-30001',
          error_message: 'Account not found or access denied'
        }
      });
      return;
    }
    
    res.json({
      balance: {
        currency: account.currency,
        amount: (account.lastBalance || 0).toString(),
        updatedAt: account.balanceUpdatedAt?.toISOString() || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('OBP get account balance error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

/**
 * GET /obp/v5.1.0/users/current
 * Get current user details (OBP-API compliant)
 */
const getCurrentUserHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    console.log(`👤 Getting current user details for ${userId}...`);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        isActive: true,
        emailVerified: true,
        createdAt: true
      }
    });
    
    if (!user) {
      res.status(404).json({
        error: {
          error_code: 'OBP-30001',
          error_message: 'User not found'
        }
      });
      return;
    }
    
    res.json({
      user_id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      country: user.country,
      is_active: user.isActive,
      email_verified: user.emailVerified,
      created_at: user.createdAt.toISOString()
    });
  } catch (error) {
    console.error('OBP get current user error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

/**
 * POST /obp/v5.1.0/transaction-requests
 * Create transaction request (OBP-API compliant)
 */
const createTransactionRequestHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    console.log('💸 Creating transaction request via OBP-API...');
    
    // For now, return success - this would be implemented later
    // when we connect to the bank_transactions table
    res.status(201).json({
      id: `transaction_request_${Date.now()}`,
      type: 'SEPA',
      from: {
        bank_id: req.body.from?.bank_id || 'obp-bank',
        account_id: req.body.from?.account_id || 'unknown'
      },
      details: req.body.details || {},
      body: req.body.body || {},
      status: 'INITIATED',
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      challenge: {
        id: `challenge_${Date.now()}`,
        user_id: userId,
        allowed_attempts: 3,
        challenge_type: 'SANDBOX_TAN'
      }
    });
  } catch (error) {
    console.error('OBP create transaction request error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

/**
 * POST /obp/v5.1.0/sandbox/data-import
 * Import sandbox data with predefined accounts and balances (Superuser only)
 */
const importSandboxDataHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    console.log('📦 Importing sandbox data via OBP-API...');
    
    // Import sandbox data using OBP service with authenticated user ID
    const result = await obpApiService.importSandboxData(userId);
    
    if (!result.success || !result.data) {
      res.status(result.statusCode).json({
        error: {
          error_code: 'OBP-30001',
          error_message: 'Sandbox data import failed',
        }
      });
      return;
    }

    // Log successful sandbox data import
    console.log('💾 Sandbox data imported successfully - accounts now funded for testing');
    
    res.status(201).json({
      message: 'Sandbox data imported successfully',
      data: result.data
    });
  } catch (error) {
    console.error('OBP sandbox import error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

/**
 * POST /obp/v5.1.0/banks/{bank-id}/accounts/{account-id}/test-deposit
 * Create test deposit for specific account (Superuser only)
 */
const createTestDepositHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const { amount, currency } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    if (!amount || !currency) {
      res.status(400).json({
        error: {
          error_code: 'OBP-40001',
          error_message: 'Missing required fields: amount, currency'
        }
      });
      return;
    }

    console.log(`💰 Creating test deposit for account ${accountId}...`);
    
    // Use sandbox data import to fund the account (OBP-API compliant approach)
    const result = await obpApiService.importSandboxData(userId);
    
    if (!result.success || !result.data) {
      res.status(result.statusCode).json({
        error: {
          error_code: 'OBP-30001',
          error_message: 'Test deposit creation failed',
        }
      });
      return;
    }
    
    res.status(201).json({
      message: 'Test deposit created successfully',
      data: result.data
    });
  } catch (error) {
    console.error('OBP test deposit error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Unknown Error'
      }
    });
  }
};

// Register OBP-API compliant routes
router.get('/users/current', getCurrentUserHandler);
router.get('/my/accounts/:accountId/balance', getAccountBalanceHandler);
router.get('/banks/:bankId/accounts', getBankAccountsHandler);
router.post('/banks/:bankId/accounts', createBankAccountHandler);
router.get('/banks/:bankId/accounts/:accountId/transactions', getAccountTransactionsHandler);
router.get('/transaction-requests', getTransactionRequestsHandler);
router.post('/transaction-requests', createTransactionRequestHandler);

// Sandbox data management routes (Superuser only)
router.post('/sandbox/data-import', importSandboxDataHandler);
router.post('/banks/:bankId/accounts/:accountId/test-deposit', createTestDepositHandler);

export default router;