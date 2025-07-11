export interface TransferQuoteRequest {
  sourceAccountId: string;
  targetCurrency: string;
  targetCountry: string;
  amount: number;
  sourceCurrency: string;
  type: 'BALANCE_PAYOUT' | 'BANK_TRANSFER';
}

export interface TransferQuote {
  id: string;
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  fee: number;
  feeCurrency: string;
  totalCost: number;
  expiresAt: string;
  processingTime: string;
  rateType: 'FIXED' | 'FLOATING';
}

export interface CreateTransferRequest {
  quoteId: string;
  targetAccountId?: string; // For internal transfers
  recipientAccount?: {
    type: 'iban' | 'sort_code' | 'routing_number';
    iban?: string;
    accountNumber?: string;
    sortCode?: string;
    routingNumber?: string;
    currency: string;
    country: string;
    holderName: string;
    bankName?: string;
  };
  reference?: string;
  description?: string;
}

export interface Transfer {
  id: string;
  sourceAccountId: string;
  targetAccountId?: string;
  quoteId: string;
  status: TransferStatus;
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  fee: number;
  reference?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  estimatedArrival?: string;
  recipient?: {
    name: string;
    iban?: string;
    accountNumber?: string;
    bankName?: string;
  };
}

export interface TransferStatus {
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'RECEIVED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  message: string;
  timestamp: string;
}

export interface ExchangeRate {
  source: string;
  target: string;
  rate: number;
  timestamp: string;
  type: 'MID_MARKET' | 'CUSTOMER';
}

export interface TransferFee {
  type: 'FIXED' | 'PERCENTAGE';
  amount: number;
  currency: string;
  description: string;
}

export interface TransferReceipt {
  transferId: string;
  sourceAccount: {
    iban: string;
    currency: string;
    amount: number;
  };
  targetAccount: {
    iban?: string;
    accountNumber?: string;
    currency: string;
    amount: number;
    holderName: string;
    bankName?: string;
  };
  exchangeRate: number;
  fee: number;
  reference?: string;
  createdAt: string;
  estimatedArrival: string;
  status: string;
}