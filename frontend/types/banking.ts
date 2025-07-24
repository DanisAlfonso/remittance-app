/**
 * Banking Types - OBP-API Integration
 * Modern banking interfaces for Open Bank Project integration
 */

export interface BankAccount {
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
  bankAddress?: string;
  balance?: number;
  balanceUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalance {
  amount: number;
  currency: string;
  reservedAmount?: number;
  totalAmount?: number;
  updatedAt: string;
  cached: boolean;
}

export interface BankTransaction {
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

export interface CreateBankAccountRequest {
  currency: string;
  country: string;
  type: 'SAVINGS' | 'CHECKING';
  name: string;
}

export interface BankingError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Banking service responses
export interface CreateAccountResponse {
  account: BankAccount;
}

export interface GetAccountsResponse {
  accounts: BankAccount[];
}

export interface GetBalanceResponse {
  balance: AccountBalance;
}

export interface GetAccountDetailsResponse {
  account: BankAccount & { recentTransactions: BankTransaction[] };
}

// Authentication response interface
export interface AuthResponse {
  authUrl: string;
  state: string;
}

export interface BankProfile {
  id: number;
  type: string;
  name: string;
  email: string;
  country: string;
  currency: string;
  created_at: string;
  updated_at: string;
}