export interface WiseAccount {
  id: string;
  currency: string;
  country: string;
  type: string;
  name: string;
  status: string;
  iban?: string;
  accountNumber?: string;
  sortCode?: string;
  routingNumber?: string;
  bic?: string;
  bankName?: string;
  balance?: number;
  balanceUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WiseBalance {
  amount: number;
  currency: string;
  reservedAmount?: number;
  totalAmount?: number;
  updatedAt: string;
  cached: boolean;
}

export interface WiseTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  targetAmount?: number;
  targetCurrency?: string;
  fee?: number;
  reference?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateWiseAccountRequest {
  currency: string;
  country: string;
  type: 'SAVINGS' | 'CHECKING';
  name: string;
}

export interface WiseAuthResponse {
  authUrl: string;
  state: string;
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

export interface WiseError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}