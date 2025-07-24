import { apiClient } from './api';
import type { 
  BankAccount, 
  CreateBankAccountRequest,
  CreateAccountResponse,
  GetAccountsResponse,
  GetBalanceResponse,
  GetAccountDetailsResponse
} from '../types/banking';

/**
 * Banking Service - OBP-API Integration
 * Provides banking functionality through Open Bank Project API
 * Includes utility functions for account management and data formatting
 */
export class BankingService {
  /**
   * Create a new bank account via OBP-API (NEW BANKING API)
   */
  async createAccount(request: CreateBankAccountRequest): Promise<CreateAccountResponse> {
    const response = await apiClient.post<CreateAccountResponse>('/banking/accounts', request);
    return response;
  }

  /**
   * Get all user's bank accounts (NEW BANKING API)
   */
  async getAccounts(): Promise<GetAccountsResponse> {
    const response = await apiClient.get<GetAccountsResponse>('/banking/accounts');
    return response;
  }

  /**
   * Get account balance (NEW BANKING API)
   */
  async getAccountBalance(accountId: string): Promise<GetBalanceResponse> {
    const response = await apiClient.get<GetBalanceResponse>(`/banking/accounts/${accountId}/balance`);
    return response;
  }

  /**
   * Get detailed account information (NEW BANKING API)
   */
  async getAccountDetails(accountId: string): Promise<GetAccountDetailsResponse> {
    const response = await apiClient.get<GetAccountDetailsResponse>(`/banking/accounts/${accountId}`);
    return response;
  }


  /**
   * Format account number for display
   */
  formatAccountNumber(account: BankAccount): string {
    if (account.iban) {
      return this.formatIban(account.iban);
    }
    
    if (account.accountNumber) {
      return account.accountNumber;
    }
    
    return 'N/A';
  }

  /**
   * Format IBAN for display (show first 4 and last 4 characters)
   */
  formatIban(iban: string): string {
    if (iban.length <= 8) {
      return iban;
    }
    
    const start = iban.substring(0, 4);
    const end = iban.substring(iban.length - 4);
    const masked = '*'.repeat(iban.length - 8);
    
    return `${start}${masked}${end}`;
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
   * Get currency symbol
   */
  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CHF: 'Fr',
      CNY: '¥',
      SEK: 'kr',
      NZD: 'NZ$',
    };
    
    return symbols[currency] || currency;
  }

  /**
   * Get account type display name
   */
  getAccountTypeDisplayName(type: string): string {
    if (!type || typeof type !== 'string') {
      return 'Multi-Currency Account';
    }
    switch (type.toUpperCase()) {
      case 'SAVINGS':
        return 'Savings Account';
      case 'CHECKING':
        return 'Checking Account';
      case 'MULTI_CURRENCY':
      case 'MULTICURRENCY':
        return 'Multi-Currency Account';
      case 'PERSONAL':
        return 'Personal Account';
      case 'BUSINESS':
        return 'Business Account';
      default:
        return 'Multi-Currency Account';
    }
  }

  /**
   * Extract country code from IBAN
   */
  getCountryFromIban(iban: string): string {
    if (!iban || iban.length < 2) {
      return '';
    }
    return iban.substring(0, 2).toUpperCase();
  }

  /**
   * Get country name from country code
   * Focused on specific European markets + Honduras (for remittances)
   */
  getCountryName(countryCode: string): string {
    const countries: Record<string, string> = {
      // Primary European markets
      'BE': 'Belgium',
      'DE': 'Germany', 
      'EE': 'Estonia',
      'ES': 'Spain',
      'FR': 'France',
      
      // Central America - Main remittance destination
      'HN': 'Honduras'
    };
    
    return countries[countryCode.toUpperCase()] || countryCode;
  }

  /**
   * Get account status color
   */
  getAccountStatusColor(status: string): string {
    if (!status || typeof status !== 'string') {
      return '#6c757d';
    }
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return '#28a745';
      case 'PENDING':
        return '#ffc107';
      case 'SUSPENDED':
        return '#dc3545';
      case 'CLOSED':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  }

  /**
   * Get transaction status color
   */
  getTransactionStatusColor(status: string): string {
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
      case 'FAILED':
        return '#dc3545';
      case 'CANCELLED':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  }

  /**
   * Validate currency code
   */
  isValidCurrency(currency: string): boolean {
    if (!currency || typeof currency !== 'string') {
      return false;
    }
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'SEK', 'NZD'
    ];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Validate country code
   */
  isValidCountry(country: string): boolean {
    if (!country || typeof country !== 'string') {
      return false;
    }
    const validCountries = [
      'US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP', 'CH', 'CN', 'SE', 'NZ'
    ];
    return validCountries.includes(country.toUpperCase());
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    ];
  }

  /**
   * Get supported countries
   */
  getSupportedCountries(): Array<{ code: string; name: string }> {
    return [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
      { code: 'JP', name: 'Japan' },
      { code: 'CH', name: 'Switzerland' },
      { code: 'CN', name: 'China' },
      { code: 'SE', name: 'Sweden' },
      { code: 'NZ', name: 'New Zealand' },
    ];
  }
}

export const bankingService = new BankingService();