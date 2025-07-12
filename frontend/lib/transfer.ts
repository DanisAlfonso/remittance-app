import { apiClient } from './api';
import type { 
  TransferQuote, 
  Transfer, 
  CreateTransferRequest, 
  ExchangeRate 
} from '../types/transfer';

export class TransferService {
  /**
   * Get a transfer quote
   */
  async getQuote(
    sourceAccountId: string,
    targetCurrency: string,
    targetCountry: string,
    amount: number,
    sourceCurrency: string,
    type: 'BALANCE_PAYOUT' | 'BANK_TRANSFER' = 'BANK_TRANSFER'
  ): Promise<{ quote: TransferQuote }> {
    const response = await apiClient.post<{ quote: TransferQuote }>('/transfer/quote', {
      sourceAccountId,
      targetCurrency,
      targetCountry,
      amount,
      sourceCurrency,
      type,
    });
    return response;
  }

  /**
   * Create a transfer
   */
  async createTransfer(request: CreateTransferRequest): Promise<{ transfer: Transfer }> {
    const response = await apiClient.post<{ transfer: Transfer }>('/transfer/create', request);
    return response;
  }

  /**
   * Create a simple transfer with amount (uses the new endpoint)
   */
  async createSimpleTransfer(transferData: {
    recipientAccount: {
      accountNumber: string;
      sortCode?: string;
      currency: string;
      country: string;
    };
    recipientDetails: {
      firstName: string;
      lastName: string;
      email: string;
    };
    transferDetails: {
      amount: number;
      currency: string;
      reference?: string;
    };
  }): Promise<{ transfer: Transfer }> {
    const response = await apiClient.post<{ transfer: Transfer }>('/wise/transfers', transferData);
    return response;
  }

  /**
   * Get transfer by ID
   */
  async getTransfer(transferId: string): Promise<{ transfer: Transfer }> {
    const response = await apiClient.get<{ transfer: Transfer }>(`/transfer/${transferId}`);
    return response;
  }

  /**
   * Get transfer history
   */
  async getTransferHistory(limit = 20, offset = 0): Promise<{ 
    transfers: Transfer[]; 
    pagination: { limit: number; offset: number; total: number } 
  }> {
    const response = await apiClient.get<{ 
      transfers: Transfer[]; 
      pagination: { limit: number; offset: number; total: number } 
    }>(`/wise/transfers?limit=${limit}&offset=${offset}`);
    return response;
  }

  /**
   * Simulate transfer status change (sandbox development)
   */
  async simulateTransferStatus(transferId: string, status: string): Promise<{
    message: string;
    transferId: string;
    newStatus: string;
    wiseStatus: string;
    timestamp: string;
  }> {
    const response = await apiClient.post<{
      message: string;
      transferId: string;
      newStatus: string;
      wiseStatus: string;
      timestamp: string;
    }>(`/wise/transfers/${transferId}/simulate-status`, { status });
    return response;
  }

  /**
   * Get exchange rate for currency pair
   */
  async getExchangeRate(source: string, target: string): Promise<{ rate: ExchangeRate }> {
    const response = await apiClient.get<{ rate: ExchangeRate }>(`/transfer/rates/${source}/${target}`);
    return response;
  }

  /**
   * Format currency amount
   */
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format exchange rate
   */
  formatExchangeRate(rate: number, sourceCurrency: string, targetCurrency: string): string {
    return `1 ${sourceCurrency} = ${rate.toFixed(4)} ${targetCurrency}`;
  }

  /**
   * Calculate arrival time
   */
  formatProcessingTime(processingTime: string): string {
    return processingTime;
  }

  /**
   * Get transfer status color
   */
  getStatusColor(status: string): string {
    if (!status || typeof status !== 'string') {
      return '#6c757d';
    }
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return '#28a745';
      case 'PENDING':
        return '#ffc107';
      case 'PROCESSING':
        return '#17a2b8';
      case 'SENT':
        return '#007bff';
      case 'FAILED':
        return '#dc3545';
      case 'CANCELLED':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  }

  /**
   * Get transfer status icon
   */
  getStatusIcon(status: string): string {
    if (!status || typeof status !== 'string') {
      return '📄';
    }
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return '✅';
      case 'PENDING':
        return '⏳';
      case 'PROCESSING':
        return '🔄';
      case 'SENT':
        return '📤';
      case 'FAILED':
        return '❌';
      case 'CANCELLED':
        return '🚫';
      default:
        return '📄';
    }
  }

  /**
   * Validate transfer amount
   */
  validateAmount(amount: number, balance: number): { isValid: boolean; error?: string } {
    if (amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }
    
    if (amount > balance) {
      return { isValid: false, error: 'Insufficient balance' };
    }
    
    if (amount > 10000) {
      return { isValid: false, error: 'Amount exceeds daily limit' };
    }
    
    return { isValid: true };
  }

  /**
   * Validate IBAN
   */
  validateIban(iban: string): { isValid: boolean; error?: string } {
    if (!iban || typeof iban !== 'string') {
      return { isValid: false, error: 'IBAN is required' };
    }
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return { isValid: false, error: 'IBAN must be between 15-34 characters' };
    }
    
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
      return { isValid: false, error: 'Invalid IBAN format' };
    }
    
    return { isValid: true };
  }
}

export const transferService = new TransferService();