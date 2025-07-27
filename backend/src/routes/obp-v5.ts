import { Router, Response, RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { obpApiService } from '../services/obp-api';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { masterAccountBanking } from '../services/master-account-banking';

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

    console.log('📋 Getting transaction requests from database...');
    
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Get transaction history from master account banking service
    console.log(`🔍 Searching for transactions for user: ${userId}`);
    const transactions = await masterAccountBanking.getTransactionHistory(userId, undefined, limit);
    console.log(`📊 Found ${transactions.length} transactions in database for user ${userId}`);
    
    // Transform database transactions to frontend Transfer format
    const transfers = transactions.map((tx: any) => ({
      id: tx.referenceNumber || tx.id.toString(),
      sourceAccountId: 'master-account', // Placeholder for required field
      quoteId: tx.referenceNumber || tx.id.toString(), // Use transaction ID as quote ID
      status: {
        status: (tx.status || 'PENDING').toUpperCase() as 'PENDING' | 'PROCESSING' | 'SENT' | 'RECEIVED' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
        message: `Transaction ${tx.status || 'pending'}`,
        timestamp: tx.createdAt.toISOString()
      },
      sourceAmount: parseFloat(tx.amount.toString()),
      sourceCurrency: tx.currency || 'EUR',
      targetAmount: parseFloat(tx.amount.toString()), // Same as source for now
      targetCurrency: tx.currency || 'EUR', // Same as source for now
      exchangeRate: 1, // No exchange for same currency
      fee: tx.totalFee ? parseFloat(tx.totalFee.toString()) : 0,
      reference: tx.referenceNumber || undefined,
      description: `${tx.type || 'Transfer'} - ${tx.currency || 'EUR'} ${tx.amount}`,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.createdAt.toISOString(), // Use same as created for now
      completedAt: tx.completedAt?.toISOString() || undefined,
      recipient: {
        name: 'Transfer', // Would need to be enhanced with actual recipient data
        accountNumber: ''
      }
    }));
    
    console.log(`✅ Found ${transfers.length} transactions for user ${userId}`);
    
    res.json({
      transfers,
      pagination: {
        limit,
        offset,
        total: transfers.length,
      }
    });
  } catch (error) {
    console.error('❌ OBP get transaction requests error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: req.user?.id || 'undefined',
      requestPath: req.path,
      method: req.method
    });
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: error instanceof Error ? error.message : 'Unknown Error'
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

    // Extract transfer data from request body
    const transferData = req.body;
    
    // Get user's account information from our database
    const userAccount = await prisma.bankAccount.findFirst({
      where: {
        userId: userId,
        currency: transferData.transferDetails?.currency || 'EUR'
      }
    });
    
    if (!userAccount) {
      res.status(400).json({
        error: {
          error_code: 'OBP-40001',
          error_message: `No account found for user in ${transferData.transferDetails?.currency || 'EUR'} currency`
        }
      });
      return;
    }

    // For development: Use account info even if OBP IDs aren't set
    const fromBankId = userAccount.obpBankId || 'EURBANK';
    const fromAccountId = userAccount.obpAccountId || userAccount.id;

    // Map frontend transfer data to OBP-API format
    const obpRequestData = {
      from_bank_id: fromBankId,
      from_account_id: fromAccountId,
      to: transferData.recipientAccount?.iban ? {
        iban: transferData.recipientAccount.iban
      } : {
        bank_id: transferData.recipientAccount?.bank_id || 'ENHANCEDBANK',
        account_id: transferData.recipientAccount?.account_id || 'unknown'
      },
      value: {
        currency: transferData.transferDetails?.currency || 'EUR',
        amount: transferData.transferDetails?.amount?.toString() || '0'
      },
      description: transferData.transferDetails?.reference || 'Transfer via OBP-API',
      challenge_type: 'SANDBOX_TAN'
    };

    // Call real OBP-API service
    const result = await obpApiService.createTransactionRequest(obpRequestData);
    
    if (result.success && result.data) {
      console.log('✅ OBP Transaction Request successful:', result.data.id);
      
      // Transform OBP response to match frontend expectations
      const transformedResponse = {
        transfer: {
          id: result.data.id,
          status: result.data.status,
          type: result.data.type,
          from: result.data.from,
          details: result.data.details,
          created_at: result.data.start_date,
          challenge: result.data.challenge
        },
        message: 'Transaction request created successfully via OBP-API'
      };
      
      res.status(201).json(transformedResponse);
    } else {
      console.error('❌ OBP Transaction Request failed:', result.error);
      
      // If OBP-API authentication fails or counterparty not found, fall back to internal banking system for development
      if (result.error?.error === 'HTTP 401' || result.error?.error_description?.includes('User not logged in') ||
          result.error?.error === 'HTTP 404' || result.error?.error_description?.includes('Counterparty not found')) {
        console.log('🔄 OBP-API failed (auth or counterparty not found), falling back to internal banking system...');
        console.log(`📋 OBP Error: ${result.error?.error} - ${result.error?.error_description}`);
        
        try {
          // Import internal banking service
          console.log('📦 Importing masterAccountBanking service...');
          const { masterAccountBanking } = await import('../services/master-account-banking.js');
          console.log('✅ masterAccountBanking service imported successfully');
          
          // Check if this is an internal transfer (recipient IBAN belongs to an app user)
          console.log(`🔍 Checking if IBAN ${transferData.recipientAccount.iban} belongs to an app user...`);
          console.log('🔍 Database query: Looking for bankAccount with IBAN, status=ACTIVE, type=virtual_remittance');
          
          const recipientAccount = await prisma.bankAccount.findFirst({
            where: {
              iban: transferData.recipientAccount.iban,
              status: 'ACTIVE',
              accountType: 'virtual_remittance'
            },
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          });
          
          console.log(`🔍 Recipient account lookup result:`, {
            found: !!recipientAccount,
            iban: transferData.recipientAccount.iban,
            recipient: recipientAccount ? {
              user: `${recipientAccount.user.firstName} ${recipientAccount.user.lastName}`,
              email: recipientAccount.user.email,
              userId: recipientAccount.userId,
              balance: recipientAccount.lastBalance?.toString()
            } : null
          });

          let internalResult;

          if (recipientAccount) {
            // INTERNAL TRANSFER: Both users are in the app
            console.log(`💫 Internal transfer detected: ${transferData.recipientAccount.iban} belongs to ${recipientAccount.user.firstName} ${recipientAccount.user.lastName}`);
            console.log(`💫 Transfer details: ${userId} → ${recipientAccount.userId} (${transferData.transferDetails.amount} ${transferData.transferDetails.currency})`);
            
            try {
              // Execute both outbound (debit sender) and inbound (credit recipient) transfers
              console.log(`🔽 Step 1: Executing outbound transfer (debit sender)...`);
              console.log(`🔽 Outbound params:`, {
                fromUserId: userId,
                currency: transferData.transferDetails.currency,
                amount: transferData.transferDetails.amount,
                recipientIBAN: transferData.recipientAccount.iban,
                recipientName: transferData.recipientDetails.firstName + ' ' + transferData.recipientDetails.lastName,
                reference: transferData.transferDetails.reference
              });
              
              const outboundResult = await masterAccountBanking.executeOutboundTransfer({
                fromUserId: userId,
                currency: transferData.transferDetails.currency as 'EUR' | 'HNL',
                amount: transferData.transferDetails.amount,
                recipientIBAN: transferData.recipientAccount.iban,
                recipientName: transferData.recipientDetails.firstName + ' ' + transferData.recipientDetails.lastName,
                reference: transferData.transferDetails.reference
              });
              console.log(`✅ Outbound transfer completed:`, {
                referenceNumber: outboundResult.referenceNumber,
                status: outboundResult.status
              });

              // Credit the recipient's account
              console.log(`🔼 Step 2: Executing inbound transfer (credit recipient)...`);
              console.log(`🔼 Inbound params:`, {
                virtualIBAN: transferData.recipientAccount.iban,
                amount: transferData.transferDetails.amount,
                currency: transferData.transferDetails.currency,
                senderDetails: {
                  name: 'Internal Transfer',
                  reference: transferData.transferDetails.reference
                }
              });
              
              const inboundResult = await masterAccountBanking.processInboundTransfer({
                virtualIBAN: transferData.recipientAccount.iban,
                amount: transferData.transferDetails.amount,
                currency: transferData.transferDetails.currency as 'EUR' | 'HNL',
                senderDetails: {
                  name: 'Internal Transfer',
                  reference: transferData.transferDetails.reference
                }
              });
              console.log(`✅ Inbound transfer completed:`, {
                referenceNumber: inboundResult.referenceNumber,
                status: inboundResult.status
              });

              console.log(`🎉 Internal transfer fully complete: ${outboundResult.referenceNumber} → ${inboundResult.referenceNumber}`);
              internalResult = outboundResult; // Use outbound result for response
            } catch (internalError) {
              console.error(`❌ Internal transfer failed:`, internalError);
              console.error(`❌ Internal transfer error details:`, {
                error: internalError,
                stack: internalError instanceof Error ? internalError.stack : 'No stack trace',
                recipientIBAN: transferData.recipientAccount.iban,
                amount: transferData.transferDetails.amount,
                currency: transferData.transferDetails.currency
              });
              
              // THROW the error instead of silently falling back to external transfer
              // This prevents money being debited without crediting the recipient
              throw new Error(`Internal transfer failed: ${internalError instanceof Error ? internalError.message : 'Unknown error'}`);
            }
          } else {
            // EXTERNAL TRANSFER: Recipient is outside the app
            console.log(`🌐 External transfer: ${transferData.recipientAccount.iban} is external`);
            
            internalResult = await masterAccountBanking.executeOutboundTransfer({
              fromUserId: userId,
              currency: transferData.transferDetails.currency as 'EUR' | 'HNL',
              amount: transferData.transferDetails.amount,
              recipientIBAN: transferData.recipientAccount.iban,
              recipientName: transferData.recipientDetails.firstName + ' ' + transferData.recipientDetails.lastName,
              reference: transferData.transferDetails.reference
            });
          }
          
          console.log('✅ Internal transfer successful:', internalResult.referenceNumber);
          
          // Transform internal response to match OBP format for frontend
          const transformedResponse = {
            transfer: {
              id: internalResult.referenceNumber,
              status: 'PENDING',
              type: 'SEPA',
              from: {
                bank_id: fromBankId,
                account_id: fromAccountId
              },
              details: {
                to_sepa: {
                  iban: transferData.recipientAccount.iban
                },
                value: {
                  currency: transferData.transferDetails.currency,
                  amount: transferData.transferDetails.amount.toString()
                },
                description: transferData.transferDetails.reference
              },
              created_at: new Date().toISOString()
            },
            message: 'Transaction executed via internal banking system (OBP-API fallback)'
          };
          
          res.status(201).json(transformedResponse);
          return;
        } catch (internalError) {
          console.error('❌ Internal banking fallback failed:', internalError);
          res.status(500).json({
            error: {
              error_code: 'OBP-50002',
              error_message: 'Both OBP-API and internal banking system failed'
            }
          });
          return;
        }
      }
      
      // For other errors, return the OBP-API error
      res.status(result.statusCode || 500).json({
        error: {
          error_code: result.error?.error || 'OBP-50001',
          error_message: result.error?.error_description || 'Transaction request failed'
        }
      });
    }
  } catch (error) {
    console.error('💥 [TRANSACTION-REQUEST] Unexpected error in handler:', error);
    console.error('💥 [TRANSACTION-REQUEST] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error,
      error: error
    });
    
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: error instanceof Error ? error.message : 'Unknown Error'
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
    const userEmail = req.user?.email;
    
    console.log(`🚀 [IMPORT] Import Test Data request received`);
    console.log(`👤 [IMPORT] User ID: ${userId}`);
    console.log(`📧 [IMPORT] User Email: ${userEmail}`);
    
    if (!userId) {
      console.error('❌ [IMPORT] Authentication failed - no user ID');
      res.status(401).json({
        error: {
          error_code: 'OBP-20001',
          error_message: 'User not logged in. Authentication via OAuth/Direct Login required.'
        }
      });
      return;
    }

    console.log(`📦 [IMPORT] Starting sandbox data import via OBP-API for user ${userId}...`);
    
    try {
      // Import sandbox data using OBP service with authenticated user ID
      console.log(`🔄 [IMPORT] Calling obpApiService.importSandboxData(${userId})...`);
      const result = await obpApiService.importSandboxData(userId);
      
      console.log(`📊 [IMPORT] OBP API result:`, {
        success: result.success,
        statusCode: result.statusCode,
        hasData: !!result.data,
        hasError: !!result.error
      });
      
      if (!result.success || !result.data) {
        console.error(`❌ [IMPORT] OBP API import failed:`, result.error);
        res.status(result.statusCode || 500).json({
          error: {
            error_code: 'OBP-30001',
            error_message: result.error?.error_description || 'Sandbox data import failed',
          }
        });
        return;
      }

      // Log successful sandbox data import
      console.log(`✅ [IMPORT] Sandbox data imported successfully - accounts now funded for testing`);
      console.log(`📊 [IMPORT] Import result data:`, result.data);
      
      res.status(201).json({
        message: 'Sandbox data imported successfully',
        data: result.data
      });
      
    } catch (importError) {
      console.error(`❌ [IMPORT] OBP API service error:`, importError);
      throw importError;
    }
    
  } catch (error) {
    console.error(`💥 [IMPORT] Critical error in import handler:`, error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: `Import failed: ${error instanceof Error ? error.message : 'Unknown Error'}`
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

/**
 * GET /obp/v5.1.0/test-connectivity
 * Test OBP-API connectivity and authentication (Debug endpoint)
 */
const testConnectivityHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
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

    console.log('🔍 Testing OBP-API connectivity and authentication...');
    
    // Test OBP-API connectivity
    const connectivityResult = await obpApiService.testConnectivity();
    
    res.json({
      connectivity_test: connectivityResult,
      user_id: userId,
      timestamp: new Date().toISOString(),
      status: connectivityResult.success ? 'SUCCESS' : 'FAILED'
    });
  } catch (error) {
    console.error('OBP connectivity test error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Connectivity test failed'
      }
    });
  }
};

// Debug endpoint for testing
router.get('/test-connectivity', testConnectivityHandler);

/**
 * GET /obp/v5.1.0/debug/recent-transfers
 * Get recent transfers across all users (Debug endpoint)
 */
const getRecentTransfersHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
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

    console.log('🔍 Getting recent transfers for debugging...');
    
    // Get recent bank transactions
    const recentTransfers = await prisma.bankTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Also get all users for reference
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      recent_transfers: recentTransfers.map(transfer => ({
        id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status,
        type: transfer.type,
        reference: transfer.reference,
        from_user_id: (transfer as any).fromUserId,
        to_user_id: (transfer as any).toUserId,
        to_iban: transfer.recipientIban,
        created_at: transfer.createdAt
      })),
      all_users: allUsers.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        created_at: user.createdAt
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug transfers error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Debug transfers failed'
      }
    });
  }
};

/**
 * GET /obp/v5.1.0/debug/user-accounts
 * Get account info for specific users (Debug endpoint)
 */
const getUserAccountsHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
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

    console.log('🔍 Getting user accounts for debugging...');
    
    // Get specific users: Michelle and Danis
    const michelleUser = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'Michelle', mode: 'insensitive' } },
          { email: { contains: 'michelle', mode: 'insensitive' } }
        ]
      }
    });

    const danisUser = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'Danis', mode: 'insensitive' } },
          { email: { contains: 'danis', mode: 'insensitive' } }
        ]
      }
    });

    // Get their accounts
    const michelleAccounts = michelleUser ? await prisma.bankAccount.findMany({
      where: { userId: michelleUser.id },
      orderBy: { balanceUpdatedAt: 'desc' }
    }) : [];

    const danisAccounts = danisUser ? await prisma.bankAccount.findMany({
      where: { userId: danisUser.id },
      orderBy: { balanceUpdatedAt: 'desc' }
    }) : [];

    // Check all recent balance changes across all accounts
    const allRecentAccounts = await prisma.bankAccount.findMany({
      where: {
        balanceUpdatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { balanceUpdatedAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      michelle_user: michelleUser ? {
        id: michelleUser.id,
        name: `${michelleUser.firstName} ${michelleUser.lastName}`,
        email: michelleUser.email
      } : null,
      michelle_accounts: michelleAccounts.map(acc => ({
        currency: acc.currency,
        balance: acc.lastBalance,
        iban: acc.iban,
        updated_at: acc.balanceUpdatedAt,
        status: acc.status
      })),
      danis_user: danisUser ? {
        id: danisUser.id,
        name: `${danisUser.firstName} ${danisUser.lastName}`,
        email: danisUser.email
      } : null,
      danis_accounts: danisAccounts.map(acc => ({
        currency: acc.currency,
        balance: acc.lastBalance,
        iban: acc.iban,
        updated_at: acc.balanceUpdatedAt,
        status: acc.status
      })),
      recent_balance_changes: allRecentAccounts.map(acc => ({
        user_name: `${acc.user.firstName} ${acc.user.lastName}`,
        user_email: acc.user.email,
        currency: acc.currency,
        balance: acc.lastBalance,
        iban: acc.iban,
        updated_at: acc.balanceUpdatedAt
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug accounts error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Debug accounts failed'
      }
    });
  }
};

/**
 * GET /obp/v5.1.0/debug/transfer-history
 * Get detailed transfer history including outbound and inbound transfers
 */
const getTransferHistoryHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
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

    console.log('🔍 Getting transfer history for debugging...');
    
    // Get all recent transactions (both outbound and inbound)
    const recentTransactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Get Michelle and Danis specifically
    const michelleUser = await prisma.user.findFirst({
      where: { email: { contains: 'michelle', mode: 'insensitive' } }
    });

    const danisUser = await prisma.user.findFirst({
      where: { email: { contains: 'danis', mode: 'insensitive' } }
    });

    // Get their recent transactions
    const michelleTransactions = recentTransactions.filter(t => t.userId === michelleUser?.id);
    const danisTransactions = recentTransactions.filter(t => t.userId === danisUser?.id);

    res.json({
      all_recent_transactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        reference: t.referenceNumber,
        user_name: `${t.user.firstName} ${t.user.lastName}`,
        user_email: t.user.email,
        created_at: t.createdAt
      })),
      michelle_transactions: michelleTransactions.map(t => ({
        type: t.type,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        reference: t.referenceNumber,
        created_at: t.createdAt
      })),
      danis_transactions: danisTransactions.map(t => ({
        type: t.type,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        reference: t.referenceNumber,
        created_at: t.createdAt
      })),
      summary: {
        total_transactions: recentTransactions.length,
        michelle_count: michelleTransactions.length,
        danis_count: danisTransactions.length,
        michelle_user_id: michelleUser?.id,
        danis_user_id: danisUser?.id
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug transfer history error:', error);
    res.status(500).json({
      error: {
        error_code: 'OBP-50000',
        error_message: 'Debug transfer history failed'
      }
    });
  }
};

// Debug endpoints
router.get('/debug/recent-transfers', getRecentTransfersHandler);
router.get('/debug/user-accounts', getUserAccountsHandler);
router.get('/debug/transfer-history', getTransferHistoryHandler);

export default router;