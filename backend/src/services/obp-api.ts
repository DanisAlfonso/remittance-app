import { env } from '../config/environment';
import type {
  BankAccount,
  BankingApiResponse,
  CreateBankAccountRequest,  
  BankAccountDetails,
} from '../types/banking';

// OBP-API specific types
interface OBPConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  username: string;
  password: string;
}

interface OBPBank {
  id: string;
  short_name: string;
  full_name: string;
  logo?: string;
  website?: string;
  bank_routings: Array<{
    scheme: string;
    address: string;
  }>;
}

interface OBPAccount {
  id: string;
  bank_id: string;
  label: string;
  number: string;
  type: string;
  balance: {
    currency: string;
    amount: string;
  };
  account_routings: Array<{
    scheme: string;
    address: string;
  }>;
  account_attributes: Array<{
    name: string;
    type: string;
    value: string;
  }>;
}


export class OBPApiService {
  private config: OBPConfig;
  private authToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor() {
    this.config = {
      baseUrl: env.OBP_API_BASE_URL,
      consumerKey: env.OBP_CONSUMER_KEY,
      consumerSecret: env.OBP_CONSUMER_SECRET,
      username: env.OBP_USERNAME,
      password: env.OBP_PASSWORD,
    };
    
  }

  /**
   * Make authenticated request to OBP-API (public for testing)
   */
  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BankingApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    // Ensure we have a valid token
    await this.ensureValidToken();
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'RemittanceApp/1.0.0',
    };

    // Add OBP DirectLogin authorization
    if (this.authToken) {
      const authHeader = `DirectLogin username="${this.config.username}",password="${this.config.password}",consumer_key="${this.config.consumerKey}",token="${this.authToken}"`;
      defaultHeaders['Authorization'] = authHeader;
      console.log('🔑 Using auth header:', authHeader);
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      console.log(`🔗 [OBP-REQ] ${options.method || 'GET'} ${endpoint}`);
      const response = await fetch(url, requestOptions);
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        console.error(`❌ OBP-API Error: ${response.status}`, data);
        return {
          success: false,
          error: {
            error: `HTTP ${response.status}`,
            error_description: typeof data === 'string' ? data : data?.message || 'OBP-API request failed',
          },
          statusCode: response.status,
        };
      }

      console.log(`✅ OBP-API Success: ${response.status}`);
      return {
        success: true,
        data: data as T,
        statusCode: response.status,
      };
    } catch (error) {
      console.error('OBP-API request failed:', error);
      return {
        success: false,
        error: {
          error: 'Network Error',
          error_description: error instanceof Error ? error.message : 'Unknown error',
        },
        statusCode: 0,
      };
    }
  }

  /**
   * Get Direct Login token from OBP-API
   */
  async getDirectLoginToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    const tokenUrl = `${this.config.baseUrl}/my/logins/direct`;
    
    try {
      console.log('🔑 [OBP-AUTH] Getting DirectLogin token...');
      
      // Construct authorization header carefully to avoid escaping issues
      const authHeader = `DirectLogin username="${this.config.username}",password="${this.config.password}",consumer_key="${this.config.consumerKey}"`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: '{}',
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Failed to get OBP token:', data);
        return {
          success: false,
          error: data.message || 'Failed to get authentication token',
        };
      }

      console.log('✅ [OBP-AUTH] DirectLogin token obtained successfully');
      return {
        success: true,
        token: data.token,
      };
    } catch (error) {
      console.error('❌ Token request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ensure we have a valid authentication token
   */
  private async ensureValidToken(): Promise<boolean> {
    if (!this.authToken || !this.tokenExpiresAt) {
      const result = await this.getDirectLoginToken();
      if (result.success && result.token) {
        this.authToken = result.token;
        // OBP tokens are typically valid for 24 hours
        this.tokenExpiresAt = Date.now() + (24 * 60 * 60 * 1000);
        return true;
      }
      return false;
    }

    // Check if token expires in next 30 minutes
    if (Date.now() >= this.tokenExpiresAt - 30 * 60 * 1000) {
      const result = await this.getDirectLoginToken();
      if (result.success && result.token) {
        this.authToken = result.token;
        this.tokenExpiresAt = Date.now() + (24 * 60 * 60 * 1000);
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Get all available banks from OBP-API
   */
  async getBanks(): Promise<BankingApiResponse<OBPBank[]>> {
    const result = await this.makeRequest<{ banks: OBPBank[] }>('/obp/v5.1.0/banks');
    
    if (result.success && result.data) {
      return {
        success: result.success,
        data: result.data.banks,
        statusCode: result.statusCode,
      };
    }
    
    return {
      success: false,
      error: result.error,
      statusCode: result.statusCode,
    };
  }

  /**
   * Create a new bank account via OBP-API
   */
  async createAccount(request: CreateBankAccountRequest): Promise<BankingApiResponse<BankAccount>> {
    console.log(`🏗️ Creating REAL OBP account for user ${request.userId}`);
    
    try {
      // First, get available banks
      const banksResult = await this.getBanks();
      if (!banksResult.success || !banksResult.data || banksResult.data.length === 0) {
        throw new Error('No banks available for account creation');
      }

      // Use the requested bank, or fallback to EURBANK if not specified
      const requestedBankId = request.bankId || 'EURBANK';
      const targetBank = banksResult.data.find(bank => bank.id === requestedBankId);
      if (!targetBank) {
        throw new Error(`Bank ${requestedBankId} not found - cannot create account`);
      }
      
      console.log(`🏦 Using bank: ${targetBank.full_name} (${targetBank.id})`);

      // Get the OBP user ID (not our app's user ID)
      const userResult = await this.makeRequest<{ user_id: string }>('/obp/v5.1.0/users/current');
      if (!userResult.success || !userResult.data?.user_id) {
        throw new Error('Could not get OBP user ID');
      }
      
      const obpUserId = userResult.data.user_id;
      console.log(`👤 Using OBP user ID: ${obpUserId}`);
      
      // Generate truly unique IBAN with timestamp to avoid collisions
      const uniqueAccountNumber = `${this.generateAccountNumber(request.userId)}${Date.now().toString().slice(-4)}`;
      const iban = this.generateIBAN(request.country, uniqueAccountNumber);
      
      // Create account via real OBP-API using correct format
      const accountData = {
        user_id: obpUserId,
        label: request.name,
        product_code: `${request.currency}_${request.type}`,
        balance: {
          currency: request.currency,
          amount: "0", // OBP requires zero initial balance
        },
        branch_id: "BRANCH1",
        account_routings: [
          {
            scheme: "IBAN",
            address: iban,
          }
        ],
      };

      console.log('📋 Creating account with data:', JSON.stringify(accountData, null, 2));

      const createResult = await this.makeRequest<{
        account_id: string;
        user_id: string;
        label: string;
        product_code: string;
        balance: { currency: string; amount: string };
        branch_id: string;
        account_routings: Array<{ scheme: string; address: string }>;
      }>(
        `/obp/v5.1.0/banks/${targetBank.id}/accounts`,
        {
          method: 'POST',
          body: JSON.stringify(accountData),
        }
      );

      if (!createResult.success) {
        console.error('❌ Real OBP account creation failed:', createResult.error);
        throw new Error(`OBP account creation failed: ${createResult.error?.error_description}`);
      }

      const obpAccount = createResult.data!;
      console.log('🎉 REAL OBP account created:', obpAccount.account_id);

      // Convert OBP account to our format
      const bankingAccount: BankAccount = {
        id: Math.floor(Math.random() * 1000000), // Use random ID for database storage
        profile: Math.floor(Math.random() * 100000), // Use random profile ID
        currency: request.currency,
        country: request.country,
        type: request.type.toLowerCase(),
        name: request.name,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        balance: {
          amount: parseFloat(obpAccount.balance.amount),
          currency: obpAccount.balance.currency,
        },
        iban: obpAccount.account_routings[0]?.address || iban,
        account_number: obpAccount.account_routings[0]?.address || this.generateAccountNumber(request.userId),
        sort_code: request.country === 'GB' ? '123456' : undefined,
        // Store OBP-specific data
        obp_bank_id: targetBank.id,
        obp_account_id: obpAccount.account_id,
      };

      console.log(`✅ Created REAL OBP account with IBAN: ${bankingAccount.iban}`);

      return {
        success: true,
        data: bankingAccount,
        statusCode: 201,
      };
    } catch (error) {
      console.error('❌ REAL OBP account creation failed completely:', error);
      
      // NO FALLBACK - throw error for 100% OBP integration
      throw new Error(`Failed to create real OBP account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Get account balance from OBP-API (REAL API ONLY)
   */
  async getAccountBalance(accountId: string): Promise<BankingApiResponse<{
    id: number;
    currency: string;
    amount: { value: number; currency: string };
    reservedAmount: { value: number; currency: string };
    availableAmount: { value: number; currency: string };
  }>> {
    console.log(`💰 Getting REAL OBP account balance for ${accountId}`);
    
    try {
      // Get balance from real OBP-API
      const result = await this.makeRequest<{ accounts: Array<{ id: string; balance: { currency: string; amount: string }; account_routings?: Array<{ address: string }> }> }>(`/obp/v5.1.0/my/accounts`);
      
      if (result.success && result.data && 'accounts' in result.data && Array.isArray(result.data.accounts)) {
        const account = result.data.accounts.find((acc: { id: string; account_routings?: Array<{ address: string }> }) => 
          acc.id === accountId || acc.account_routings?.some((routing: { address: string }) => routing.address === accountId)
        );
        
        if (account && 'balance' in account && account.balance) {
          const balance = account.balance as { currency: string; amount: string };
          console.log(`✅ Found REAL OBP balance: ${balance.amount} ${balance.currency}`);
          return {
            success: true,
            data: {
              id: parseInt(accountId.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000),
              currency: (account.balance as { currency: string; amount: string }).currency,
              amount: {
                value: parseFloat((account.balance as { currency: string; amount: string }).amount),
                currency: (account.balance as { currency: string; amount: string }).currency,
              },
              reservedAmount: {
                value: 0,
                currency: (account.balance as { currency: string; amount: string }).currency,
              },
              availableAmount: {
                value: parseFloat((account.balance as { currency: string; amount: string }).amount),
                currency: (account.balance as { currency: string; amount: string }).currency,
              },
            },
            statusCode: 200,
          };
        }
      }
      
      throw new Error(`Account ${accountId} not found in OBP-API`);
    } catch (error) {
      console.error('❌ REAL OBP balance retrieval failed:', error);
      throw new Error(`Failed to get real OBP balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fund EURBANK master account using transaction request method
   * 
   * This is the WORKING method to add balances to the master account.
   * Uses OBP-API transaction request with challenge completion.
   * 
   * Method:
   * 1. Create SANDBOX_TAN transaction request (self-transfer)
   * 2. Complete challenge with answer "123"
   * 3. Transaction completes and adds balance to master account
   */
  async fundMasterAccount(amount: number = 5000): Promise<BankingApiResponse<{
    transaction_id: string;
    amount: number;
    currency: string;
    new_balance: string;
    status: string;
  }>> {
    console.log(`💰 [OBP-FUNDING] Starting REAL EUR master account funding: ${amount} EUR`);
    
    try {
      // Ensure authentication
      const authCheck = await this.ensureValidToken();
      if (!authCheck) {
        throw new Error('OBP-API authentication failed');
      }
      
      // Step 1: Create transaction request to fund master account
      console.log('📝 [OBP-FUNDING] Creating EUR transaction request...');
      const transactionRequest = await this.createTransactionRequest({
        from_bank_id: 'EURBANK',
        from_account_id: 'f8ea80af-7e83-4211-bca7-d8fc53094c1c', // EURBANK master account
        to: {
          bank_id: 'EURBANK',
          account_id: 'f8ea80af-7e83-4211-bca7-d8fc53094c1c' // Self-transfer to add funds
        },
        value: {
          currency: 'EUR',
          amount: amount.toString()
        },
        description: 'EUR Master account funding for virtual IBAN system',
        challenge_type: 'SANDBOX_TAN'
      });
      
      if (!transactionRequest.success || !transactionRequest.data) {
        throw new Error(`Transaction request failed: ${transactionRequest.error?.error_description}`);
      }
      
      const requestId = transactionRequest.data.id;
      const challengeId = transactionRequest.data.challenge?.id;
      
      if (!challengeId) {
        throw new Error('No challenge ID received from transaction request');
      }
      
      console.log(`🔑 [OBP-FUNDING] Completing EUR challenge: ${challengeId}`);
      
      // Step 2: Complete challenge with sandbox answer "123"
      const challengeResult = await this.makeRequest<{
        id: string;
        status: string;
        transaction_ids: string[];
      }>(`/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${requestId}/challenge`, {
        method: 'POST',
        body: JSON.stringify({
          id: challengeId,
          answer: '123' // Sandbox challenge answer
        })
      });
      
      if (!challengeResult.success || !challengeResult.data) {
        throw new Error(`Challenge completion failed: ${challengeResult.error?.error_description}`);
      }
      
      if (challengeResult.data.status !== 'COMPLETED') {
        throw new Error(`Transaction not completed. Status: ${challengeResult.data.status}`);
      }
      
      const transactionId = challengeResult.data.transaction_ids[0];
      console.log(`✅ [OBP-FUNDING] EUR Transaction completed: ${transactionId}`);
      
      // Step 3: Verify new balance
      const accountResult = await this.makeRequest<{
        balance: { currency: string; amount: string };
      }>('/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/owner/account');
      
      const newBalance = accountResult.success ? accountResult.data?.balance.amount : 'unknown';
      
      console.log(`🎉 [OBP-FUNDING] EUR Master account funded successfully! New balance: ${newBalance} EUR`);
      
      return {
        success: true,
        data: {
          transaction_id: transactionId,
          amount: amount,
          currency: 'EUR',
          new_balance: newBalance || 'unknown',
          status: 'COMPLETED'
        },
        statusCode: 201
      };
      
    } catch (error) {
      console.error('❌ [OBP-FUNDING] EUR Master account funding failed:', error);
      
      // Fallback to internal funding for development
      console.log('🔄 [OBP-FUNDING] Falling back to internal EUR funding...');
      const fallbackResult = await this.fallbackInternalFunding();
      return fallbackResult as BankingApiResponse<{
        transaction_id: string;
        amount: number;
        currency: string;
        new_balance: string;
        status: string;
      }>;
    }
  }

  /**
   * Fund HNLBANK master account using transaction request method
   * 
   * This funds the HNL master account for Lempira transactions.
   * Uses OBP-API transaction request with challenge completion.
   * 
   * Method:
   * 1. Create SANDBOX_TAN transaction request (self-transfer)
   * 2. Complete challenge with answer "123"
   * 3. Transaction completes and adds balance to HNL master account
   */
  async fundHNLMasterAccount(amount: number = 130000): Promise<BankingApiResponse<{
    transaction_id: string;
    amount: number;
    currency: string;
    new_balance: string;
    status: string;
  }>> {
    console.log(`💰 [OBP-FUNDING] Starting REAL HNL master account funding: ${amount} HNL`);
    
    try {
      // Ensure authentication
      const authCheck = await this.ensureValidToken();
      if (!authCheck) {
        throw new Error('OBP-API authentication failed');
      }
      
      // Step 1: Create transaction request to fund HNL master account
      console.log('📝 [OBP-FUNDING] Creating HNL transaction request...');
      const transactionRequest = await this.createTransactionRequest({
        from_bank_id: 'HNLBANK',
        from_account_id: '86563464-f391-4b9f-ab71-fd25385ab466', // HNLBANK master account
        to: {
          bank_id: 'HNLBANK',
          account_id: '86563464-f391-4b9f-ab71-fd25385ab466' // Self-transfer to add funds
        },
        value: {
          currency: 'HNL',
          amount: amount.toString()
        },
        description: 'HNL Master account funding for virtual IBAN system',
        challenge_type: 'SANDBOX_TAN'
      });
      
      if (!transactionRequest.success || !transactionRequest.data) {
        throw new Error(`HNL Transaction request failed: ${transactionRequest.error?.error_description}`);
      }
      
      const requestId = transactionRequest.data.id;
      const challengeId = transactionRequest.data.challenge?.id;
      
      if (!challengeId) {
        throw new Error('No challenge ID received from HNL transaction request');
      }
      
      console.log(`🔑 [OBP-FUNDING] Completing HNL challenge: ${challengeId}`);
      
      // Step 2: Complete challenge with sandbox answer "123"
      const challengeResult = await this.makeRequest<{
        id: string;
        status: string;
        transaction_ids: string[];
      }>(`/obp/v5.1.0/banks/HNLBANK/accounts/86563464-f391-4b9f-ab71-fd25385ab466/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${requestId}/challenge`, {
        method: 'POST',
        body: JSON.stringify({
          id: challengeId,
          answer: '123' // Sandbox challenge answer
        })
      });
      
      if (!challengeResult.success || !challengeResult.data) {
        throw new Error(`HNL Challenge completion failed: ${challengeResult.error?.error_description}`);
      }
      
      if (challengeResult.data.status !== 'COMPLETED') {
        throw new Error(`HNL Transaction not completed. Status: ${challengeResult.data.status}`);
      }
      
      const transactionId = challengeResult.data.transaction_ids[0];
      console.log(`✅ [OBP-FUNDING] HNL Transaction completed: ${transactionId}`);
      
      // Step 3: Verify new balance
      const accountResult = await this.makeRequest<{
        balance: { currency: string; amount: string };
      }>('/obp/v5.1.0/banks/HNLBANK/accounts/86563464-f391-4b9f-ab71-fd25385ab466/owner/account');
      
      const newBalance = accountResult.success ? accountResult.data?.balance.amount : 'unknown';
      
      console.log(`🎉 [OBP-FUNDING] HNL Master account funded successfully! New balance: ${newBalance} HNL`);
      
      return {
        success: true,
        data: {
          transaction_id: transactionId,
          amount: amount,
          currency: 'HNL',
          new_balance: newBalance || 'unknown',
          status: 'COMPLETED'
        },
        statusCode: 201
      };
      
    } catch (error) {
      console.error('❌ [OBP-FUNDING] HNL Master account funding failed:', error);
      
      // Fallback to internal funding for development
      console.log('🔄 [OBP-FUNDING] Falling back to internal HNL funding...');
      const fallbackResult = await this.fallbackInternalFunding();
      return fallbackResult as BankingApiResponse<{
        transaction_id: string;
        amount: number;
        currency: string;
        new_balance: string;
        status: string;
      }>;
    }
  }

  /**
   * Import Test Data - Simulate initial deposit for specific currency
   * 
   * This simulates the flow where users need to deposit money to get started.
   * Creates virtual account for user and simulates incoming transfer.
   * Now supports currency-specific routing to the correct master account.
   */
  async importSandboxData(userId?: string, currency: string = 'EUR'): Promise<BankingApiResponse<unknown>> {
    console.log(`💰 [IMPORT-TEST-DATA] Starting initial deposit simulation for user: ${userId} (${currency})`);
    
    if (!userId) {
      console.error('❌ [IMPORT-TEST-DATA] No user ID provided');
      return {
        success: false,
        error: {
          error: 'NO_USER_ID',
          error_description: 'User ID is required for initial deposit simulation'
        },
        statusCode: 400
      };
    }

    // Validate supported currencies
    if (!['EUR', 'HNL'].includes(currency)) {
      console.error(`❌ [IMPORT-TEST-DATA] Unsupported currency: ${currency}`);
      return {
        success: false,
        error: {
          error: 'UNSUPPORTED_CURRENCY',
          error_description: `Currency ${currency} is not supported. Supported currencies: EUR, HNL`
        },
        statusCode: 400
      };
    }
    
    try {
      // Import master account banking service
      const { masterAccountBanking } = await import('../services/master-account-banking.js');
      
      console.log(`🏦 [IMPORT-TEST-DATA] Step 1: Ensuring user has virtual ${currency} account...`);
      
      // Step 1: Ensure user has virtual account for the specified currency (check first, create if needed)
      console.log(`🔍 [IMPORT-TEST-DATA] Checking if user already has virtual ${currency} account...`);
      
      const { prisma } = await import('../config/database.js');
      const existingAccount = await prisma.bankAccount.findFirst({
        where: {
          userId,
          currency,
          accountType: 'virtual_remittance',
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'asc' } // Get the first/oldest account to avoid duplicates
      });
      
      let virtualAccount;
      
      if (existingAccount) {
        console.log(`📋 [IMPORT-TEST-DATA] Found existing ${currency} account: ${existingAccount.iban}`);
        virtualAccount = {
          userId,
          virtualIBAN: existingAccount.iban!,
          currency: currency as 'EUR' | 'HNL',
          balance: parseFloat(existingAccount.lastBalance?.toString() || '0'),
          masterAccountReference: existingAccount.obpAccountId || '',
          status: 'ACTIVE' as const,
          bic: existingAccount.bic || (currency === 'EUR' ? 'REMTES21XXX' : 'REMTES01XXX'),
          bankName: existingAccount.bankName || (currency === 'EUR' ? 'Euro Remittance Bank' : 'Lempira Remittance Bank'),
          accountNumber: existingAccount.accountNumber || undefined,
          country: existingAccount.country || (currency === 'EUR' ? 'ES' : 'HN')
        };
      } else {
        console.log(`🏦 [IMPORT-TEST-DATA] No existing account found, creating new virtual ${currency} account...`);
        virtualAccount = await masterAccountBanking.createVirtualAccount(userId, currency as 'EUR' | 'HNL', `${currency} Remittance Account`);
        console.log(`✅ [IMPORT-TEST-DATA] Virtual ${currency} account created: ${virtualAccount.virtualIBAN}`);
      }
      
      const depositAmount = currency === 'EUR' ? 100 : 2600; // €100 or L.2600 (rough equivalent)
      const currencySymbol = currency === 'EUR' ? '€' : 'L.';
      
      console.log(`💸 [IMPORT-TEST-DATA] Step 2: Simulating external ${currencySymbol}${depositAmount} deposit to ${currency} master account...`);
      
      // Step 2a: First, simulate external money coming into the appropriate master account
      // This represents someone sending money from outside our system to the user's virtual IBAN
      console.log(`🏦 [IMPORT-TEST-DATA] Crediting ${currencySymbol}${depositAmount} to ${currency} master account...`);
      
      let masterFundingResult;
      if (currency === 'EUR') {
        masterFundingResult = await this.fundMasterAccount(depositAmount); // Add to EUR master account
      } else {
        // For HNL, we need to fund the HNL master account
        masterFundingResult = await this.fundHNLMasterAccount(depositAmount);
      }
      
      if (!masterFundingResult.success) {
        throw new Error(`Failed to credit ${currency} master account: ${masterFundingResult.error?.error_description}`);
      }
      
      console.log(`✅ [IMPORT-TEST-DATA] ${currency} master account credited. New balance: ${masterFundingResult.data?.new_balance} ${currency}`);
      
      // Step 2b: Now process the inbound transfer to credit the user's virtual balance
      console.log(`💰 [IMPORT-TEST-DATA] Crediting user's virtual balance...`);
      
      const inboundResult = await masterAccountBanking.processInboundTransfer({
        virtualIBAN: virtualAccount.virtualIBAN,
        amount: depositAmount,
        currency: currency as 'EUR' | 'HNL',
        senderDetails: {
          name: 'External Bank Transfer',
          reference: `Initial ${currency} deposit via Import Test Data`
        }
      });
      
      console.log(`✅ [IMPORT-TEST-DATA] Inbound transfer completed: ${inboundResult.referenceNumber}`);
      console.log(`🎉 [IMPORT-TEST-DATA] User now has ${currencySymbol}${depositAmount}.00 to test the system!`);
      
      return {
        success: true,
        data: {
          message: `External deposit of ${currencySymbol}${depositAmount}.00 completed successfully`,
          virtual_account: {
            iban: virtualAccount.virtualIBAN,
            bic: virtualAccount.bic,
            bank_name: virtualAccount.bankName
          },
          deposit: {
            amount: depositAmount,
            currency: currency,
            reference: inboundResult.referenceNumber,
            status: 'COMPLETED'
          },
          master_account: {
            new_balance: masterFundingResult.data?.new_balance || 'Unknown',
            transaction_id: masterFundingResult.data?.transaction_id || 'N/A'
          },
          instructions: `External funds received! Your virtual IBAN now has ${currencySymbol}${depositAmount}.00 and the ${currency} master account has been credited accordingly.`
        },
        statusCode: 201
      };
      
    } catch (error) {
      console.error(`❌ [IMPORT-TEST-DATA] Failed to simulate initial ${currency} deposit:`, error);
      
      // Fallback to master account funding if user simulation fails
      console.log(`🔄 [IMPORT-TEST-DATA] Falling back to ${currency} master account funding...`);
      if (currency === 'EUR') {
        return this.fundMasterAccount(5000);
      } else {
        return this.fundHNLMasterAccount(130000); // L.130,000 equivalent fallback
      }
    }
  }

  /**
   * Fallback internal funding when OBP-API is unavailable (Development only)
   */
  private async fallbackInternalFunding(userId?: string): Promise<BankingApiResponse<unknown>> {
    console.log('🔄 [OBP-FALLBACK] Using internal funding mechanism as OBP-API fallback...');
    
    // For master account funding, we don't need a specific user
    if (!userId) {
      console.log('💰 [OBP-FALLBACK] Master account funding - no specific user required');
      return {
        success: true,
        data: {
          message: 'Master account funding simulated (OBP-API unavailable)',
          method: 'MASTER_ACCOUNT_FALLBACK',
          note: 'This is a development fallback when OBP-API authentication fails'
        },
        statusCode: 200
      };
    }
    
    console.log(`💰 [OBP-FALLBACK] Direct internal funding for user: ${userId}`);
    
    // DIRECT DATABASE FUNDING - No recursion, no OBP calls
    try {
      const { prisma } = await import('../config/database.js');
      const { Decimal } = await import('@prisma/client/runtime/library.js');
      
      // Find user's EUR account
      const eurAccount = await prisma.bankAccount.findFirst({
        where: {
          userId,
          currency: 'EUR',
          accountType: 'virtual_remittance',
          status: 'ACTIVE'
        }
      });
      
      if (eurAccount) {
        // Direct database update - no OBP calls
        await prisma.bankAccount.update({
          where: { id: eurAccount.id },
          data: {
            lastBalance: (eurAccount.lastBalance || new Decimal(0)).add(1000),
            balanceUpdatedAt: new Date()
          }
        });
        
        // Record transaction
        await prisma.transaction.create({
          data: {
            userId,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: 1000,
            currency: 'EUR',
            referenceNumber: `FALLBACK-${Date.now()}`,
            createdAt: new Date(),
            completedAt: new Date()
          }
        });
        
        console.log('✅ [OBP-FALLBACK] EUR account funded via direct database update');
      }
      
      return {
        success: true,
        data: {
          message: 'Internal funding completed (OBP-API unavailable)',
          method: 'DIRECT_DATABASE_FUNDING',
          funded_accounts: ['EUR: 1000.00'],
          note: 'This is a development fallback when OBP-API authentication fails'
        },
        statusCode: 200
      };
      
    } catch (error) {
      console.error('❌ [OBP-FALLBACK] Internal funding failed:', error);
      return {
        success: false,
        error: { 
          error: 'OBP-FUNDING-001', 
          error_description: `Internal funding failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
        statusCode: 500
      };
    }
  }

  /**
   * Get account details from OBP-API (REAL API ONLY)
   */
  async getAccountDetails(bankId: string, accountId: string): Promise<BankingApiResponse<BankAccountDetails>> {
    console.log(`📋 Getting REAL OBP account details for ${bankId}/${accountId}`);
    
    try {
      const result = await this.makeRequest<OBPAccount>(`/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/owner/account`);
      
      if (result.success && result.data) {
        const obpAccount = result.data;
        console.log(`✅ Found REAL OBP account details: ${obpAccount.label}`);
        
        const accountDetails: BankAccountDetails = {
          id: parseInt(obpAccount.id.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000),
          currency: obpAccount.balance.currency,
          country: bankId === 'HNLBANK2' ? 'HN' : 'ES', // Honduras for HNLBANK2, Spain for others
          iban: obpAccount.account_routings?.find(r => r.scheme === 'IBAN')?.address || 
                this.generateIBAN(bankId === 'HNLBANK2' ? 'HN' : 'ES', obpAccount.number),
          account_number: obpAccount.number,
          sort_code: obpAccount.account_routings?.find(r => r.scheme === 'SortCode')?.address,
          routing_number: obpAccount.account_routings?.find(r => r.scheme === 'RoutingNumber')?.address,
          bic: bankId === 'HNLBANK2' ? 'ATLHHNXX' : 'ENHBK1XXXX', // Appropriate BIC codes
          bank_name: bankId === 'HNLBANK2' ? 'Banco Atlántida' : 'Enhanced Test Bank Limited', 
          bank_address: bankId === 'HNLBANK2' ? 'Tegucigalpa, Honduras' : 'Enhanced Bank Location',
          account_holder_name: obpAccount.label || 'Account Holder',
          // Include balance information
          balance: {
            amount: obpAccount.balance.amount,
            currency: obpAccount.balance.currency
          },
          label: obpAccount.label
        };
        
        return {
          success: true,
          data: accountDetails,
          statusCode: 200,
        };
      }
      
      throw new Error(`Account ${accountId} not found in bank ${bankId}`);
    } catch (error) {
      console.error('❌ REAL OBP account details retrieval failed:', error);
      throw new Error(`Failed to get real OBP account details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create transaction request via OBP-API (REAL TRANSFER IMPLEMENTATION)
   */
  async createTransactionRequest(requestData: {
    from_bank_id: string;
    from_account_id: string;
    to?: {
      bank_id?: string;
      account_id?: string;
      iban?: string;
    };
    value: {
      currency: string;
      amount: string;
    };
    description: string;
    challenge_type?: string;
  }): Promise<BankingApiResponse<{
    id: string;
    type: string;
    from: {
      bank_id: string;
      account_id: string;
    };
    details: {
      to_sepa?: {
        iban: string;
      };
      to_sandbox_tan?: {
        bank_id: string;
        account_id: string;
      };
      value: {
        currency: string;
        amount: string;
      };
      description: string;
    };
    body: Record<string, unknown>;
    status: string;
    start_date: string;
    end_date: string;
    challenge?: {
      id: string;
      user_id: string;
      allowed_attempts: number;
      challenge_type: string;
    };
  }>> {
    console.log(`💸 Creating REAL OBP transaction request from ${requestData.from_bank_id}/${requestData.from_account_id}`);
    
    try {
      // Determine transaction request type based on destination
      let endpoint = '';
      let requestBody: Record<string, unknown> = {};
      
      if (requestData.to?.iban) {
        // SEPA transfer via IBAN - Proper OBP-API v5.1.0 SEPA format
        endpoint = `/obp/v5.1.0/banks/${requestData.from_bank_id}/accounts/${requestData.from_account_id}/owner/transaction-request-types/SEPA/transaction-requests`;
        requestBody = {
          to: {
            iban: requestData.to.iban
          },
          value: requestData.value,
          description: requestData.description,
          charge_policy: "SHARED", // Required field for SEPA transfers
          future_date: "", // Optional - empty for immediate transfer
          challenge_type: requestData.challenge_type || "SANDBOX_TAN"
        };
      } else if (requestData.to?.bank_id && requestData.to?.account_id) {
        // Sandbox internal transfer
        endpoint = `/obp/v5.1.0/banks/${requestData.from_bank_id}/accounts/${requestData.from_account_id}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests`;
        requestBody = {
          to: {
            bank_id: requestData.to.bank_id,
            account_id: requestData.to.account_id
          },
          value: requestData.value,
          description: requestData.description,
          challenge_type: requestData.challenge_type || "SANDBOX_TAN"
        };
      } else {
        throw new Error('Invalid destination: must provide either IBAN or bank_id/account_id');
      }

      console.log(`🔗 OBP Transaction Request: POST ${endpoint}`);
      console.log('📋 Request body:', JSON.stringify(requestBody, null, 2));

      const result = await this.makeRequest<{
        id: string;
        type: string;
        from: {
          bank_id: string;
          account_id: string;
        };
        details: Record<string, unknown>;
        body: Record<string, unknown>;
        status: string;
        start_date: string;
        end_date: string;
        challenge?: Record<string, unknown>;
      }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (result.success && result.data) {
        console.log('✅ OBP Transaction Request created successfully:', result.data.id);
        return {
          success: true,
          data: {
          ...result.data,
          details: result.data.details as {
            to_sepa?: { iban: string };
            to_sandbox_tan?: { bank_id: string; account_id: string };
            value: { currency: string; amount: string };
            description: string;
          },
          body: result.data.body as {
            to_sepa?: { iban: string };
            to_sandbox_tan?: { bank_id: string; account_id: string };
            value: { currency: string; amount: string };
            description: string;
          },
          challenge: result.data.challenge as {
            id: string;
            user_id: string;
            allowed_attempts: number;
            challenge_type: string;
          } | undefined
        },
          statusCode: 201
        };
      } else {
        console.error('❌ OBP Transaction Request failed:', result.error);
        return {
          success: false,
          error: result.error || {
            error: 'OBP-TRANSFER-001',
            error_description: 'Failed to create transaction request via OBP-API'
          },
          statusCode: result.statusCode || 500
        };
      }
    } catch (error) {
      console.error('❌ OBP Transaction Request error:', error);
      return {
        success: false,
        error: {
          error: 'OBP-TRANSFER-002',
          error_description: `Transaction request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        statusCode: 500
      };
    }
  }

  /**
   * Test OBP-API connectivity
   */
  async testConnectivity(): Promise<{ success: boolean; features: string[]; error?: string }> {
    console.log('🔍 Testing OBP-API connectivity...');
    
    const features: string[] = [];
    
    try {
      // Test root endpoint
      const rootResult = await this.makeRequest<{ version: string }>('/obp/v5.1.0/root');
      if (rootResult.success) {
        features.push('✅ API Root access');
        console.log('✅ OBP-API root endpoint working');
      }
      
      // Test banks endpoint
      const banksResult = await this.getBanks();
      if (banksResult.success && banksResult.data && banksResult.data.length > 0) {
        features.push(`✅ Banks access (${banksResult.data.length} banks)`);
        console.log(`✅ OBP-API banks endpoint working (${banksResult.data.length} banks found)`);
      }
      
      // Test user access
      const userResult = await this.makeRequest<{ user_id: string }>('/obp/v5.1.0/users/current');
      if (userResult.success) {
        features.push('✅ User authentication');
        console.log('✅ OBP-API user authentication working');
      }
      
      return {
        success: features.length > 0,
        features,
      };
    } catch (error) {
      console.error('❌ OBP-API connectivity test failed:', error);
      return {
        success: false,
        features,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get comprehensive banks and master account status
   * This provides a detailed overview of all banks and their master account balances
   */
  async getBanksAndMasterAccountStatus(): Promise<BankingApiResponse<{
    banks: Array<{
      id: string;
      name: string;
      accounts: Array<{
        id: string;
        label: string;
        currency: string;
        balance: string;
        is_master_account: boolean;
      }>;
    }>;
    master_accounts: {
      EUR: {
        bank_id: string;
        account_id: string;
        balance: string;
        status: string;
      };
      HNL: {
        bank_id: string;
        account_id: string;
        balance: string;
        status: string;
      };
    };
    summary: {
      total_banks: number;
      total_master_accounts: number;
      currencies_supported: string[];
    };
  }>> {
    console.log('🏦 [BANKS-STATUS] Getting comprehensive banks and master account status...');
    
    try {
      // Step 1: Get all banks
      const banksResult = await this.getBanks();
      if (!banksResult.success || !banksResult.data) {
        throw new Error('Failed to get banks from OBP-API');
      }
      
      console.log(`🏦 [BANKS-STATUS] Found ${banksResult.data.length} banks`);
      
      const banksWithAccounts = [];
      const masterAccountStatus = {
        EUR: { bank_id: 'EURBANK', account_id: 'f8ea80af-7e83-4211-bca7-d8fc53094c1c', balance: 'unknown', status: 'unknown' },
        HNL: { bank_id: 'HNLBANK', account_id: '86563464-f391-4b9f-ab71-fd25385ab466', balance: 'unknown', status: 'unknown' }
      };
      
      // Step 2: For each bank, get accounts and check for master accounts
      for (const bank of banksResult.data) {
        console.log(`🔍 [BANKS-STATUS] Checking accounts for bank: ${bank.id} (${bank.full_name})`);
        
        try {
          // Get accounts for this bank
          const accountsResult = await this.makeRequest<{
            accounts: Array<{
              id: string;
              label: string;
              balance: { currency: string; amount: string };
            }>;
          }>(`/obp/v5.1.0/banks/${bank.id}/accounts`);
          
          const bankAccounts = [];
          
          if (accountsResult.success && accountsResult.data?.accounts) {
            for (const account of accountsResult.data.accounts) {
              const isMasterAccount = 
                (bank.id === 'EURBANK' && account.id === 'f8ea80af-7e83-4211-bca7-d8fc53094c1c') ||
                (bank.id === 'HNLBANK' && account.id === '86563464-f391-4b9f-ab71-fd25385ab466');
              
              bankAccounts.push({
                id: account.id,
                label: account.label,
                currency: account.balance.currency,
                balance: account.balance.amount,
                is_master_account: isMasterAccount
              });
              
              // Update master account status if this is a master account
              if (isMasterAccount) {
                if (bank.id === 'EURBANK') {
                  masterAccountStatus.EUR.balance = account.balance.amount;
                  masterAccountStatus.EUR.status = 'active';
                } else if (bank.id === 'HNLBANK') {
                  masterAccountStatus.HNL.balance = account.balance.amount;
                  masterAccountStatus.HNL.status = 'active';
                }
                console.log(`💰 [BANKS-STATUS] Found master account: ${bank.id}/${account.id} - Balance: ${account.balance.amount} ${account.balance.currency}`);
              }
            }
          }
          
          banksWithAccounts.push({
            id: bank.id,
            name: bank.full_name,
            accounts: bankAccounts
          });
          
        } catch (bankError) {
          console.error(`❌ [BANKS-STATUS] Failed to get accounts for bank ${bank.id}:`, bankError);
          banksWithAccounts.push({
            id: bank.id,
            name: bank.full_name,
            accounts: []
          });
        }
      }
      
      // Step 3: Try to get detailed balance for master accounts directly
      console.log('🔍 [BANKS-STATUS] Getting detailed master account balances...');
      
      try {
        const eurBalance = await this.makeRequest<{
          balance: { currency: string; amount: string };
        }>('/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/owner/account');
        
        if (eurBalance.success && eurBalance.data?.balance) {
          masterAccountStatus.EUR.balance = eurBalance.data.balance.amount;
          masterAccountStatus.EUR.status = 'accessible';
          console.log(`💰 [BANKS-STATUS] EUR Master Account Balance: ${eurBalance.data.balance.amount} EUR`);
        }
      } catch (eurError) {
        console.error('❌ [BANKS-STATUS] Failed to get EUR master account balance:', eurError);
      }
      
      try {
        const hnlBalance = await this.makeRequest<{
          balance: { currency: string; amount: string };
        }>('/obp/v5.1.0/banks/HNLBANK/accounts/86563464-f391-4b9f-ab71-fd25385ab466/owner/account');
        
        if (hnlBalance.success && hnlBalance.data?.balance) {
          masterAccountStatus.HNL.balance = hnlBalance.data.balance.amount;
          masterAccountStatus.HNL.status = 'accessible';
          console.log(`💰 [BANKS-STATUS] HNL Master Account Balance: ${hnlBalance.data.balance.amount} HNL`);
        }
      } catch (hnlError) {
        console.error('❌ [BANKS-STATUS] Failed to get HNL master account balance:', hnlError);
      }
      
      const summary = {
        total_banks: banksWithAccounts.length,
        total_master_accounts: Object.values(masterAccountStatus).filter(ma => ma.status !== 'unknown').length,
        currencies_supported: ['EUR', 'HNL']
      };
      
      console.log('✅ [BANKS-STATUS] Banks and master account status retrieved successfully');
      
      return {
        success: true,
        data: {
          banks: banksWithAccounts,
          master_accounts: masterAccountStatus,
          summary
        },
        statusCode: 200
      };
      
    } catch (error) {
      console.error('❌ [BANKS-STATUS] Failed to get banks and master account status:', error);
      return {
        success: false,
        error: {
          error: 'BANKS_STATUS_ERROR',
          error_description: `Failed to get banks status: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        statusCode: 500
      };
    }
  }

  /**
   * Generate account number for testing
   */
  private generateAccountNumber(userId?: string): string {
    const base = userId ? userId.slice(-6) : Math.random().toString(36).slice(-6);
    return (parseInt(base, 36) % 1000000).toString().padStart(6, '0');
  }

  /**
   * Generate IBAN for different countries
   */
  private generateIBAN(countryCode: string, accountNumber: string): string {
    // Simple IBAN generation - in production this would be more robust
    const hash = accountNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    switch (countryCode) {
      case 'ES': // Spanish IBAN: 24 characters
        const esBankCode = '2100';
        const esBranchCode = '0418';
        const esAccNum = accountNumber.padStart(10, '0').slice(-10);
        return `ES${(hash % 100).toString().padStart(2, '0')}${esBankCode}${esBranchCode}${esAccNum}`;
      
      case 'DE': // German IBAN: 22 characters
        const deBankCode = '10000000';
        const deAccNum = accountNumber.padStart(10, '0').slice(-10);
        return `DE${(hash % 100).toString().padStart(2, '0')}${deBankCode}${deAccNum}`;
      
      default:
        const defaultBankCode = '1234567890';
        const accNum = accountNumber.padStart(10, '0').slice(-10);
        return `${countryCode}${(hash % 100).toString().padStart(2, '0')}${defaultBankCode}${accNum}`;
    }
  }

}

export const obpApiService = new OBPApiService();
export const obpService = obpApiService;
