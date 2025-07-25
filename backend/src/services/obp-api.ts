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

      // Use EURBANK where we have CanCreateAccount permission and BIC routing
      const targetBank = banksResult.data.find(bank => bank.id === 'EURBANK');
      if (!targetBank) {
        throw new Error('EURBANK not found - required for account creation with BIC routing');
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
   * Import sandbox data to fund accounts (100% OBP-API v5.1.0 compliant)
   * 
   * Official specification: https://github.com/OpenBankProject/OBP-API/wiki/Sandbox-data-import
   * 
   * This is the proper way to add balances to zero-balance accounts in development.
   * The payload follows the official OBP-API v5.1.0 four-section format:
   * - banks: Define bank entities  
   * - users: Define user entities
   * - accounts: Define accounts with proper field names and data types
   * - transactions: Define transactions with proper nesting in details object
   */
  async importSandboxData(userId?: string): Promise<BankingApiResponse<unknown>> {
    console.log(`📦 Importing sandbox data to fund accounts for user: ${userId || 'unknown'} (OBP-API compliant)...`);
    
    try {
      // First check if we can authenticate with OBP-API
      const authCheck = await this.ensureValidToken();
      if (!authCheck) {
        console.log('⚠️ OBP-API authentication failed, using internal funding mechanism...');
        return this.fallbackInternalFunding(userId);
      }
      // 100% OBP-API v5.1.0 compliant sandbox data payload
      // Official format: https://github.com/OpenBankProject/OBP-API/wiki/Sandbox-data-import
      const sandboxData = {
        // Required: Banks section - Define bank entities
        banks: [
          {
            id: 'EURBANK',
            short_name: 'EUR Bank',
            full_name: 'European Test Bank Limited',
            logo: '',
            website: 'https://eurbank.example.com'
          },
          {
            id: 'HNLBANK', 
            short_name: 'HNL Bank',
            full_name: 'Honduras Test Bank Limited',
            logo: '',
            website: 'https://hnlbank.example.com'
          }
        ],

        // Required: Users section - Define user entities
        users: [
          {
            email: 'testuser@eurbank.com',
            password: 'TestPass123!',
            display_name: 'Test User EUR'
          },
          {
            email: 'testuser@hnlbank.com', 
            password: 'TestPass123!',
            display_name: 'Test User HNL'
          }
        ],

        // Required: Accounts section - Official OBP format
        accounts: [
          {
            id: 'funded-eur-account-1',
            bank: 'EURBANK',
            number: '1000041812345678',
            balance: '1000.00', // Simple string as required
            owners: ['testuser@eurbank.com'], // Reference users section
            generate_public_view: true
          },
          {
            id: 'funded-hnl-account-1', 
            bank: 'HNLBANK',
            number: '2500012345678901',
            balance: '25000.00', // Simple string as required
            owners: ['testuser@hnlbank.com'], // Reference users section
            generate_public_view: true
          }
        ],

        // Required: Transactions section - Official OBP format
        transactions: [
          {
            id: 'txn-eur-initial-funding',
            this_account: 'funded-eur-account-1', // Reference accounts section
            details: {
              new_balance: '1000.00', // Simple string as required
              value: '1000.00' // Simple string as required
            }
          },
          {
            id: 'txn-hnl-initial-funding',
            this_account: 'funded-hnl-account-1', // Reference accounts section
            details: {
              new_balance: '25000.00', // Simple string as required
              value: '25000.00' // Simple string as required
            }
          }
        ]
      };

      const result = await this.makeRequest<unknown>(
        '/obp/v5.1.0/sandbox/data-import',
        {
          method: 'POST',
          body: JSON.stringify(sandboxData)
        }
      );

      if (result.success) {
        console.log('✅ OBP-API v5.1.0 compliant sandbox data imported successfully');
        return {
          success: true,
          data: {
            message: 'OBP-API v5.1.0 compliant sandbox data imported successfully',
            format: 'Official OBP-API v5.1.0 specification',
            imported_entities: {
              banks: sandboxData.banks.length,
              users: sandboxData.users.length,
              accounts: sandboxData.accounts.length,
              transactions: sandboxData.transactions.length
            },
            funded_accounts: [
              'EURBANK: 1000.00 EUR (Account: funded-eur-account-1)',
              'HNLBANK: 25000.00 HNL (Account: funded-hnl-account-1)'
            ],
            compliance_status: '100% OBP-API v5.1.0 compliant'
          },
          statusCode: 200
        };
      }

      throw new Error('Failed to import sandbox data');
    } catch (error) {
      console.error('❌ Sandbox data import failed:', error);
      return {
        success: false,
        error: { 
          error: 'OBP-SANDBOX-001', 
          error_description: `Sandbox import failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
        statusCode: 500
      };
    }
  }

  /**
   * Fallback internal funding when OBP-API is unavailable (Development only)
   */
  private async fallbackInternalFunding(userId?: string): Promise<BankingApiResponse<unknown>> {
    const { masterAccountBanking } = await import('./master-account-banking.js');
    
    console.log('🔄 Using internal funding mechanism as OBP-API fallback...');
    
    try {
      // Use the passed userId or throw error if not provided
      if (!userId) {
        throw new Error('User ID is required for internal funding mechanism');
      }
      
      console.log(`💰 Funding EUR account for authenticated user: ${userId}`);
      
      // Fund EUR account with 1000 EUR for the correct user
      const eurFunding = await masterAccountBanking.fundAccountForTesting(userId, 'EUR', 1000);
      console.log('✅ EUR account funded:', eurFunding.referenceNumber);
      
      return {
        success: true,
        data: {
          message: 'Internal funding completed (OBP-API unavailable)',
          method: 'INTERNAL_FUNDING',
          total_accounts: 1,
          funded_accounts: ['EUR: 1000.00'],
          note: 'This is a development fallback when OBP-API authentication fails'
        },
        statusCode: 200
      };
    } catch (error) {
      console.error('❌ Internal funding failed:', error);
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
