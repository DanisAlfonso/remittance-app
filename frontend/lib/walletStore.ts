import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { bankingService } from './bankingService';
import type { 
  BankAccount, 
  AccountBalance, 
  CreateBankAccountRequest, 
  BankingError
} from '../types/banking';

// Secure storage adapter for Zustand
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Failed to store wallet data:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Failed to remove wallet data:', error);
    }
  },
};

interface WalletState {
  accounts: BankAccount[];
  selectedAccount: BankAccount | null;
  balance: AccountBalance | null;
  accountBalances: Record<string, AccountBalance>; // Per-account balance cache
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  userId: string | null;
}

interface WalletActions {
  // Account management
  createAccount: (request: CreateBankAccountRequest) => Promise<void>;
  loadAccounts: () => Promise<void>;
  selectAccount: (accountId: string) => void;
  refreshBalance: (accountId?: string) => Promise<void>;
  updateAccountBalance: (accountId: string, newBalance: number) => void;
  getAccountBalance: (accountId: string) => AccountBalance | null;
  
  // UI state
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  setUserId: (userId: string | null) => Promise<void>;
  fetchWalletData: () => Promise<void>;
}

export const useWalletStore = create<WalletState & WalletActions>()(
  persist(
    (set, get) => ({
      // Initial state
      accounts: [],
      selectedAccount: null,
      balance: null,
      accountBalances: {},
      isLoading: false,
      error: null,
      isInitialized: false,
      userId: null,

      // Actions
      createAccount: async (request: CreateBankAccountRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await bankingService.createAccount(request);
          
          // Add new account to the list
          const { accounts } = get();
          const updatedAccounts = [...accounts, response.account];
          
          set({
            accounts: updatedAccounts,
            selectedAccount: response.account,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const bankingError = error as BankingError;
          set({
            isLoading: false,
            error: bankingError.message || 'Failed to create account',
          });
          throw error;
        }
      },

      loadAccounts: async () => {
        const { userId, selectedAccount } = get();
        console.log(`🏦 Loading accounts for user: ${userId}`);
        set({ isLoading: true, error: null });
        
        try {
          const response = await bankingService.getAccounts();
          
          console.log(`✅ Accounts loaded:`, {
            accountCount: response.accounts.length,
            accounts: response.accounts.map(acc => ({
              id: acc.id,
              currency: acc.currency,
              iban: acc.iban
            }))
          });
          
          // Preserve the currently selected account if it still exists
          let newSelectedAccount = null;
          if (selectedAccount) {
            newSelectedAccount = response.accounts.find(acc => acc.id === selectedAccount.id) || null;
            console.log(`🔄 Preserving selected account: ${selectedAccount.currency} (${selectedAccount.id})`);
          }
          
          // If no account is selected or the previously selected account no longer exists,
          // select the first available account
          if (!newSelectedAccount && response.accounts.length > 0) {
            newSelectedAccount = response.accounts[0];
            console.log(`🔄 Auto-selecting first account: ${newSelectedAccount.currency} (${newSelectedAccount.id})`);
          }
          
          set({
            accounts: response.accounts,
            selectedAccount: newSelectedAccount,
            isLoading: false,
            error: null,
            isInitialized: true,
          });
        } catch (error) {
          const bankingError = error as BankingError;
          console.error('❌ Failed to load accounts:', {
            error: bankingError,
            message: bankingError.message,
            statusCode: bankingError.statusCode
          });
          
          set({
            isLoading: false,
            error: bankingError.message || 'Failed to load accounts',
            isInitialized: true,
          });
        }
      },

      selectAccount: (accountId: string) => {
        const { accounts, accountBalances } = get();
        const account = accounts.find(acc => acc.id === accountId);
        
        if (account) {
          // Get cached balance for this account, if available
          const cachedBalance = accountBalances[accountId] || null;
          
          set({ 
            selectedAccount: account,
            balance: cachedBalance, // Use cached balance or null
          });
        }
      },

      refreshBalance: async (accountId?: string) => {
        const { selectedAccount, userId, accountBalances } = get();
        const targetAccountId = accountId || selectedAccount?.id;
        
        if (!targetAccountId) {
          console.warn('⚠️ Cannot refresh balance: no account ID provided');
          set({ error: 'No account selected' });
          return;
        }

        console.log(`🔄 Refreshing balance for account: ${targetAccountId} (user: ${userId})`);
        
        // Clear the current balance AND the cached balance for this account to ensure UI updates
        const updatedBalances = { ...accountBalances };
        delete updatedBalances[targetAccountId];
        
        set({ 
          balance: targetAccountId === selectedAccount?.id ? null : get().balance,
          accountBalances: updatedBalances,
          isLoading: true, 
          error: null 
        });
        
        try {
          console.log(`📡 Making balance API call for account: ${targetAccountId}`);
          const response = await bankingService.getAccountBalance(targetAccountId);
          
          console.log(`✅ Balance refresh successful:`, {
            accountId: targetAccountId,
            balance: response.balance,
            amount: response.balance.amount,
            currency: response.balance.currency
          });
          
          // Update both the current balance (if this is the selected account) and the cache
          set((state) => ({
            balance: targetAccountId === state.selectedAccount?.id ? response.balance : state.balance,
            accountBalances: {
              ...state.accountBalances,
              [targetAccountId]: response.balance
            },
            isLoading: false,
            error: null,
          }));
        } catch (error) {
          const bankingError = error as BankingError;
          console.error(`❌ Balance refresh failed for account ${targetAccountId}:`, {
            error: bankingError,
            message: bankingError.message,
            statusCode: bankingError.statusCode
          });
          
          set({
            isLoading: false,
            error: bankingError.message || 'Failed to refresh balance',
          });
          
          // Don't throw the error, just log it
          console.error('Balance refresh error details:', error);
        }
      },

      updateAccountBalance: (accountId: string, newBalance: number) => {
        const { accounts, selectedAccount, balance } = get();
        
        console.log(`💰 Updating account balance: ${accountId} → ${newBalance}`);
        
        // Update the account in the accounts list
        const updatedAccounts = accounts.map(account => 
          account.id === accountId 
            ? { ...account, balance: newBalance }
            : account
        );
        
        // Update the selected account if it matches
        let updatedSelectedAccount = selectedAccount;
        if (selectedAccount && selectedAccount.id === accountId) {
          updatedSelectedAccount = {
            ...selectedAccount,
            balance: newBalance
          };
        }
        
        // Update the current balance if it matches
        let updatedBalance = balance;
        if (balance && selectedAccount?.id === accountId) {
          updatedBalance = {
            ...balance,
            amount: newBalance
          };
        }
        
        set({
          accounts: updatedAccounts,
          selectedAccount: updatedSelectedAccount,
          balance: updatedBalance
        });
        
        console.log(`✅ Account balance updated successfully`);
      },

      getAccountBalance: (accountId: string) => {
        const { accountBalances, selectedAccount, balance } = get();
        
        // If this is the selected account, return the current balance
        if (selectedAccount?.id === accountId && balance) {
          return balance;
        }
        
        // Otherwise, return from cache
        return accountBalances[accountId] || null;
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      reset: () => {
        set({
          accounts: [],
          selectedAccount: null,
          balance: null,
          accountBalances: {},
          isLoading: false,
          error: null,
          isInitialized: false,
          userId: null,
        });
      },

      setUserId: async (userId: string | null) => {
        const currentUserId = get().userId;
        if (currentUserId !== userId) {
          console.log('Wallet: User changed, clearing all data and storage');
          // User changed - reset all data AND clear storage
          set({
            accounts: [],
            selectedAccount: null,
            balance: null,
            accountBalances: {},
            isLoading: false,
            error: null,
            isInitialized: false,
            userId,
          });
          
          // Also clear the persisted storage to prevent loading old data
          try {
            await SecureStore.deleteItemAsync('wallet-storage');
          } catch (error) {
            console.error('Error clearing wallet storage:', error);
          }
        }
      },

      fetchWalletData: async () => {
        const { loadAccounts, selectedAccount } = get();
        
        try {
          // Reload accounts and refresh balance
          await loadAccounts();
          
          if (selectedAccount) {
            await get().refreshBalance(selectedAccount.id);
          }
        } catch (error) {
          console.error('Error fetching wallet data:', error);
        }
      },
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        selectedAccount: state.selectedAccount,
        isInitialized: state.isInitialized,
        userId: state.userId,
      }),
      // Add validation when loading from storage
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Wallet store rehydration error:', error);
          return;
        }
        if (state) {
          console.log('Wallet store rehydrated with userId:', state.userId);
          // Additional validation can be added here if needed
        }
      },
    }
  )
);