import { transferService } from '../../lib/transfer';
import { apiClient } from '../../lib/api';
import type { Transfer, CreateTransferRequest, TransferQuote } from '../../types/transfer';

// Mock the API client
jest.mock('../../lib/api');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('TransferService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuote', () => {
    const mockQuote: TransferQuote = {
      id: 'quote-123',
      sourceAmount: 100,
      sourceCurrency: 'EUR',
      targetAmount: 100,
      targetCurrency: 'EUR',
      exchangeRate: 1.0,
      fee: 0,
      feeCurrency: 'EUR',
      totalCost: 100,
      expiresAt: '2024-01-01T12:00:00Z',
      processingTime: 'Instant',
      rateType: 'FIXED',
    };

    it('should get quote for EUR to EUR transfer', async () => {
      mockApiClient.post.mockResolvedValue({ quote: mockQuote });

      const result = await transferService.getQuote(
        'eur-account-id',
        'EUR',
        'ES',
        100,
        'EUR'
      );

      expect(result.quote).toEqual(mockQuote);
      expect(mockApiClient.post).toHaveBeenCalledWith('/transaction-requests/quote', {
        sourceAccountId: 'eur-account-id',
        targetCurrency: 'EUR',
        targetCountry: 'ES',
        amount: 100,
        sourceCurrency: 'EUR',
        type: 'BANK_TRANSFER',
      });
    });

    it('should get quote for HNL to HNL transfer', async () => {
      const hnlQuote: TransferQuote = {
        ...mockQuote,
        sourceCurrency: 'HNL',
        targetCurrency: 'HNL',
        sourceAmount: 2500,
        targetAmount: 2500,
        feeCurrency: 'HNL',
        totalCost: 2500,
      };

      mockApiClient.post.mockResolvedValue({ quote: hnlQuote });

      const result = await transferService.getQuote(
        'hnl-account-id',
        'HNL',
        'HN',
        2500,
        'HNL'
      );

      expect(result.quote).toEqual(hnlQuote);
      expect(mockApiClient.post).toHaveBeenCalledWith('/transaction-requests/quote', {
        sourceAccountId: 'hnl-account-id',
        targetCurrency: 'HNL',
        targetCountry: 'HN',
        amount: 2500,
        sourceCurrency: 'HNL',
        type: 'BANK_TRANSFER',
      });
    });

    it('should get quote for EUR to HNL cross-currency transfer', async () => {
      const crossCurrencyQuote: TransferQuote = {
        ...mockQuote,
        targetCurrency: 'HNL',
        targetAmount: 2450,
        exchangeRate: 24.5,
        totalCost: 102,
        fee: 2,
      };

      mockApiClient.post.mockResolvedValue({ quote: crossCurrencyQuote });

      const result = await transferService.getQuote(
        'eur-account-id',
        'HNL',
        'HN',
        100,
        'EUR'
      );

      expect(result.quote).toEqual(crossCurrencyQuote);
      expect(result.quote.exchangeRate).toBe(24.5);
      expect(result.quote.targetAmount).toBe(2450);
    });

    it('should handle quote request errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Insufficient balance'));

      await expect(
        transferService.getQuote('eur-account-id', 'EUR', 'ES', 5000, 'EUR')
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('createTransfer', () => {
    const mockTransfer: Transfer = {
      id: 'transfer-123',
      sourceAccountId: 'eur-account-id',
      targetAccountId: 'target-account-id',
      quoteId: 'quote-123',
      status: {
        status: 'PENDING',
        message: 'Transfer initiated',
        timestamp: '2024-01-01T12:00:00Z',
      },
      sourceAmount: -100,
      sourceCurrency: 'EUR',
      targetAmount: 100,
      targetCurrency: 'EUR',
      exchangeRate: 1.0,
      fee: 0,
      reference: 'Test transfer',
      description: 'EUR transfer to recipient',
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
      recipient: {
        name: 'Test Recipient',
        iban: 'ES7100302053091234567891',
      },
    };

    it('should create EUR to EUR transfer', async () => {
      mockApiClient.post.mockResolvedValue({ transfer: mockTransfer });

      const request: CreateTransferRequest = {
        quoteId: 'quote-123',
        targetAccountId: 'target-account-id',
        reference: 'Test transfer',
        description: 'EUR transfer to recipient',
      };

      const result = await transferService.createTransfer(request);

      expect(result.transfer).toEqual(mockTransfer);
      expect(mockApiClient.post).toHaveBeenCalledWith('/transaction-requests', request);
    });

    it('should create HNL to HNL transfer', async () => {
      const hnlTransfer: Transfer = {
        ...mockTransfer,
        sourceCurrency: 'HNL',
        targetCurrency: 'HNL',
        sourceAmount: -2500,
        targetAmount: 2500,
        description: 'HNL transfer to recipient',
      };

      mockApiClient.post.mockResolvedValue({ transfer: hnlTransfer });

      const request: CreateTransferRequest = {
        quoteId: 'quote-456',
        targetAccountId: 'hnl-target-account-id',
        reference: 'HNL test transfer',
        description: 'HNL transfer to recipient',
      };

      const result = await transferService.createTransfer(request);

      expect(result.transfer).toEqual(hnlTransfer);
      expect(result.transfer.sourceCurrency).toBe('HNL');
      expect(result.transfer.targetCurrency).toBe('HNL');
    });

    it('should create transfer to external IBAN', async () => {
      const externalTransfer: Transfer = {
        ...mockTransfer,
        targetAccountId: undefined,
        recipient: {
          name: 'External Recipient',
          iban: 'DE89370400440532013000',
          bankName: 'Deutsche Bank',
        },
      };

      mockApiClient.post.mockResolvedValue({ transfer: externalTransfer });

      const request: CreateTransferRequest = {
        quoteId: 'quote-789',
        recipientAccount: {
          type: 'iban',
          iban: 'DE89370400440532013000',
          currency: 'EUR',
          country: 'DE',
          holderName: 'External Recipient',
          bankName: 'Deutsche Bank',
        },
        reference: 'External transfer',
        description: 'Transfer to external bank',
      };

      const result = await transferService.createTransfer(request);

      expect(result.transfer).toEqual(externalTransfer);
      expect(result.transfer.recipient?.iban).toBe('DE89370400440532013000');
      expect(result.transfer.targetAccountId).toBeUndefined();
    });

    it('should handle transfer creation errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Invalid recipient'));

      const request: CreateTransferRequest = {
        quoteId: 'invalid-quote',
        targetAccountId: 'invalid-account',
      };

      await expect(transferService.createTransfer(request)).rejects.toThrow('Invalid recipient');
    });
  });

  describe('createSimpleTransfer', () => {
    it('should create simple EUR transfer via OBP endpoint', async () => {
      const mockTransfer: Transfer = {
        id: 'simple-transfer-123',
        sourceAccountId: 'eur-account-id',
        quoteId: 'auto-quote',
        status: {
          status: 'COMPLETED',
          message: 'Transfer completed',
          timestamp: '2024-01-01T12:00:00Z',
        },
        sourceAmount: -100,
        sourceCurrency: 'EUR',
        targetAmount: 100,
        targetCurrency: 'EUR',
        exchangeRate: 1.0,
        fee: 0,
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        recipient: {
          name: 'Simple Recipient',
          iban: 'ES7100302053091234567892',
        },
      };

      mockApiClient.obpPost.mockResolvedValue({ transfer: mockTransfer });

      const transferData = {
        recipientAccount: {
          accountNumber: 'ES7100302053091234567892',
          currency: 'EUR',
          country: 'ES',
        },
        recipientDetails: {
          firstName: 'Simple',
          lastName: 'Recipient',
          email: 'simple@example.com',
        },
        transferDetails: {
          amount: 100,
          currency: 'EUR',
          reference: 'Simple transfer',
        },
      };

      const result = await transferService.createSimpleTransfer(transferData);

      expect(result.transfer).toEqual(mockTransfer);
      expect(mockApiClient.obpPost).toHaveBeenCalledWith('/obp/v5.1.0/transaction-requests', transferData);
    });

    it('should create simple HNL transfer via OBP endpoint', async () => {
      const mockHnlTransfer: Transfer = {
        id: 'simple-hnl-transfer-123',
        sourceAccountId: 'hnl-account-id',
        quoteId: 'auto-quote',
        status: {
          status: 'COMPLETED',
          message: 'Transfer completed',
          timestamp: '2024-01-01T12:00:00Z',
        },
        sourceAmount: -2500,
        sourceCurrency: 'HNL',
        targetAmount: 2500,
        targetCurrency: 'HNL',
        exchangeRate: 1.0,
        fee: 0,
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        recipient: {
          name: 'HNL Recipient',
          accountNumber: '1234567890123456',
        },
      };

      mockApiClient.obpPost.mockResolvedValue({ transfer: mockHnlTransfer });

      const transferData = {
        recipientAccount: {
          accountNumber: '1234567890123456',
          currency: 'HNL',
          country: 'HN',
        },
        recipientDetails: {
          firstName: 'HNL',
          lastName: 'Recipient',
          email: 'hnl@example.com',
        },
        transferDetails: {
          amount: 2500,
          currency: 'HNL',
          reference: 'Simple HNL transfer',
        },
      };

      const result = await transferService.createSimpleTransfer(transferData);

      expect(result.transfer).toEqual(mockHnlTransfer);
      expect(result.transfer.sourceCurrency).toBe('HNL');
      expect(result.transfer.targetCurrency).toBe('HNL');
    });
  });

  describe('getTransferHistory', () => {
    const mockTransfers: Transfer[] = [
      {
        id: 'transfer-1',
        sourceAccountId: 'eur-account-id',
        quoteId: 'quote-1',
        status: { status: 'COMPLETED', message: 'Completed', timestamp: '2024-01-01T12:00:00Z' },
        sourceAmount: -100,
        sourceCurrency: 'EUR',
        targetAmount: 100,
        targetCurrency: 'EUR',
        exchangeRate: 1.0,
        fee: 0,
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        recipient: { name: 'EUR Recipient', iban: 'ES7100302053091234567891' },
      },
      {
        id: 'transfer-2',
        sourceAccountId: 'hnl-account-id',
        quoteId: 'quote-2',
        status: { status: 'COMPLETED', message: 'Completed', timestamp: '2024-01-01T11:00:00Z' },
        sourceAmount: -2500,
        sourceCurrency: 'HNL',
        targetAmount: 2500,
        targetCurrency: 'HNL',
        exchangeRate: 1.0,
        fee: 0,
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z',
        recipient: { name: 'HNL Recipient', accountNumber: '1234567890123456' },
      },
    ];

    it('should get transfer history with default pagination', async () => {
      mockApiClient.obpGet.mockResolvedValue({
        transfers: mockTransfers,
        pagination: { limit: 20, offset: 0, total: 2 },
      });

      const result = await transferService.getTransferHistory();

      expect(result.transfers).toEqual(mockTransfers);
      expect(result.pagination).toEqual({ limit: 20, offset: 0, total: 2 });
      expect(mockApiClient.obpGet).toHaveBeenCalledWith('/obp/v5.1.0/transaction-requests?limit=20&offset=0');
    });

    it('should get transfer history with custom pagination', async () => {
      const limitedTransfers = [mockTransfers[0]];
      mockApiClient.obpGet.mockResolvedValue({
        transfers: limitedTransfers,
        pagination: { limit: 1, offset: 0, total: 2 },
      });

      const result = await transferService.getTransferHistory(1, 0);

      expect(result.transfers).toEqual(limitedTransfers);
      expect(result.pagination.limit).toBe(1);
      expect(mockApiClient.obpGet).toHaveBeenCalledWith('/obp/v5.1.0/transaction-requests?limit=1&offset=0');
    });

    it('should handle empty transfer history', async () => {
      mockApiClient.obpGet.mockResolvedValue({
        transfers: [],
        pagination: { limit: 20, offset: 0, total: 0 },
      });

      const result = await transferService.getTransferHistory();

      expect(result.transfers).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('Validation Methods', () => {
    describe('validateAmount', () => {
      it('should validate valid EUR amounts', () => {
        expect(transferService.validateAmount(100, 1000)).toEqual({ isValid: true });
        expect(transferService.validateAmount(1000, 1000)).toEqual({ isValid: true });
        expect(transferService.validateAmount(0.01, 1000)).toEqual({ isValid: true });
      });

      it('should validate valid HNL amounts', () => {
        expect(transferService.validateAmount(2500, 25000)).toEqual({ isValid: true });
        expect(transferService.validateAmount(10000, 25000)).toEqual({ isValid: true });
        expect(transferService.validateAmount(1, 25000)).toEqual({ isValid: true });
      });

      it('should reject zero or negative amounts', () => {
        expect(transferService.validateAmount(0, 1000)).toEqual({
          isValid: false,
          error: 'Amount must be greater than 0',
        });
        expect(transferService.validateAmount(-100, 1000)).toEqual({
          isValid: false,
          error: 'Amount must be greater than 0',
        });
      });

      it('should reject amounts exceeding balance', () => {
        expect(transferService.validateAmount(1500, 1000)).toEqual({
          isValid: false,
          error: 'Insufficient balance',
        });
        expect(transferService.validateAmount(30000, 25000)).toEqual({
          isValid: false,
          error: 'Insufficient balance',
        });
      });

      it('should reject amounts exceeding daily limit', () => {
        expect(transferService.validateAmount(15000, 20000)).toEqual({
          isValid: false,
          error: 'Amount exceeds daily limit',
        });
      });
    });

    describe('validateIban', () => {
      it('should validate correct IBAN formats', () => {
        expect(transferService.validateIban('ES7100302053091234567890')).toEqual({ isValid: true });
        expect(transferService.validateIban('DE89370400440532013000')).toEqual({ isValid: true });
        expect(transferService.validateIban('FR1420041010050500013M02606')).toEqual({ isValid: true });
      });

      it('should validate IBAN with spaces', () => {
        expect(transferService.validateIban('ES71 0030 2053 0912 3456 7890')).toEqual({ isValid: true });
        expect(transferService.validateIban('DE89 3704 0044 0532 0130 00')).toEqual({ isValid: true });
      });

      it('should reject invalid IBAN formats', () => {
        expect(transferService.validateIban('')).toEqual({
          isValid: false,
          error: 'IBAN is required',
        });
        expect(transferService.validateIban('123')).toEqual({
          isValid: false,
          error: 'IBAN must be between 15-34 characters',
        });
        expect(transferService.validateIban('INVALID123456789012345')).toEqual({
          isValid: false,
          error: 'Invalid IBAN format',
        });
      });

      it('should reject null or undefined IBAN', () => {
        expect(transferService.validateIban(null as any)).toEqual({
          isValid: false,
          error: 'IBAN is required',
        });
        expect(transferService.validateIban(undefined as any)).toEqual({
          isValid: false,
          error: 'IBAN is required',
        });
      });
    });
  });

  describe('Formatting Methods', () => {
    it('should format EUR amounts correctly', () => {
      expect(transferService.formatAmount(100, 'EUR')).toBe('€100.00');
      expect(transferService.formatAmount(1000.50, 'EUR')).toBe('€1,000.50');
      expect(transferService.formatAmount(0.01, 'EUR')).toBe('€0.01');
    });

    it('should format HNL amounts correctly', () => {
      const formatted2500 = transferService.formatAmount(2500, 'HNL');
      const formatted25000 = transferService.formatAmount(25000.75, 'HNL');
      const formatted1 = transferService.formatAmount(1, 'HNL');
      
      expect(formatted2500).toContain('2,500.00');
      expect(formatted25000).toContain('25,000.75');
      expect(formatted1).toContain('1.00');
      
      // Check currency code is included
      expect(formatted2500).toMatch(/HNL|L/);
      expect(formatted25000).toMatch(/HNL|L/);
      expect(formatted1).toMatch(/HNL|L/);
    });

    it('should format exchange rates correctly', () => {
      expect(transferService.formatExchangeRate(1.0, 'EUR', 'EUR')).toBe('1 EUR = 1.0000 EUR');
      expect(transferService.formatExchangeRate(24.5, 'EUR', 'HNL')).toBe('1 EUR = 24.5000 HNL');
      expect(transferService.formatExchangeRate(0.0408, 'HNL', 'EUR')).toBe('1 HNL = 0.0408 EUR');
    });
  });

  describe('Status Management', () => {
    it('should return correct status colors', () => {
      expect(transferService.getStatusColor('COMPLETED')).toBe('#28a745');
      expect(transferService.getStatusColor('PENDING')).toBe('#ffc107');
      expect(transferService.getStatusColor('PROCESSING')).toBe('#17a2b8');
      expect(transferService.getStatusColor('SENT')).toBe('#007bff');
      expect(transferService.getStatusColor('FAILED')).toBe('#dc3545');
      expect(transferService.getStatusColor('CANCELLED')).toBe('#6c757d');
      expect(transferService.getStatusColor('UNKNOWN')).toBe('#6c757d');
      expect(transferService.getStatusColor('')).toBe('#6c757d');
    });

    it('should return correct status icons', () => {
      expect(transferService.getStatusIcon('COMPLETED')).toBe('✅');
      expect(transferService.getStatusIcon('PENDING')).toBe('⏳');
      expect(transferService.getStatusIcon('PROCESSING')).toBe('🔄');
      expect(transferService.getStatusIcon('SENT')).toBe('📤');
      expect(transferService.getStatusIcon('FAILED')).toBe('❌');
      expect(transferService.getStatusIcon('CANCELLED')).toBe('🚫');
      expect(transferService.getStatusIcon('UNKNOWN')).toBe('📄');
      expect(transferService.getStatusIcon('')).toBe('📄');
    });

    it('should handle null/undefined status gracefully', () => {
      expect(transferService.getStatusColor(null as any)).toBe('#6c757d');
      expect(transferService.getStatusColor(undefined as any)).toBe('#6c757d');
      expect(transferService.getStatusIcon(null as any)).toBe('📄');
      expect(transferService.getStatusIcon(undefined as any)).toBe('📄');
    });
  });
});