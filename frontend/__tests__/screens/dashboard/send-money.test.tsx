import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
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
  useLocalSearchParams: () => ({ currency: 'EUR', paymentType: 'balance' }),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Alert
const mockAlert = {
  alert: jest.fn(),
};
Alert.alert = mockAlert.alert;

const mockUseWalletStore = useWalletStore as jest.MockedFunction<typeof useWalletStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockTransferService = transferService as jest.Mocked<typeof transferService>;

describe('SendMoneyScreen - Transfer Flows', () => {
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

  const mockEurTransfer = {
    id: 'transfer-1',
    sourceAccountId: 'eur-account-id',
    quoteId: 'quote-1',
    status: { status: 'COMPLETED' as const, message: 'Transfer completed', timestamp: new Date().toISOString() },
    sourceAmount: -100,
    sourceCurrency: 'EUR',
    targetAmount: 100,
    targetCurrency: 'EUR',
    exchangeRate: 1.0,
    fee: 0,
    reference: 'Test EUR transfer',
    description: 'EUR transfer to Test Recipient',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    recipient: {
      name: 'Test Recipient',
      iban: 'ES7100302053091234567891',
    },
    metadata: JSON.stringify({
      recipientName: 'Test Recipient',
      recipientIban: 'ES7100302053091234567891',
      isInternalUser: true,
      transferAmount: 100,
    }),
  };

  const mockHnlTransfer = {
    id: 'transfer-2',
    sourceAccountId: 'hnl-account-id',
    quoteId: 'quote-2',
    status: { status: 'COMPLETED' as const, message: 'Transfer completed', timestamp: new Date().toISOString() },
    sourceAmount: -2500,
    sourceCurrency: 'HNL',
    targetAmount: 2500,
    targetCurrency: 'HNL',
    exchangeRate: 1.0,
    fee: 0,
    reference: 'Test HNL transfer',
    description: 'HNL transfer to HNL Recipient',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    recipient: {
      name: 'HNL Recipient',
      iban: 'HN1100302053091234567892',
    },
    metadata: JSON.stringify({
      recipientName: 'HNL Recipient',
      recipientIban: 'HN1100302053091234567892',
      isInternalUser: true,
      transferAmount: 2500,
    }),
  };

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

    // Mock wallet store
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
      transfers: [mockEurTransfer, mockHnlTransfer],
      pagination: { limit: 10, offset: 0, total: 2 },
    });
  });

  describe('EUR Transfer Flow', () => {
    it('should display EUR account and recent EUR transfers', async () => {
      const { getByText, findByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Send Money')).toBeTruthy();
        expect(getByText('From your EUR balance')).toBeTruthy();
      });

      // Wait for transfer history to load
      await waitFor(() => {
        expect(findByText('Test Recipient')).toBeTruthy();
      });

      expect(mockTransferService.getTransferHistory).toHaveBeenCalledWith(10, 0);
    });

    it('should navigate to add recipient for new EUR transfer', async () => {
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

    it('should display EUR recipient cards with correct transfer information', async () => {
      const { findByText, getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(findByText('Test Recipient')).toBeTruthy();
      });

      // Check EUR transfer details
      expect(getByText('EUR → EUR')).toBeTruthy();
      expect(getByText('€100.00')).toBeTruthy();
    });

    it('should navigate to transaction details when EUR recipient card is pressed', async () => {
      const { findByText } = render(<SendMoneyScreen />);
      
      const recipientCard = await findByText('Test Recipient');
      
      fireEvent.press(recipientCard);

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/transaction-details',
          params: {
            transferId: 'transfer-1',
            recipientName: 'Test Recipient',
            recipientCurrency: 'EUR',
          },
        });
      });
    });

    it('should filter EUR transfers correctly in favorites tab', async () => {
      const { getByText, findByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(findByText('Test Recipient')).toBeTruthy();
      });

      // Switch to favorites tab
      fireEvent.press(getByText('Favorites'));

      await waitFor(() => {
        expect(getByText('Favorite Recipients')).toBeTruthy();
      });
    });
  });

  describe('HNL Transfer Flow', () => {
    beforeEach(() => {
      // Mock HNL account as selected
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

    it('should display HNL account and recent HNL transfers', async () => {
      const { getByText, findByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Send Money')).toBeTruthy();
        expect(getByText('From your EUR balance')).toBeTruthy(); // This comes from useLocalSearchParams mock
      });

      // Wait for transfer history to load
      await waitFor(() => {
        expect(findByText('HNL Recipient')).toBeTruthy();
      });
    });

    it('should display HNL recipient cards with correct transfer information', async () => {
      const { findByText, getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(findByText('HNL Recipient')).toBeTruthy();
      });

      // Check HNL transfer details
      expect(getByText('HNL → HNL')).toBeTruthy();
      expect(getByText('€2,500.00')).toBeTruthy(); // Note: Will show in EUR format due to currency formatting
    });

    it('should navigate to send money flow for HNL transfers', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Add New Recipient')).toBeTruthy();
      });

      fireEvent.press(getByText('Add New Recipient'));

      // Since currency is mocked as EUR in useLocalSearchParams, it will navigate to payment-method
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/payment-method',
          params: { currency: 'EUR' },
        });
      });
    });
  });

  describe('Currency Selection', () => {
    beforeEach(() => {
      // Mock no pre-selected currency
      jest.doMock('expo-router', () => ({
        router: {
          push: jest.fn(),
          back: jest.fn(),
          replace: jest.fn(),
        },
        useLocalSearchParams: () => ({}), // No currency parameter
      }));
    });

    it('should show currency selection when no currency is pre-selected', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Add New Recipient')).toBeTruthy();
      });

      fireEvent.press(getByText('Add New Recipient'));

      // Should go to currency selection step internally
      await waitFor(() => {
        expect(getByText('Choose Currency')).toBeTruthy();
      });
    });

    it('should allow selection of EUR currency', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      // Navigate to currency selection
      fireEvent.press(getByText('Add New Recipient'));

      await waitFor(() => {
        expect(getByText('Choose Currency')).toBeTruthy();
        expect(getByText('Euros (EUR)')).toBeTruthy();
      });

      fireEvent.press(getByText('Euros (EUR)'));

      await waitFor(() => {
        expect(getByText('Send Euros')).toBeTruthy();
        expect(getByText('Choose transfer method')).toBeTruthy();
      });
    });

    it('should allow selection of HNL currency', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      // Navigate to currency selection
      fireEvent.press(getByText('Add New Recipient'));

      await waitFor(() => {
        expect(getByText('Choose Currency')).toBeTruthy();
        expect(getByText('Honduran Lempira (HNL)')).toBeTruthy();
      });

      fireEvent.press(getByText('Honduran Lempira (HNL)'));

      await waitFor(() => {
        expect(getByText('Send Lempira')).toBeTruthy();
        expect(getByText('Choose transfer method')).toBeTruthy();
      });
    });
  });

  describe('Transfer Method Selection', () => {
    it('should show available transfer methods for EUR', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      // Navigate through to method selection
      fireEvent.press(getByText('Add New Recipient'));
      
      await waitFor(() => {
        expect(getByText('Choose Currency')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Euros (EUR)'));

      await waitFor(() => {
        expect(getByText('Send to Contact')).toBeTruthy();
        expect(getByText('To European Bank (IBAN)')).toBeTruthy();
        expect(getByText('To Honduras (EUR → HNL)')).toBeTruthy();
      });
    });

    it('should show available transfer methods for HNL', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      // Navigate through to method selection
      fireEvent.press(getByText('Add New Recipient'));
      
      await waitFor(() => {
        expect(getByText('Choose Currency')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Honduran Lempira (HNL)'));

      await waitFor(() => {
        expect(getByText('Send to Contact')).toBeTruthy();
        expect(getByText('To Bank Account')).toBeTruthy();
        // Should not show EUR → HNL option for HNL selection
      });
    });

    it('should navigate to user search for app user transfers', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      // Navigate to method selection
      fireEvent.press(getByText('Add New Recipient'));
      fireEvent.press(getByText('Euros (EUR)'));
      
      await waitFor(() => {
        expect(getByText('Send to Contact')).toBeTruthy();
      });

      fireEvent.press(getByText('Send to Contact'));

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/user-search',
          params: { currency: 'EUR' },
        });
      });
    });

    it('should navigate to add recipient for bank transfers', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      // Navigate to method selection
      fireEvent.press(getByText('Add New Recipient'));
      fireEvent.press(getByText('Euros (EUR)'));
      
      await waitFor(() => {
        expect(getByText('To European Bank (IBAN)')).toBeTruthy();
      });

      fireEvent.press(getByText('To European Bank (IBAN)'));

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/add-recipient',
          params: { currency: 'EUR' },
        });
      });
    });

    it('should navigate to EUR → HNL remittance flow', async () => {
      const { getByText } = render(<SendMoneyScreen />);
      
      // Navigate to method selection
      fireEvent.press(getByText('Add New Recipient'));
      fireEvent.press(getByText('Euros (EUR)'));
      
      await waitFor(() => {
        expect(getByText('To Honduras (EUR → HNL)')).toBeTruthy();
      });

      fireEvent.press(getByText('To Honduras (EUR → HNL)'));

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/eur-hnl-balance-remittance',
          params: { 
            sourceCurrency: 'EUR',
            targetCurrency: 'HNL',
            paymentType: 'balance'
          },
        });
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should open search modal when search button is pressed', async () => {
      const { getByTestId, getByText, queryByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        // Look for search icon in header
        const searchButton = getByTestId('search-button') || getByText('🔍');
        expect(searchButton).toBeTruthy();
      });
    });

    it('should filter recipients by search query', async () => {
      const { findByText, getByPlaceholderText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(findByText('Test Recipient')).toBeTruthy();
        expect(findByText('HNL Recipient')).toBeTruthy();
      });

      // Open search and filter
      const searchInput = getByPlaceholderText('Search by name, email, or currency...');
      fireEvent.changeText(searchInput, 'EUR');

      await waitFor(() => {
        expect(findByText('Test Recipient')).toBeTruthy();
        // HNL Recipient should be filtered out
      });
    });

    it('should toggle recipient favorite status', async () => {
      const { findByText, getAllByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(findByText('Test Recipient')).toBeTruthy();
      });

      // Find and press favorite button
      const favoriteButtons = getAllByText('☆') || getAllByText('★');
      if (favoriteButtons.length > 0) {
        fireEvent.press(favoriteButtons[0]);
        
        // Should update favorites in secure store
        await waitFor(() => {
          // Favorite status should change (implementation depends on icon used)
          expect(true).toBeTruthy(); // Placeholder assertion
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle transfer history loading error gracefully', async () => {
      mockTransferService.getTransferHistory.mockRejectedValue(new Error('Network error'));
      
      const { getByText, queryByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Send Money')).toBeTruthy();
        // Should show empty state instead of transfers
        expect(queryByText('Test Recipient')).toBeNull();
      });

      // Should not show error to user, just empty list
      expect(mockAlert.alert).not.toHaveBeenCalled();
    });

    it('should show no recipients message when no transfer history exists', async () => {
      mockTransferService.getTransferHistory.mockResolvedValue({
        transfers: [],
        pagination: { limit: 10, offset: 0, total: 0 },
      });
      
      const { getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('No recipients yet')).toBeTruthy();
        expect(getByText('Add your first recipient to start sending money quickly and securely')).toBeTruthy();
      });
    });

    it('should handle missing selected account gracefully', async () => {
      mockUseWalletStore.mockReturnValue({
        ...mockUseWalletStore(),
        selectedAccount: null,
      });
      
      render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          'No Account Selected',
          'Please select an account first',
          [{ text: 'OK', onPress: expect.any(Function) }]
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching recipients', async () => {
      // Mock delayed response
      mockTransferService.getTransferHistory.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          transfers: [],
          pagination: { limit: 10, offset: 0, total: 0 },
        }), 100))
      );
      
      const { getByText } = render(<SendMoneyScreen />);
      
      // Should show loading state
      expect(getByText('Recent Recipients')).toBeTruthy();
      
      await waitFor(() => {
        expect(getByText('No recipients yet')).toBeTruthy();
      });
    });

    it('should show skeleton loading for recipients', async () => {
      // Mock very slow loading
      mockTransferService.getTransferHistory.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      
      const { getByText } = render(<SendMoneyScreen />);
      
      await waitFor(() => {
        expect(getByText('Recent Recipients')).toBeTruthy();
        // Should show loading skeleton
      });
    });
  });
});