export interface BankingConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface BankingTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface BankingProfile {
  id: number;
  type: string;
  name: string;
  email: string;
  country: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: number;
  profile: number;
  currency: string;
  country: string;
  type: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  balance: {
    amount: number;
    currency: string;
  };
  iban?: string;
  account_number?: string;
  sort_code?: string;
  // OBP-API integration fields
  obp_bank_id?: string;
  obp_account_id?: string;
}

export interface BankBalance {
  id: number;
  currency: string;
  amount: number;
  reserved_amount: number;
  available_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BankingWebhookEvent {
  id: string;
  type: string;
  created_at: string;
  data: {
    resource: {
      id: number;
      type: string;
      profile_id: number;
      account_id?: number;
      transfer_id?: number;
    };
    current_state: string;
    previous_state?: string;
  };
}

export interface BankingError {
  error: string;
  error_description?: string;
  error_code?: string;
  path?: string;
  message?: string;
  details?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface BankingApiResponse<T> {
  success: boolean;
  data?: T;
  error?: BankingError;
  statusCode: number;
}

export interface CreateBankAccountRequest {
  userId: string;
  currency: string;
  country: string;
  type: 'SAVINGS' | 'CHECKING';
  name: string;
}

export interface BankAccountDetails {
  id: number;
  currency: string;
  country: string;
  iban?: string;
  account_number?: string;
  sort_code?: string;
  routing_number?: string;
  bic?: string;
  bank_name?: string;
  bank_address?: string;
  account_holder_name: string;
  account_holder_address?: string;
}