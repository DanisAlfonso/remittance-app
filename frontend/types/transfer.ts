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

export interface Transfer {
  id: string;
  sourceAccountId: string;
  targetAccountId?: string;
  quoteId: string;
  status: {
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'RECEIVED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    message: string;
    timestamp: string;
  };
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  fee: number;
  reference?: string;
  description?: string;
  metadata?: string;
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

export interface CreateTransferRequest {
  quoteId: string;
  targetAccountId?: string;
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

export interface ExchangeRate {
  source: string;
  target: string;
  rate: number;
  timestamp: string;
  type: 'MID_MARKET' | 'CUSTOMER';
}