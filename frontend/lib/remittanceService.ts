/**
 * Remittance Service
 * 
 * Frontend service for EUR → HNL remittance operations
 */

import { apiClient } from './api';
import type { ApiError } from '../types';

export interface RemittanceRequest {
  recipientAccountId: string;
  amountEUR: number;
  description?: string;
  recipientName?: string;
}

export interface RemittanceResult {
  success: boolean;
  data?: {
    transactionId: string;
    amountEUR: number;
    amountHNL: number;
    exchangeRate: number;
    fees: {
      platformFee: number;
      exchangeMargin: number;
      totalFee: number;
    };
    masterAccountImpact?: {
      eurMasterDebit: number;
      hnlMasterDebit: number;
      eurMasterNewBalance?: number;
      hnlMasterNewBalance?: number;
    };
    timeline?: {
      initiated: string;
      eurProcessed?: string;
      hnlProcessed?: string;
      completed?: string;
    };
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface ExchangeRateResult {
  success: boolean;
  data?: {
    amount: number;
    currency: string;
    targetAmount: number;
    targetCurrency: string;
    interBankRate: number;
    customerRate: number;
    fees: {
      platformFee: number;
      exchangeMargin: number;
      totalFee: number;
    };
    totalEURDeducted: number;
    source: string;
    timestamp: number;
  };
  error?: {
    message: string;
    details?: unknown;
  };
}

export interface HNLRecipient {
  id: string;
  name: string;
  accountNumber: string;
  accountId: string;
  bankName: string;
  currency: string;
  country: string;
  iban?: string;
}

class RemittanceService {
  /**
   * Execute EUR → HNL remittance transfer
   */
  async executeRemittance(request: RemittanceRequest): Promise<RemittanceResult> {
    try {
      if (__DEV__) console.log('🌟 [REMITTANCE] Executing EUR → HNL transfer:', request);
      
      const response = await apiClient.post<{
        success: boolean;
        data?: RemittanceResult['data'];
        error?: string;
        code?: string;
        details?: unknown;
      }>('/remittance/send', request);

      if (response.success && response.data) {
        console.log('✅ [REMITTANCE] Transfer successful:', response.data.transactionId);
        return {
          success: true,
          data: response.data
        };
      } else {
        console.error('❌ [REMITTANCE] Transfer failed:', response.error);
        return {
          success: false,
          error: {
            message: response.error || 'Remittance failed',
            code: response.code,
            details: response.details
          }
        };
      }
    } catch (error) {
      console.error('❌ [REMITTANCE] API call failed:', error);
      
      if (error && typeof error === 'object' && 'message' in error) {
        const apiError = error as ApiError;
        return {
          success: false,
          error: {
            message: apiError.message || 'Network error occurred',
            code: apiError.error,
            details: apiError.details
          }
        };
      }

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }

  /**
   * Get EUR → HNL exchange rate with fees
   */
  async getExchangeRate(amountEUR: number): Promise<ExchangeRateResult> {
    try {
      if (__DEV__) console.log('💱 [REMITTANCE] Getting EUR/HNL exchange rate for:', amountEUR);
      
      const response = await apiClient.get<{
        success: boolean;
        data?: ExchangeRateResult['data'];
        error?: string;
        details?: unknown;
      }>(`/remittance/exchange-rate?amount=${amountEUR}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('✅ [REMITTANCE] Exchange rate:', response.data.customerRate, 'HNL/EUR');
        return {
          success: true,
          data: response.data
        };
      } else {
        if (__DEV__) console.error('❌ [REMITTANCE] Exchange rate failed:', response.error);
        return {
          success: false,
          error: {
            message: response.error || 'Failed to get exchange rate',
            details: response.details
          }
        };
      }
    } catch (error) {
      console.error('❌ [REMITTANCE] Exchange rate API call failed:', error);
      
      if (error && typeof error === 'object' && 'message' in error) {
        const apiError = error as ApiError;
        return {
          success: false,
          error: {
            message: apiError.message || 'Network error occurred',
            details: apiError.details
          }
        };
      }

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }

  /**
   * Get HNL recipients from HNLBANK (Juan, María, Carlos with funded accounts)
   */
  async getHNLRecipients(): Promise<{ success: boolean; recipients: HNLRecipient[]; error?: string }> {
    try {
      if (__DEV__) console.log('👥 [REMITTANCE] Loading HNL recipients...');
      
      // Return the HNLBANK recipients (where accounts have actual funds)
      // These match the backend configuration that sends to HNLBANK
      const recipients: HNLRecipient[] = [
        {
          id: '4d21f8a9-f820-442d-8f2d-0d672b814a4c',
          name: 'Juan Pérez',
          accountNumber: '421898204428206740000',
          accountId: '4d21f8a9-f820-442d-8f2d-0d672b814a4c',
          bankName: 'Banco Atlántida',
          currency: 'HNL',
          country: 'HN',
          iban: 'HN1312345678904913010474'
        },
        {
          id: '7237c7a3-8318-474a-bb68-d6a173add54e',
          name: 'María López',
          accountNumber: '723773831847468600000',
          accountId: '7237c7a3-8318-474a-bb68-d6a173add54e',
          bankName: 'Banco Atlántida',
          currency: 'HNL',
          country: 'HN',
          iban: 'HN2212345678904346120688'
        },
        {
          id: '30c38721-7d35-4a6f-8cd9-7faa5c2cbb04',
          name: 'Carlos Mendoza',
          accountNumber: '3038721735468975000',
          accountId: '30c38721-7d35-4a6f-8cd9-7faa5c2cbb04',
          bankName: 'Banco Atlántida',
          currency: 'HNL',
          country: 'HN',
          iban: 'HN3812345678909996510856'
        }
      ];

      if (__DEV__) console.log('✅ [REMITTANCE] Loaded', recipients.length, 'HNL recipients');
      return {
        success: true,
        recipients
      };
    } catch (error) {
      console.error('❌ [REMITTANCE] Failed to load HNL recipients:', error);
      return {
        success: false,
        recipients: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get remittance transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{
    success: boolean;
    transaction?: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      targetAmount?: number;
      targetCurrency?: string;
      exchangeRate?: number;
      fees?: {
        platformFee: number;
        totalFee: number;
      };
      createdAt: string;
      completedAt?: string;
      metadata?: Record<string, unknown>;
    };
    error?: string;
  }> {
    try {
      console.log('📊 [REMITTANCE] Getting transaction status:', transactionId);
      
      const response = await apiClient.get<{
        success: boolean;
        data?: {
          transaction: NonNullable<Awaited<ReturnType<RemittanceService['getTransactionStatus']>>['transaction']>;
        };
        error?: string;
      }>(`/remittance/status/${transactionId}`);

      if (response.success && response.data?.transaction) {
        console.log('✅ [REMITTANCE] Transaction status:', response.data.transaction.status);
        return {
          success: true,
          transaction: response.data.transaction
        };
      } else {
        console.error('❌ [REMITTANCE] Status check failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to get transaction status'
        };
      }
    } catch (error) {
      console.error('❌ [REMITTANCE] Status API call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const remittanceService = new RemittanceService();