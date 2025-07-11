export interface WiseConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface WiseTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface WiseProfile {
  id: number;
  type: string;
  name: string;
  email: string;
  country: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WiseAccount {
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
}

export interface WiseBalance {
  id: number;
  currency: string;
  amount: number;
  reserved_amount: number;
  available_amount: number;
  created_at: string;
  updated_at: string;
}

export interface WiseWebhookEvent {
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

export interface WiseError {
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

export interface WiseApiResponse<T> {
  success: boolean;
  data?: T;
  error?: WiseError;
  statusCode: number;
}

export interface CreateWiseAccountRequest {
  userId: string;
  currency: string;
  country: string;
  type: 'SAVINGS' | 'CHECKING';
  name: string;
}

export interface WiseAccountDetails {
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