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
      baseUrl: env.OBP_API_BASE_URL || 'http://127.0.0.1:8080',
      consumerKey: env.OBP_CONSUMER_KEY || 'vttcad5o5fas3tmuifj5stclbuei4letdtstk4zu',
      consumerSecret: env.OBP_CONSUMER_SECRET || 'i1a1qsi0sy3lux4xjhmfg4n1y1besylzvvplkl0x',
      username: env.OBP_USERNAME || 'bootstrap',
      password: env.OBP_PASSWORD || 'BootstrapPass123!',
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
      console.log(`🔗 OBP-API Request: ${options.method || 'GET'} ${endpoint}`);
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
  private async getDirectLoginToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    const tokenUrl = `${this.config.baseUrl}/my/logins/direct`;
    
    try {
      console.log('🔑 Getting OBP DirectLogin token...');
      console.log(`🔐 Using credentials: username=${this.config.username}, consumer_key=${this.config.consumerKey}`);
      
      // Construct authorization header carefully to avoid escaping issues
      const authHeader = `DirectLogin username="${this.config.username}",password="${this.config.password}",consumer_key="${this.config.consumerKey}"`;
      console.log('🔑 Auth header:', authHeader);
      
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

      console.log('✅ OBP DirectLogin token obtained');
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

      // Use ENHANCEDBANK where we have CanCreateAccount permission and BIC routing
      const targetBank = banksResult.data.find(bank => bank.id === 'ENHANCEDBANK');
      if (!targetBank) {
        throw new Error('ENHANCEDBANK not found - required for account creation with BIC routing');
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
          country: 'ES', // Spanish accounts
          iban: obpAccount.account_routings?.find(r => r.scheme === 'IBAN')?.address || 
                this.generateIBAN('ES', obpAccount.number),
          account_number: obpAccount.number,
          sort_code: obpAccount.account_routings?.find(r => r.scheme === 'SortCode')?.address,
          routing_number: obpAccount.account_routings?.find(r => r.scheme === 'RoutingNumber')?.address,
          bic: 'ENHBK1XXXX', // Real BIC from Enhanced Bank
          bank_name: 'Enhanced Test Bank Limited', 
          bank_address: 'Enhanced Bank Location',
          account_holder_name: obpAccount.label || 'Account Holder',
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
   * Create test accounts for current user via OBP-API
   * Creates accounts with zero balance - simplified approach focusing on account creation first
   */
  async importSandboxData(): Promise<BankingApiResponse<{
    banks: Array<{
      id: string;
      short_name: string;
      full_name: string;
      accounts_imported: number;
    }>;
    total_accounts: number;
    total_transactions: number;
    created_accounts: Array<{
      obp_account_id: string;
      obp_bank_id: string;
      currency: string;
      label: string;
      type: string;
    }>;
  }>> {
    console.log('📦 Creating test accounts for current user via OBP-API...');
    
    try {
      // Create test accounts with zero balance - skip transaction creation for now
      // Focus on getting accounts created successfully first
      
      const banksResult = await this.getBanks();
      if (!banksResult.success || !banksResult.data || banksResult.data.length === 0) {
        throw new Error('No banks available for account creation');
      }

      const targetBank = banksResult.data.find(bank => bank.id === 'ENHANCEDBANK');
      if (!targetBank) {
        throw new Error('ENHANCEDBANK not found - required for test account creation');
      }

      // Get current OBP user
      const userResult = await this.makeRequest<{ user_id: string }>('/obp/v5.1.0/users/current');
      if (!userResult.success || !userResult.data?.user_id) {
        throw new Error('Could not get OBP user ID');
      }
      
      const obpUserId = userResult.data.user_id;
      console.log(`👤 Using OBP user ID: ${obpUserId}`);

      // Simple test accounts - just create them, don't worry about funding for now
      const testAccounts = [
        { currency: 'EUR', label: 'Test EUR Account', type: 'SAVINGS' },
        { currency: 'USD', label: 'Test USD Account', type: 'CURRENT' },
        { currency: 'GBP', label: 'Test GBP Account', type: 'BUSINESS' }
      ];

      let accountsCreated = 0;
      let transactionsCreated = 0; // Will be 0 for now
      const createdAccounts: Array<{ obp_account_id: string; obp_bank_id: string; currency: string; label: string; type: string }> = [];

      console.log(`🏗️ Creating ${testAccounts.length} test accounts with zero balance...`);

      for (const testAccount of testAccounts) {
        try {
          const accountData = {
            user_id: obpUserId,
            label: testAccount.label,
            product_code: `${testAccount.currency}_${testAccount.type}`,
            balance: {
              currency: testAccount.currency,
              amount: "0"  // Start with zero balance - simplify for now
            },
            branch_id: 'BRANCH1'
          };

          console.log(`💳 Creating ${testAccount.currency} account...`);

          const createResult = await this.makeRequest<{
            account_id: string;
            balance: { currency: string; amount: string };
          }>(
            `/obp/v5.1.0/banks/${targetBank.id}/accounts`,
            {
              method: 'POST',
              body: JSON.stringify(accountData),
            }
          );

          if (createResult.success && createResult.data) {
            accountsCreated++;
            const obpAccountId = createResult.data.account_id;
            console.log(`✅ Created ${testAccount.currency} account: ${obpAccountId}`);
            
            // Track created account for database storage
            createdAccounts.push({
              obp_account_id: obpAccountId,
              obp_bank_id: targetBank.id,
              currency: testAccount.currency,
              label: testAccount.label,
              type: testAccount.type,
            });
          } else {
            console.error(`❌ Failed to create ${testAccount.currency} account:`, createResult.error);
          }
        } catch (accountError) {
          console.error(`❌ Error creating ${testAccount.currency} account:`, accountError);
        }
      }

      console.log(`🎉 Test account creation completed!`);
      console.log(`✅ Created ${accountsCreated} accounts`);
      console.log(`✅ Transactions: ${transactionsCreated} (accounts created with zero balance)`);

      return {
        success: true,
        data: {
          banks: [
            {
              id: targetBank.id,
              short_name: targetBank.short_name,
              full_name: targetBank.full_name,
              accounts_imported: accountsCreated,
            }
          ],
          total_accounts: accountsCreated,
          total_transactions: transactionsCreated,
          created_accounts: createdAccounts,
        },
        statusCode: 201,
      };
    } catch (error) {
      console.error('❌ Sandbox data creation failed completely:', error);
      throw new Error(`Failed to create sandbox data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create test deposit for specific account (Superuser only)
   * Using OBP-API v5.1.0 sandbox transaction creation
   */
  async createTestDeposit(
    bankId: string,
    accountId: string,
    amount: number,
    currency: string,
    description?: string
  ): Promise<BankingApiResponse<{
    transaction_id: string;
    account_id: string;
    amount: { currency: string; amount: string };
    description: string;
    posted: string;
  }>> {
    console.log(`💰 Creating test deposit: ${amount} ${currency} to account ${accountId}`);
    
    try {
      // Try direct transaction creation via OBP-API sandbox endpoint
      // This approach creates transactions directly without transaction requests
      const transactionData = {
        type: 'SANDBOX_TAN',
        description: description || `Test deposit - ${amount} ${currency}`,
        posted: new Date().toISOString(),
        completed: new Date().toISOString(),
        value: {
          currency: currency,
          amount: amount.toString()
        },
        other_account: {
          holder: {
            name: 'OBP Test System'
          },
          number: 'TEST_DEPOSIT_SYSTEM',
          kind: 'SYSTEM'
        }
      };

      console.log('📋 Creating direct sandbox transaction:', JSON.stringify(transactionData, null, 2));

      // First, try the direct transaction creation endpoint (sandbox-specific)
      const createResult = await this.makeRequest<{
        id: string;
        this_account: { id: string; bank_id: string };
        other_account: any;
        details: any;
        metadata: any;
      }>(
        `/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/transactions`,
        {
          method: 'POST',
          body: JSON.stringify(transactionData),
        }
      );

      if (createResult.success && createResult.data) {
        console.log(`✅ Direct sandbox transaction created: ${createResult.data.id}`);

        return {
          success: true,
          data: {
            transaction_id: createResult.data.id,
            account_id: accountId,
            amount: { currency: currency, amount: amount.toString() },
            description: description || `Test deposit - ${amount} ${currency}`,
            posted: new Date().toISOString(),
          },
          statusCode: 201,
        };
      }

      // If direct transaction fails, try transaction request approach
      console.log('🔄 Direct transaction failed, trying transaction request approach...');
      console.error('Direct transaction error:', createResult.error);

      // Create a "from" account for the transaction request (system account)
      const transactionRequestData = {
        to: {
          bank_id: bankId,
          account_id: accountId
        },
        value: {
          currency: currency,
          amount: amount.toString()
        },
        description: description || `Test deposit - ${amount} ${currency}`,
        challenge_type: 'SANDBOX_TAN'
      };

      console.log('📋 Creating transaction request (fallback):', JSON.stringify(transactionRequestData, null, 2));

      const requestResult = await this.makeRequest<{
        id: string;
        type: string;
        from: { bank_id: string; account_id: string };
        details: any;
        body: any;
        status: string;
      }>(
        `/obp/v5.1.0/transaction-requests`,
        {
          method: 'POST',
          body: JSON.stringify(transactionRequestData),
        }
      );

      if (!requestResult.success) {
        console.error('❌ Transaction request also failed:', requestResult.error);
        throw new Error(`Both transaction creation methods failed. Direct: ${createResult.error?.error_description}, Request: ${requestResult.error?.error_description}`);
      }

      console.log(`✅ Transaction request created (fallback): ${requestResult.data?.id}`);

      // Return in the expected format
      return {
        success: true,
        data: {
          transaction_id: requestResult.data?.id || 'unknown',
          account_id: accountId,
          amount: { currency: currency, amount: amount.toString() },
          description: description || `Test deposit - ${amount} ${currency}`,
          posted: new Date().toISOString(),
        },
        statusCode: 201,
      };
    } catch (error) {
      console.error('❌ Test deposit creation failed completely:', error);
      throw new Error(`Failed to create test deposit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate realistic account number
   */
  private generateAccountNumber(userId: string): string {
    const hash = this.simpleHash(userId);
    return (hash % 100000000).toString().padStart(8, '0');
  }

  /**
   * Generate IBAN based on country and account number
   */
  private generateIBAN(country: string, accountNumber: string): string {
    const countryCode = country.toUpperCase();
    const hash = this.simpleHash(accountNumber);
    
    // For EUR accounts, always use Spanish IBAN format
    if (countryCode === 'DE' || countryCode === 'ES' || countryCode === 'EUR') {
      const bankCode = '2100'; // Banco Santander code
      const branchCode = '0418'; 
      const controlDigits = '45';
      const accNum = accountNumber.padStart(10, '0').slice(-10);
      const checkDigits = (hash % 100).toString().padStart(2, '0');
      
      return `ES${checkDigits}${bankCode}${branchCode}${controlDigits}${accNum}`;
    }
    
    // Other IBAN formats
    switch (countryCode) {
      case 'GB': {
        const gbBankCode = '1234';
        const gbAccountNumber = accountNumber.padStart(8, '0').slice(-8);
        const gbCheckDigits = (hash % 100).toString().padStart(2, '0');
        return `GB${gbCheckDigits}${gbBankCode}${gbAccountNumber}`;
      }
      case 'US': {
        const bankCode = '1234';
        const accNum = accountNumber.padStart(10, '0').slice(-10);
        return `US${(hash % 100).toString().padStart(2, '0')}${bankCode}${accNum}`;
      }
      default: {
        const defaultBankCode = '1234';
        const accNum = accountNumber.padStart(10, '0').slice(-10);
        return `${countryCode}${(hash % 100).toString().padStart(2, '0')}${defaultBankCode}${accNum}`;
      }
    }
  }


  /**
   * Simple hash function for deterministic generation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// Create singleton instance
export const obpApiService = new OBPApiService();