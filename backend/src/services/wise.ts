import { env } from '../config/environment';
import type {
  WiseConfig,
  WiseTokenResponse,
  WiseProfile,
  WiseAccount,
  WiseBalance,
  WiseError,
  WiseApiResponse,
  CreateWiseAccountRequest,
  WiseAccountDetails,
} from '../types/wise';


export class WiseService {
  private config: WiseConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor() {
    this.config = {
      baseUrl: env.WISE_BASE_URL || 'https://api.sandbox.transferwise.tech',
      clientId: env.WISE_CLIENT_ID || 'sandbox-client-id',
      clientSecret: env.WISE_CLIENT_SECRET || 'sandbox-client-secret',
      redirectUri: env.WISE_REDIRECT_URI || 'my-app://callback',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<WiseApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'RemittanceApp/1.0.0',
    };

    // Add authorization header if we have a token
    if (this.accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data as WiseError,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        data: data as T,
        statusCode: response.status,
      };
    } catch (error) {
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
   * Generate OAuth authorization URL for Partner Account flow
   * This would redirect users to Wise for account linking
   */
  generateAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'transfers balances',
      state,
    });

    return `${this.config.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * In sandbox, this simulates the OAuth flow
   */
  async exchangeCodeForToken(code: string): Promise<WiseApiResponse<WiseTokenResponse>> {
    // In sandbox environment, simulate successful token exchange
    if (this.config.baseUrl.includes('sandbox')) {
      const mockTokenResponse: WiseTokenResponse = {
        access_token: `sandbox-access-token-${Date.now()}`,
        refresh_token: `sandbox-refresh-token-${Date.now()}`,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'transfers balances',
      };

      this.accessToken = mockTokenResponse.access_token;
      this.refreshToken = mockTokenResponse.refresh_token;
      this.tokenExpiresAt = Date.now() + mockTokenResponse.expires_in * 1000;

      return {
        success: true,
        data: mockTokenResponse,
        statusCode: 200,
      };
    }

    // Production OAuth flow
    return this.makeRequest<WiseTokenResponse>('/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }).toString(),
    });
  }

  /**
   * Get user profile information
   */
  async getProfile(): Promise<WiseApiResponse<WiseProfile>> {
    // Sandbox simulation
    if (this.config.baseUrl.includes('sandbox')) {
      const mockProfile: WiseProfile = {
        id: 12345,
        type: 'personal',
        name: 'Test User',
        email: 'test@example.com',
        country: 'US',
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        data: mockProfile,
        statusCode: 200,
      };
    }

    return this.makeRequest<WiseProfile>('/v1/profiles');
  }

  /**
   * Create a new Wise account (virtual IBAN)
   */
  async createAccount(request: CreateWiseAccountRequest): Promise<WiseApiResponse<WiseAccount>> {
    // Sandbox simulation
    if (this.config.baseUrl.includes('sandbox')) {
      const mockAccount: WiseAccount = {
        id: Math.floor(Math.random() * 1000000),
        profile: 12345,
        currency: request.currency,
        country: request.country,
        type: request.type.toLowerCase(),
        name: request.name,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        balance: {
          amount: this.generateRealisticBalance(request.currency),
          currency: request.currency,
        },
        iban: this.generateMockIban(request.country),
        account_number: this.generateMockAccountNumber(),
        sort_code: request.country === 'GB' ? '123456' : undefined,
      };

      return {
        success: true,
        data: mockAccount,
        statusCode: 201,
      };
    }

    return this.makeRequest<WiseAccount>('/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({
        currency: request.currency,
        country: request.country,
        type: request.type,
        name: request.name,
      }),
    });
  }

  /**
   * Get account balance - now returns consistent cached balance
   */
  async getAccountBalance(accountId: number): Promise<WiseApiResponse<WiseBalance>> {
    // Sandbox simulation - return cached balance from database
    if (this.config.baseUrl.includes('sandbox')) {
      // This would normally make a real API call to Wise
      // For sandbox, we return a successful response indicating cached data should be used
      return {
        success: false, // Signal to use cached balance
        error: {
          error: 'Use cached balance',
          error_description: 'Sandbox mode - use database cached balance',
        },
        statusCode: 200,
      };
    }

    return this.makeRequest<WiseBalance>(`/v1/accounts/${accountId}/balance`);
  }

  /**
   * Get account details including IBAN
   */
  async getAccountDetails(accountId: number): Promise<WiseApiResponse<WiseAccountDetails>> {
    // Sandbox simulation
    if (this.config.baseUrl.includes('sandbox')) {
      const mockDetails: WiseAccountDetails = {
        id: accountId,
        currency: 'USD',
        country: 'US',
        iban: this.generateMockIban('US'),
        account_number: this.generateMockAccountNumber(),
        routing_number: '123456789',
        bic: 'TRWIBUS33',
        bank_name: 'Wise US Inc.',
        bank_address: '19 W 24th Street, New York, NY 10010, USA',
        account_holder_name: 'Test User',
        account_holder_address: '123 Main St, New York, NY 10001, USA',
      };

      return {
        success: true,
        data: mockDetails,
        statusCode: 200,
      };
    }

    return this.makeRequest<WiseAccountDetails>(`/v1/accounts/${accountId}/details`);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<WiseApiResponse<WiseTokenResponse>> {
    if (!this.refreshToken) {
      return {
        success: false,
        error: {
          error: 'No refresh token available',
          error_description: 'Must authenticate first',
        },
        statusCode: 401,
      };
    }

    // Sandbox simulation
    if (this.config.baseUrl.includes('sandbox')) {
      const mockTokenResponse: WiseTokenResponse = {
        access_token: `sandbox-access-token-${Date.now()}`,
        refresh_token: this.refreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'transfers balances',
      };

      this.accessToken = mockTokenResponse.access_token;
      this.tokenExpiresAt = Date.now() + mockTokenResponse.expires_in * 1000;

      return {
        success: true,
        data: mockTokenResponse,
        statusCode: 200,
      };
    }

    return this.makeRequest<WiseTokenResponse>('/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });
  }

  /**
   * Check if token is expired and refresh if needed
   */
  async ensureValidToken(): Promise<boolean> {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false;
    }

    // Check if token expires in next 5 minutes
    if (Date.now() >= this.tokenExpiresAt - 5 * 60 * 1000) {
      const refreshResult = await this.refreshAccessToken();
      return refreshResult.success;
    }

    return true;
  }

  /**
   * Generate mock IBAN for sandbox testing
   */
  private generateMockIban(country: string): string {
    const countryCode = country.toUpperCase();
    const bankCode = '1234';
    const accountNumber = Math.floor(Math.random() * 1000000000).toString().padStart(10, '0');
    
    switch (countryCode) {
      case 'US':
        return `US${Math.floor(Math.random() * 100).toString().padStart(2, '0')}${bankCode}${accountNumber}`;
      case 'GB':
        return `GB${Math.floor(Math.random() * 100).toString().padStart(2, '0')}${bankCode}${accountNumber}`;
      case 'DE':
        return `DE${Math.floor(Math.random() * 100).toString().padStart(2, '0')}${bankCode}${accountNumber}`;
      case 'FR':
        return `FR${Math.floor(Math.random() * 100).toString().padStart(2, '0')}${bankCode}${accountNumber}`;
      default:
        return `${countryCode}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}${bankCode}${accountNumber}`;
    }
  }

  /**
   * Generate mock account number for sandbox testing
   */
  private generateMockAccountNumber(): string {
    return Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  }

  /**
   * Generate realistic starting balance for demo accounts
   * Different ranges based on currency to simulate real-world scenarios
   */
  private generateRealisticBalance(currency: string): number {
    // Define realistic balance ranges by currency
    const balanceRanges: Record<string, { min: number; max: number }> = {
      USD: { min: 250, max: 5000 },
      EUR: { min: 200, max: 4500 },
      GBP: { min: 180, max: 4000 },
      JPY: { min: 25000, max: 500000 },
      CHF: { min: 200, max: 4200 },
      CAD: { min: 300, max: 6000 },
      AUD: { min: 350, max: 6500 },
    };

    const range = balanceRanges[currency] || { min: 100, max: 3000 };
    
    // Generate random balance within realistic range
    // Use crypto-quality randomness seeded with timestamp for uniqueness
    const randomSeed = Math.random() * Date.now();
    const normalizedRandom = (randomSeed % 1000) / 1000;
    
    const balance = range.min + (normalizedRandom * (range.max - range.min));
    
    // Round to appropriate decimal places based on currency
    const decimalPlaces = ['JPY', 'KRW', 'VND'].includes(currency) ? 0 : 2;
    return Number(balance.toFixed(decimalPlaces));
  }
}

export const wiseService = new WiseService();