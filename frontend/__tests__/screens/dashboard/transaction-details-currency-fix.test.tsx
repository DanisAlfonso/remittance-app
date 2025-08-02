import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TransactionDetailsScreen from '../../../app/(dashboard)/transaction-details';
import { useWalletStore } from '../../../lib/walletStore';
import { transferService } from '../../../lib/transfer';
import { router } from 'expo-router';

// Mock dependencies
jest.mock('../../../lib/walletStore');
jest.mock('../../../lib/transfer');
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

const mockUseWalletStore = useWalletStore as jest.MockedFunction<typeof useWalletStore>;
const mockTransferService = transferService as jest.Mocked<typeof transferService>;
const mockUseLocalSearchParams = require('expo-router').useLocalSearchParams as jest.Mock;

describe('TransactionDetailsScreen - Currency Context Fix', () => {
  const eurTransfer = {
    id: 'eur-transfer-123',
    sourceAccountId: 'eur-account',
    quoteId: 'eur-quote',
    status: { status: 'COMPLETED' as const, message: 'Completed', timestamp: '2025-08-02T14:45:03.663Z' },
    sourceAmount: -100,
    sourceCurrency: 'EUR',
    targetAmount: 100,
    targetCurrency: 'EUR',
    exchangeRate: 1.0,
    fee: 0,
    reference: 'EUR-REF-001',
    description: 'EUR transfer to Danny Ramírez',
    createdAt: '2025-08-02T14:45:03.663Z',
    updatedAt: '2025-08-02T14:45:03.663Z',
    recipient: { 
      name: 'Danny Ramírez', 
      iban: 'ES3721000418430739012920' 
    },
    metadata: JSON.stringify({
      recipientName: 'Danny Ramírez',
      recipientIban: 'ES3721000418430739012920',
      isInternalUser: false,
    }),
  };

  const hnlTransfer = {
    id: 'hnl-transfer-123',
    sourceAccountId: 'hnl-account',
    quoteId: 'hnl-quote',
    status: { status: 'COMPLETED' as const, message: 'Completed', timestamp: '2025-08-02T14:45:03.663Z' },
    sourceAmount: -2500,
    sourceCurrency: 'HNL',
    targetAmount: 2500,
    targetCurrency: 'HNL',
    exchangeRate: 1.0,
    fee: 0,
    reference: 'HNL-REF-001',
    description: 'HNL transfer to Danny Ramírez',
    createdAt: '2025-08-02T14:45:03.663Z',
    updatedAt: '2025-08-02T14:45:03.663Z',
    recipient: { 
      name: 'Danny Ramírez', 
      iban: 'HN321234349670685028' 
    },
    metadata: JSON.stringify({
      recipientName: 'Danny Ramírez',
      recipientIban: 'HN321234349670685028',
      isInternalUser: false,
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Currency Context Respect - The Fix', () => {
    it('should use EUR currency when repeating HNL transfer from EUR account context', async () => {
      // Setup: User is in EUR account context but viewing HNL transfer details
      mockUseLocalSearchParams.mockReturnValue({
        transferId: 'hnl-transfer-123',
        recipientName: 'Danny Ramírez',
        recipientCurrency: 'HNL',
      });

      // Mock EUR account as currently selected
      mockUseWalletStore.mockReturnValue({
        selectedAccount: {
          id: 'eur-account-id',
          currency: 'EUR',
          name: 'EUR Account',
        },
      } as any);

      // Mock transfer service returning the HNL transfer
      mockTransferService.getTransferHistory.mockResolvedValue({
        transfers: [hnlTransfer],
        pagination: { limit: 50, offset: 0, total: 1 },
      });

      const { getByText } = render(<TransactionDetailsScreen />);

      // Wait for transfer to load
      await waitFor(() => {
        expect(getByText('Danny Ramírez')).toBeTruthy();
      });

      // Find and press "Repeat Transfer" button
      const repeatButton = getByText('Repeat Transfer');
      fireEvent.press(repeatButton);

      // Verify navigation uses EUR currency (current context) not HNL (original transfer)
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/transfer-amount',
          params: {
            currency: 'EUR', // Should be EUR (current context), not HNL (original transfer)
            recipientData: expect.stringContaining('"currency":"EUR"'), // Should adapt to EUR
            prefillAmount: '2500',
            fromRepeatTransfer: 'true'
          }
        });
      });
    });

    it('should use HNL currency when repeating EUR transfer from HNL account context', async () => {
      // Setup: User is in HNL account context but viewing EUR transfer details
      mockUseLocalSearchParams.mockReturnValue({
        transferId: 'eur-transfer-123',
        recipientName: 'Danny Ramírez',
        recipientCurrency: 'EUR',
      });

      // Mock HNL account as currently selected
      mockUseWalletStore.mockReturnValue({
        selectedAccount: {
          id: 'hnl-account-id',
          currency: 'HNL',
          name: 'HNL Account',
        },
      } as any);

      // Mock transfer service returning the EUR transfer
      mockTransferService.getTransferHistory.mockResolvedValue({
        transfers: [eurTransfer],
        pagination: { limit: 50, offset: 0, total: 1 },
      });

      const { getByText } = render(<TransactionDetailsScreen />);

      // Wait for transfer to load
      await waitFor(() => {
        expect(getByText('Danny Ramírez')).toBeTruthy();
      });

      // Find and press "Repeat Transfer" button
      const repeatButton = getByText('Repeat Transfer');
      fireEvent.press(repeatButton);

      // Verify navigation uses HNL currency (current context) not EUR (original transfer)
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/transfer-amount',
          params: {
            currency: 'HNL', // Should be HNL (current context), not EUR (original transfer)
            recipientData: expect.stringContaining('"currency":"HNL"'), // Should adapt to HNL
            prefillAmount: '100',
            fromRepeatTransfer: 'true'
          }
        });
      });
    });

    it('should maintain same currency when context matches original transfer', async () => {
      // Setup: User is in EUR context and viewing EUR transfer (should work as before)
      mockUseLocalSearchParams.mockReturnValue({
        transferId: 'eur-transfer-123',
        recipientName: 'Danny Ramírez',
        recipientCurrency: 'EUR',
      });

      mockUseWalletStore.mockReturnValue({
        selectedAccount: {
          id: 'eur-account-id',
          currency: 'EUR',
          name: 'EUR Account',
        },
      } as any);

      mockTransferService.getTransferHistory.mockResolvedValue({
        transfers: [eurTransfer],
        pagination: { limit: 50, offset: 0, total: 1 },
      });

      const { getByText } = render(<TransactionDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Danny Ramírez')).toBeTruthy();
      });

      const repeatButton = getByText('Repeat Transfer');
      fireEvent.press(repeatButton);

      // Should still use EUR for EUR transfer in EUR context
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/transfer-amount',
          params: {
            currency: 'EUR',
            recipientData: expect.stringContaining('"currency":"EUR"'),
            prefillAmount: '100',
            fromRepeatTransfer: 'true'
          }
        });
      });
    });

    it('should handle internal user transfers with currency context', async () => {
      const internalUserTransfer = {
        ...hnlTransfer,
        metadata: JSON.stringify({
          recipientName: 'Danny Ramírez',
          isInternalUser: true,
          userId: 'internal-user-123',
          username: 'dannyramirez',
        }),
      };

      mockUseLocalSearchParams.mockReturnValue({
        transferId: 'hnl-transfer-123',
        recipientName: 'Danny Ramírez',
        recipientCurrency: 'HNL',
      });

      // EUR context viewing HNL internal transfer
      mockUseWalletStore.mockReturnValue({
        selectedAccount: {
          id: 'eur-account-id',
          currency: 'EUR',
          name: 'EUR Account',
        },
      } as any);

      mockTransferService.getTransferHistory.mockResolvedValue({
        transfers: [internalUserTransfer],
        pagination: { limit: 50, offset: 0, total: 1 },
      });

      const { getByText } = render(<TransactionDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Danny Ramírez')).toBeTruthy();
      });

      const repeatButton = getByText('Repeat Transfer');
      fireEvent.press(repeatButton);

      // Internal user transfer should also respect current currency context
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/transfer-amount',
          params: {
            recipientId: 'internal-user-123',
            recipientName: 'Danny Ramírez',
            recipientUsername: 'dannyramirez',
            transferType: 'user',
            currency: 'EUR', // Should use current context currency
            prefillAmount: '2500',
            fromRepeatTransfer: 'true'
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should fallback to EUR when no selected account', async () => {
      mockUseLocalSearchParams.mockReturnValue({
        transferId: 'hnl-transfer-123',
        recipientName: 'Danny Ramírez',
        recipientCurrency: 'HNL',
      });

      mockUseWalletStore.mockReturnValue({
        selectedAccount: null, // No selected account
      } as any);

      mockTransferService.getTransferHistory.mockResolvedValue({
        transfers: [hnlTransfer],
        pagination: { limit: 50, offset: 0, total: 1 },
      });

      const { getByText } = render(<TransactionDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Danny Ramírez')).toBeTruthy();
      });

      const repeatButton = getByText('Repeat Transfer');
      fireEvent.press(repeatButton);

      // Should fallback to EUR when no selected account
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(dashboard)/transfer-amount',
          params: {
            currency: 'EUR', // Fallback currency
            recipientData: expect.stringContaining('"currency":"EUR"'),
            prefillAmount: '2500',
            fromRepeatTransfer: 'true'
          }
        });
      });
    });

    it('should handle missing transfer gracefully', async () => {
      mockUseLocalSearchParams.mockReturnValue({
        transferId: 'non-existent-transfer',
        recipientName: 'Danny Ramírez',
        recipientCurrency: 'EUR',
      });

      mockUseWalletStore.mockReturnValue({
        selectedAccount: {
          id: 'eur-account-id',
          currency: 'EUR',
          name: 'EUR Account',
        },
      } as any);

      mockTransferService.getTransferHistory.mockResolvedValue({
        transfers: [], // No transfers found
        pagination: { limit: 50, offset: 0, total: 0 },
      });

      render(<TransactionDetailsScreen />);

      // Should not crash, should show error state
      await waitFor(() => {
        // Router.back should be called for error case
        expect(router.back).toHaveBeenCalled();
      });
    });
  });
});