import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { wiseService } from './wise';
import type { WiseAccount, WiseBalance, CreateWiseAccountRequest, WiseError } from '../types/wise';

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
  accounts: WiseAccount[];
  selectedAccount: WiseAccount | null;
  balance: WiseBalance | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  userId: string | null;
}

interface WalletActions {
  // Account management
  createAccount: (request: CreateWiseAccountRequest) => Promise<void>;
  loadAccounts: () => Promise<void>;
  selectAccount: (accountId: string) => void;
  refreshBalance: (accountId?: string) => Promise<void>;
  
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
      isLoading: false,
      error: null,
      isInitialized: false,
      userId: null,

      // Actions
      createAccount: async (request: CreateWiseAccountRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await wiseService.createAccount(request);
          
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
          const wiseError = error as WiseError;
          set({
            isLoading: false,
            error: wiseError.message || 'Failed to create account',
          });
          throw error;
        }
      },

      loadAccounts: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await wiseService.getAccounts();
          
          set({
            accounts: response.accounts,
            selectedAccount: response.accounts[0] || null,
            isLoading: false,
            error: null,
            isInitialized: true,
          });
        } catch (error) {
          const wiseError = error as WiseError;
          set({
            isLoading: false,
            error: wiseError.message || 'Failed to load accounts',
            isInitialized: true,
          });
        }
      },

      selectAccount: (accountId: string) => {
        const { accounts } = get();
        const account = accounts.find(acc => acc.id === accountId);
        
        if (account) {
          set({ 
            selectedAccount: account,
            balance: null, // Clear previous balance
          });
        }
      },

      refreshBalance: async (accountId?: string) => {
        const { selectedAccount } = get();
        const targetAccountId = accountId || selectedAccount?.id;
        
        if (!targetAccountId) {
          set({ error: 'No account selected' });
          return;
        }

        set({ isLoading: true, error: null });
        
        try {
          const response = await wiseService.getAccountBalance(targetAccountId);
          
          set({
            balance: response.balance,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const wiseError = error as WiseError;
          set({
            isLoading: false,
            error: wiseError.message || 'Failed to refresh balance',
          });
        }
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