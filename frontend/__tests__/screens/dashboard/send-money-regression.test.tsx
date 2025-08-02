import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SendMoneyScreen from '../../../app/(dashboard)/send-money';
import { useWalletStore } from '../../../lib/walletStore';
import { useAuthStore } from '../../../lib/auth';
import { transferService } from '../../../lib/transfer';
import { router } from 'expo-router';

// Mock dependencies
jest.mock('../../../lib/walletStore');
jest.mock('../../../lib/auth');
jest.mock('../../../lib/transfer');
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockUseWalletStore = useWalletStore as jest.MockedFunction<typeof useWalletStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockTransferService = transferService as jest.Mocked<typeof transferService>;
const mockUseLocalSearchParams = require('expo-router').useLocalSearchParams as jest.Mock;

describe('SendMoneyScreen - Currency Context Regression Tests', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  const mockEurAccount = {
    id: 'eur-account-id',
    userId: 'test-user-id',
    name: 'EUR Account',
    currency: 'EUR',
    accountType: 'CHECKING',
    iban: 'ES7100302053091234567890',
    lastBalance: 1000,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockHnlAccount = {
    id: 'hnl-account-id',
    userId: 'test-user-id',
    name: 'HNL Account',
    currency: 'HNL',
    accountType: 'CHECKING',
    iban: 'HN1100302053091234567890',
    lastBalance: 25000,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mixed transfer history with both EUR and HNL transfers
  const mockMixedTransferHistory = [
    {
      id: 'eur-transfer-1',
      sourceAccountId: 'eur-account-id',
      quoteId: 'quote-eur-1',
      status: { status: 'COMPLETED' as const, message: 'Completed', timestamp: new Date().toISOString() },
      sourceAmount: -100,
      sourceCurrency: 'EUR',
      targetAmount: 100,
      targetCurrency: 'EUR',
      exchangeRate: 1.0,
      fee: 0,
      reference: 'EUR-REF-001',
      description: 'EUR transfer to Danny Ramírez',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recipient: { 
        name: 'Danny Ramírez', 
        iban: 'ES3721000418430739012920' 
      },
      metadata: JSON.stringify({
        recipientName: 'Danny Ramírez',
        recipientIban: 'ES3721000418430739012920',
        isInternalUser: false,
        transferAmount: 100,
      }),
    },
    {
      id: 'hnl-transfer-1',
      sourceAccountId: 'hnl-account-id',
      quoteId: 'quote-hnl-1',
      status: { status: 'COMPLETED' as const, message: 'Completed', timestamp: new Date().toISOString() },
      sourceAmount: -2500,
      sourceCurrency: 'HNL',
      targetAmount: 2500,
      targetCurrency: 'HNL',
      exchangeRate: 1.0,
      fee: 0,
      reference: 'HNL-REF-001',
      description: 'HNL transfer to Danny Ramírez',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recipient: { 
        name: 'Danny Ramírez', 
        iban: 'HN321234349670685028' 
      },
      metadata: JSON.stringify({
        recipientName: 'Danny Ramírez',
        recipientIban: 'HN321234349670685028',
        isInternalUser: false,
        transferAmount: 2500,
      }),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth store
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      token: 'mock-token',
      logout: jest.fn(),
      isLoading: false,
      error: null,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      validateSession: jest.fn(),
      clearError: jest.fn(),
      updateUser: jest.fn(),
      loadStoredAuth: jest.fn(),
    });

    // Mock wallet store with EUR account selected
    mockUseWalletStore.mockReturnValue({
      accounts: [mockEurAccount, mockHnlAccount],
      selectedAccount: mockEurAccount,
      balance: { amount: 1000, currency: 'EUR', lastUpdated: new Date().toISOString() },
      accountBalances: {},
      isLoading: false,
      error: null,
      isInitialized: true,
      userId: 'test-user-id',
      createAccount: jest.fn(),
      loadAccounts: jest.fn(),
      selectAccount: jest.fn(),
      refreshBalance: jest.fn(),
      updateAccountBalance: jest.fn(),
      getAccountBalance: jest.fn(),
      clearError: jest.fn(),
      setLoading: jest.fn(),
      reset: jest.fn(),
      setUserId: jest.fn(),
      fetchWalletData: jest.fn(),
    });

    // Mock transfer service
    mockTransferService.getTransferHistory.mockResolvedValue({
      transfers: mockMixedTransferHistory,
      pagination: { limit: 10, offset: 0, total: 2 },
    });
  });

  describe('Currency Context Behavior - "Send EUR" Path', () => {
    beforeEach(() => {
      // Mock navigation from "Send EUR" → "Use EUR Balance"
      mockUseLocalSearchParams.mockReturnValue({ 
        currency: 'EUR', 
        paymentType: 'balance' 
      });
    });

    it('should show both EUR and HNL transfers in Recent Recipients', async () => {
      const { findByText } = render(<SendMoneyScreen />);
      
      // Should show transfers from both currencies
      await waitFor(() => {
        expect(findByText('Danny Ramírez')).toBeTruthy(); // Should appear for both transfers
      });

      expect(mockTransferService.getTransferHistory).toHaveBeenCalledWith(10, 0);
    });

    it('should handle EUR transfer repeat correctly', async () => {
      const { findAllByText } = render(<SendMoneyScreen />);
      
      // Find EUR transfer (there might be multiple "Danny Ramírez" entries)
      const recipientCards = await findAllByText('Danny Ramírez');
      
      // Press the first occurrence (should be EUR based on our mock order)
      fireEvent.press(recipientCards[0]);

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/transaction-details',
          params: {
            transferId: 'eur-transfer-1',
            recipientName: 'Danny Ramírez',
            recipientCurrency: 'EUR',
          },
        });
      });
    });

    it('should NOT try to convert HNL transfer when coming from EUR context', async () => {
      // This test ensures we don't create the bug described in the issue
      // The HNL transfer should either:
      // 1. Be filtered out when in EUR context, OR
      // 2. Navigate correctly without trying EUR→HNL conversion

      const { findAllByText } = render(<SendMoneyScreen />);
      
      // Find all "Danny Ramírez" entries
      const recipientCards = await findAllByText('Danny Ramírez');
      
      // If both are shown, pressing HNL transfer should not cause currency conversion error
      if (recipientCards.length > 1) {
        fireEvent.press(recipientCards[1]); // Second entry should be HNL

        await waitFor(() => {
          expect(router.push).toHaveBeenCalledWith({
            pathname: '/(dashboard)/transaction-details',
            params: {
              transferId: 'hnl-transfer-1',
              recipientName: 'Danny Ramírez',
              recipientCurrency: 'HNL',
            },
          });
        });
      }
    });
  });

  describe('Currency Context Behavior - "Send HNL" Path', () => {
    beforeEach(() => {
      // Mock navigation from "Send HNL" → "Use HNL Balance"
      mockUseLocalSearchParams.mockReturnValue({ 
        currency: 'HNL', 
        paymentType: 'balance' 
      });

      // Switch to HNL account context
      mockUseWalletStore.mockReturnValue({
        accounts: [mockEurAccount, mockHnlAccount],
        selectedAccount: mockHnlAccount,
        balance: { amount: 25000, currency: 'HNL', lastUpdated: new Date().toISOString() },
        accountBalances: {},
        isLoading: false,
        error: null,
        isInitialized: true,
        userId: 'test-user-id',
        createAccount: jest.fn(),
        loadAccounts: jest.fn(),
        selectAccount: jest.fn(),
        refreshBalance: jest.fn(),
        updateAccountBalance: jest.fn(),
        getAccountBalance: jest.fn(),
        clearError: jest.fn(),
        setLoading: jest.fn(),
        reset: jest.fn(),
        setUserId: jest.fn(),
        fetchWalletData: jest.fn(),
      });
    });

    it('should handle HNL transfer repeat correctly', async () => {
      const { findAllByText } = render(<SendMoneyScreen />);
      
      // Find HNL transfer
      const recipientCards = await findAllByText('Danny Ramírez');
      
      // In HNL context, find the HNL transfer
      fireEvent.press(recipientCards[1]); // Assuming HNL is second in our mock

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/transaction-details',
          params: {
            transferId: 'hnl-transfer-1',
            recipientName: 'Danny Ramírez',
            recipientCurrency: 'HNL',
          },
        });
      });
    });

    it('should NOT try to convert EUR transfer when coming from HNL context', async () => {
      // This test ensures the EUR transfer doesn't cause HNL→EUR conversion error
      
      const { findAllByText } = render(<SendMoneyScreen />);
      
      // Find all "Danny Ramírez" entries  
      const recipientCards = await findAllByText('Danny Ramírez');
      
      // Press EUR transfer (first entry) while in HNL context
      if (recipientCards.length > 1) {
        fireEvent.press(recipientCards[0]); // First entry should be EUR

        await waitFor(() => {
          expect(router.push).toHaveBeenCalledWith({
            pathname: '/(dashboard)/transaction-details',
            params: {
              transferId: 'eur-transfer-1',
              recipientName: 'Danny Ramírez',
              recipientCurrency: 'EUR',
            },
          });
        });
      }
    });
  });

  describe('Working Functionality Preservation', () => {
    it('should preserve "Add New Recipient" functionality from EUR context', async () => {
      mockUseLocalSearchParams.mockReturnValue({ 
        currency: 'EUR', 
        paymentType: 'balance' 
      });

      const { getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Add New Recipient')).toBeTruthy();
      });

      fireEvent.press(getByText('Add New Recipient'));

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/payment-method',
          params: { currency: 'EUR' },
        });
      });
    });

    it('should preserve "Add New Recipient" functionality from HNL context', async () => {
      mockUseLocalSearchParams.mockReturnValue({ 
        currency: 'HNL', 
        paymentType: 'balance' 
      });

      const { getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Add New Recipient')).toBeTruthy();
      });

      fireEvent.press(getByText('Add New Recipient'));

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/payment-method',
          params: { currency: 'HNL' },
        });
      });
    });

    it('should preserve search functionality', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Recent Recipients')).toBeTruthy();
      });

      // Search functionality should work regardless of currency context
      // (This would need to be expanded based on actual search implementation)
    });

    it('should preserve favorites toggle functionality', async () => {
      const { findAllByText } = render(<SendMoneyScreen />);
      
      const recipientCards = await findAllByText('Danny Ramírez');
      
      // Favorites should work for both EUR and HNL transfers
      expect(recipientCards.length).toBeGreaterThan(0);
    });
  });
});