import { apiClient } from './api';

/**
 * OBP-API Service - Pure Open Bank Project integration
 * Following the standard OBP-API patterns: /obp/v5.1.0/banks/{bank-id}/accounts
 * 
 * This completely replaces any Wise-influenced API patterns
 */
export class OBPService {
  private readonly defaultBankId = 'ENHANCEDBANK';

  /**
   * Get accounts for a specific bank using OBP-API structure
   */
  async getBankAccounts(bankId: string = this.defaultBankId): Promise<{
    accounts: Array<{
      id: string;
      bank_id: string;
      label: string;
      number: string;
      type: string;
      balance: {
        currency: string;
        amount: string;
      };
      account_routings: Array<{
        scheme: string;
        address: string;
      }>;
      account_attributes: Array<{
        name: string;
        type: string;
        value: string;
      }>;
      views_available: Array<{
        view_id: string;
        short_name: string;
        description: string;
      }>;
    }>;
  }> {
    const response = await apiClient.obpGet<{
      accounts: Array<{
        id: string;
        bank_id: string;
        label: string;
        number: string;
        type: string;
        balance: {
          currency: string;
          amount: string;
        };
        account_routings: Array<{
          scheme: string;
          address: string;
        }>;
        account_attributes: Array<{
          name: string;
          type: string;
          value: string;
        }>;
        views_available: Array<{
          view_id: string;
          short_name: string;
          description: string;
        }>;
      }>;
    }>(`/obp/v5.1.0/banks/${bankId}/accounts`);
    return response;
  }

  /**
   * Create a new account using OBP-API structure
   */
  async createBankAccount(
    bankId: string = this.defaultBankId,
    accountData: {
      user_id: string;
      label: string;
      product_code: string;
      balance: {
        currency: string;
        amount: string;
      };
    }
  ): Promise<{
    id: string;
    bank_id: string;
    label: string;
    number: string;
    type: string;
    balance: {
      currency: string;
      amount: string;
    };
    account_routings: Array<{
      scheme: string;
      address: string;
    }>;
    account_attributes: Array<{
      name: string;
      type: string;
      value: string;
    }>;
    views_available: Array<{
      view_id: string;
      short_name: string;
      description: string;
    }>;
  }> {
    const response = await apiClient.obpPost<{
      id: string;
      bank_id: string;
      label: string;
      number: string;
      type: string;
      balance: {
        currency: string;
        amount: string;
      };
      account_routings: Array<{
        scheme: string;
        address: string;
      }>;
      account_attributes: Array<{
        name: string;
        type: string;
        value: string;
      }>;
      views_available: Array<{
        view_id: string;
        short_name: string;
        description: string;
      }>;
    }>(`/obp/v5.1.0/banks/${bankId}/accounts`, accountData);
    return response;
  }

  /**
   * Import sandbox data with predefined accounts and balances (Superuser only)
   * Following OBP-API v5.1.0 sandbox data import specification
   */
  async importSandboxData(currency?: string): Promise<{
    message: string;
    data: {
      banks: Array<{
        id: string;
        short_name: string;
        full_name: string;
        accounts_imported: number;
      }>;
      total_accounts: number;
      total_transactions: number;
    };
  }> {
    const response = await apiClient.obpPost<{
      message: string;
      data: {
        banks: Array<{
          id: string;
          short_name: string;
          full_name: string;
          accounts_imported: number;
        }>;
        total_accounts: number;
        total_transactions: number;
      };
    }>('/obp/v5.1.0/sandbox/data-import', currency ? { currency } : {});
    return response;
  }

  /**
   * Create test deposit for specific account (Superuser only)
   * Following OBP-API v5.1.0 transaction creation specification
   */
  async createTestDeposit(
    bankId: string,
    accountId: string,
    amount: number,
    currency: string,
    description?: string
  ): Promise<{
    message: string;
    data: {
      transaction_id: string;
      account_id: string;
      amount: { currency: string; amount: string };
      description: string;
      posted: string;
    };
  }> {
    const response = await apiClient.obpPost<{
      message: string;
      data: {
        transaction_id: string;
        account_id: string;
        amount: { currency: string; amount: string };
        description: string;
        posted: string;
      };
    }>(`/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/test-deposit`, {
      amount,
      currency,
      description
    });
    return response;
  }

  /**
   * Get transactions for a specific account using OBP-API structure
   */
  async getAccountTransactions(
    bankId: string = this.defaultBankId,
    accountId: string
  ): Promise<{
    transactions: Array<{
      id: string;
      account: {
        id: string;
        bank_id: string;
      };
      details: {
        type: string;
        value: {
          currency: string;
          amount: string;
        };
      };
      metadata: {
        narrative: string;
        posted: string;
        completed: string;
      };
    }>;
  }> {
    const response = await apiClient.obpGet<{
      transactions: Array<{
        id: string;
        account: {
          id: string;
          bank_id: string;
        };
        details: {
          type: string;
          value: {
            currency: string;
            amount: string;
          };
        };
        metadata: {
          narrative: string;
          posted: string;
          completed: string;
        };
      }>;
    }>(`/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/transactions`);
    return response;
  }

  /**
   * Create a transaction request using OBP-API structure
   */
  async createTransactionRequest(transactionData: {
    from: {
      bank_id: string;
      account_id: string;
    };
    details: {
      to_sandbox_tan?: {
        bank_id: string;
        account_id: string;
      };
      to_sepa?: {
        iban: string;
      };
      value: {
        currency: string;
        amount: string;
      };
      description: string;
    };
    body: {
      to_sandbox_tan?: {
        bank_id: string;
        account_id: string;
      };
      to_sepa?: {
        iban: string;
      };
      value: {
        currency: string;
        amount: string;
      };
      description: string;
    };
  }): Promise<{
    id: string;
    type: string;
    from: {
      bank_id: string;
      account_id: string;
    };
    details: Record<string, unknown>;
    body: Record<string, unknown>;
    status: string;
    start_date: string;
    end_date: string;
    challenge: {
      id: string;
      user_id: string;
      allowed_attempts: number;
      challenge_type: string;
    };
  }> {
    const response = await apiClient.obpPost<{
      id: string;
      type: string;
      from: {
        bank_id: string;
        account_id: string;
      };
      details: Record<string, unknown>;
      body: Record<string, unknown>;
      status: string;
      start_date: string;
      end_date: string;
      challenge: {
        id: string;
        user_id: string;
        allowed_attempts: number;
        challenge_type: string;
      };
    }>('/obp/v5.1.0/transaction-requests', transactionData);
    return response;
  }

  /**
   * Format currency amount for OBP-API
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
   * Get account balance from OBP account data
   */
  getAccountBalance(account: {
    balance: {
      currency: string;
      amount: string;
    };
  }): number {
    return parseFloat(account.balance.amount);
  }

  /**
   * Get IBAN from account routings
   */
  getAccountIBAN(account: {
    account_routings: Array<{
      scheme: string;
      address: string;
    }>;
  }): string | undefined {
    return account.account_routings.find(routing => routing.scheme === 'IBAN')?.address;
  }

  /**
   * Get bank name from account attributes
   */
  getBankName(account: {
    account_attributes: Array<{
      name: string;
      type: string;
      value: string;
    }>;
  }): string {
    return account.account_attributes.find(attr => attr.name === 'BANK_NAME')?.value || 'Unknown Bank';
  }
}

export const obpService = new OBPService();