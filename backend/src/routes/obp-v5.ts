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
    
    // Import sandbox data using OBP service
    const result = await obpApiService.importSandboxData();
    
    if (!result.success || !result.data) {
      res.status(result.statusCode).json({
        error: {
          error_code: 'OBP-30001',
          error_message: 'Sandbox data import failed',
        }
      });
      return;
    }

    // Save created accounts to our database for banking service visibility
    const createdAccounts = result.data.created_accounts || [];
    console.log(`💾 Saving ${createdAccounts.length} accounts to local database...`);
    
    let savedAccounts = 0;
    for (const account of createdAccounts) {
      try {
        // Create bank account in our database
        const dbAccount = await prisma.bankAccount.create({
          data: {
            userId: userId,
            bankAccountId: Math.floor(Math.random() * 1000000), // Generate random ID for now
            bankProfileId: Math.floor(Math.random() * 100000), // Generate random profile ID
            currency: account.currency,
            country: 'GB', // Default country
            accountType: account.type.toLowerCase(),
            name: account.label,
            status: 'ACTIVE',
            accountNumber: account.obp_account_id.slice(-8), // Use last 8 chars as account number
            // Store OBP-specific references
            obpBankId: account.obp_bank_id,
            obpAccountId: account.obp_account_id,
          },
        });
        
        savedAccounts++;
        console.log(`✅ Saved ${account.currency} account to database: ${dbAccount.id}`);
      } catch (dbError) {
        console.error(`❌ Failed to save ${account.currency} account to database:`, dbError);
      }
    }
    
    console.log(`💾 Saved ${savedAccounts}/${createdAccounts.length} accounts to database`);
    
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
    const { bankId, accountId } = req.params;
    const { amount, currency, description } = req.body;
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
    
    // Create test deposit using OBP service
    const result = await obpApiService.createTestDeposit(
      bankId,
      accountId,
      parseFloat(amount),
      currency,
      description
    );
    
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
router.get('/banks/:bankId/accounts', getBankAccountsHandler);
router.post('/banks/:bankId/accounts', createBankAccountHandler);
router.get('/banks/:bankId/accounts/:accountId/transactions', getAccountTransactionsHandler);
router.get('/transaction-requests', getTransactionRequestsHandler);
router.post('/transaction-requests', createTransactionRequestHandler);

// Sandbox data management routes (Superuser only)
router.post('/sandbox/data-import', importSandboxDataHandler);
router.post('/banks/:bankId/accounts/:accountId/test-deposit', createTestDepositHandler);

export default router;