/**
 * Banking Service - Pure Banking Operations
 * 
 * This service provides banking functionality using only proper banking terminology.
 * No legacy terminology or references.
 */

import { PrismaClient, BankAccount } from '../generated/prisma';
import type { 
  BankingApiResponse, 
  BankAccountDetails, 
  CreateBankAccountRequest 
} from '../types/banking';

const prisma = new PrismaClient();

export class BankingService {
  /**
   * Create a new bank account
   */
  async createAccount(request: CreateBankAccountRequest & { userId: string }): Promise<BankingApiResponse<BankAccount>> {
    try {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          userId: request.userId,
          bankAccountId: Math.floor(Math.random() * 1000000), // Temp ID for demo
          bankProfileId: Math.floor(Math.random() * 1000), // Temp profile ID
          currency: request.currency,
          country: request.country,
          accountType: request.type,
          name: request.name,
          status: 'ACTIVE',
          // Set some default values for demo
          iban: this.generateIban(request.country),
          bic: 'ENHBK1XXXX',
          bankName: 'Enhanced Test Bank Limited',
          lastBalance: 0,
          balanceUpdatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: bankAccount,
        statusCode: 201,
      };
    } catch (error) {
      console.error('Banking service createAccount error:', error);
      return {
        success: false,
        error: {
          error: 'ACCOUNT_CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create account',
        },
        statusCode: 500,
      };
    }
  }

  /**
   * Get all user's bank accounts
   */
  async getAccounts(userId: string): Promise<BankingApiResponse<{ accounts: BankAccount[] }>> {
    try {
      const accounts = await prisma.bankAccount.findMany({
        where: { userId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: { accounts },
        statusCode: 200,
      };
    } catch (error) {
      console.error('Banking service getAccounts error:', error);
      return {
        success: false,
        error: {
          error: 'ACCOUNTS_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch accounts',
        },
        statusCode: 500,
      };
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<BankingApiResponse<{ amount: { value: number }; availableAmount: { value: number }; reservedAmount: { value: number }; currency: string }>> {
    try {
      const account = await prisma.bankAccount.findFirst({
        where: { id: accountId, status: 'ACTIVE' },
      });

      if (!account) {
        return {
          success: false,
          error: {
            error: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
          statusCode: 404,
        };
      }

      return {
        success: true,
        data: {
          amount: { value: parseFloat(account.lastBalance?.toString() || '0') },
          availableAmount: { value: parseFloat(account.lastBalance?.toString() || '0') },
          reservedAmount: { value: 0 },
          currency: account.currency,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error('Banking service getAccountBalance error:', error);
      return {
        success: false,
        error: {
          error: 'BALANCE_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch balance',
        },
        statusCode: 500,
      };
    }
  }

  /**
   * Get account details
   */
  async getAccountDetails(bankId: string, accountId: string): Promise<BankingApiResponse<BankAccountDetails>> {
    try {
      const account = await prisma.bankAccount.findFirst({
        where: { id: accountId, status: 'ACTIVE' },
      });

      if (!account) {
        return {
          success: false,
          error: {
            error: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
          statusCode: 404,
        };
      }

      return {
        success: true,
        data: {
          id: account.bankAccountId,
          currency: account.currency,
          country: account.country,
          iban: account.iban || undefined,
          account_number: account.accountNumber || undefined,
          sort_code: account.sortCode || undefined,
          routing_number: account.routingNumber || undefined,
          bic: account.bic || undefined,
          bank_name: account.bankName || undefined,
          bank_address: account.bankAddress || undefined,
          account_holder_name: account.name,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error('Banking service getAccountDetails error:', error);
      return {
        success: false,
        error: {
          error: 'ACCOUNT_DETAILS_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch account details',
        },
        statusCode: 500,
      };
    }
  }

  /**
   * Generate a sample IBAN for demo purposes
   */
  private generateIban(country: string): string {
    const countryCode = country.toUpperCase();
    const checkDigits = '00'; // Simplified for demo
    const bankCode = 'ENHB'; // Enhanced Bank
    const accountNumber = Math.random().toString().slice(2, 12).padStart(10, '0');
    
    switch (countryCode) {
      case 'ES': // Spain
        return `ES${checkDigits}${bankCode}${accountNumber}`;
      case 'DE': // Germany
        return `DE${checkDigits}${bankCode}00${accountNumber}`;
      case 'FR': // France
        return `FR${checkDigits}${bankCode}0000${accountNumber}`;
      default:
        return `${countryCode}${checkDigits}${bankCode}${accountNumber}`;
    }
  }
}

// Export default instance
export const bankingService = new BankingService();

// Export class for custom configurations
export default BankingService;