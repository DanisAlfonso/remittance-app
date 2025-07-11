import { prisma } from '../config/database';
import type {
  TransferQuoteRequest,
  TransferQuote,
  CreateTransferRequest,
  Transfer,
  ExchangeRate,
  TransferFee,
  TransferReceipt,
} from '../types/transfer';

export class TransferService {
  /**
   * Get current exchange rates for currency pairs
   */
  async getExchangeRate(source: string, target: string): Promise<ExchangeRate> {
    // Sandbox simulation with realistic rates
    const mockRates: Record<string, Record<string, number>> = {
      USD: {
        EUR: 0.85,
        GBP: 0.73,
        CAD: 1.25,
        AUD: 1.35,
        JPY: 110.0,
        CHF: 0.92,
      },
      EUR: {
        USD: 1.18,
        GBP: 0.86,
        CAD: 1.47,
        AUD: 1.59,
        JPY: 129.5,
        CHF: 1.08,
      },
      GBP: {
        USD: 1.37,
        EUR: 1.16,
        CAD: 1.71,
        AUD: 1.85,
        JPY: 150.7,
        CHF: 1.26,
      },
    };

    // Add some realistic fluctuation (±2%)
    const baseRate = mockRates[source]?.[target] || 1.0;
    const fluctuation = (Math.random() - 0.5) * 0.04; // ±2%
    const currentRate = baseRate * (1 + fluctuation);

    return {
      source,
      target,
      rate: Math.round(currentRate * 10000) / 10000, // 4 decimal places
      timestamp: new Date().toISOString(),
      type: 'MID_MARKET',
    };
  }

  /**
   * Calculate transfer fees based on amount and currency pair
   */
  calculateFees(amount: number, sourceCurrency: string, targetCurrency: string): TransferFee[] {
    const fees: TransferFee[] = [];

    // Platform fee (similar to Wise's structure)
    if (sourceCurrency === targetCurrency) {
      // Same currency transfer
      fees.push({
        type: 'FIXED',
        amount: 0.5,
        currency: sourceCurrency,
        description: 'Transfer fee',
      });
    } else {
      // Currency conversion
      const conversionFee = Math.max(2.0, amount * 0.005); // 0.5% or minimum $2
      fees.push({
        type: 'PERCENTAGE',
        amount: conversionFee,
        currency: sourceCurrency,
        description: 'Currency conversion fee',
      });
    }

    return fees;
  }

  /**
   * Generate a transfer quote
   */
  async createQuote(request: TransferQuoteRequest): Promise<TransferQuote> {
    // Get current exchange rate
    const exchangeRate = await this.getExchangeRate(request.sourceCurrency, request.targetCurrency);
    
    // Calculate fees
    const fees = this.calculateFees(request.amount, request.sourceCurrency, request.targetCurrency);
    const totalFee = fees.reduce((sum, fee) => sum + fee.amount, 0);
    
    // Calculate target amount
    const targetAmount = request.sourceCurrency === request.targetCurrency
      ? request.amount
      : (request.amount - totalFee) * exchangeRate.rate;
    
    // Generate quote ID
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set expiration (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    // Estimate processing time
    const processingTime = this.estimateProcessingTime(request.sourceCurrency, request.targetCurrency);
    
    return {
      id: quoteId,
      sourceAmount: request.amount,
      sourceCurrency: request.sourceCurrency,
      targetAmount: Math.round(targetAmount * 100) / 100, // Round to 2 decimals
      targetCurrency: request.targetCurrency,
      exchangeRate: exchangeRate.rate,
      fee: totalFee,
      feeCurrency: request.sourceCurrency,
      totalCost: request.amount,
      expiresAt: expiresAt.toISOString(),
      processingTime,
      rateType: 'FIXED',
    };
  }

  /**
   * Execute a transfer with a specific amount (for simple transfers)
   */
  async executeTransferWithAmount(request: CreateTransferRequest, userId: string, amount: number): Promise<Transfer> {
    // Find user's source account to get the correct currency
    const sourceAccount = await prisma.wiseAccount.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (!sourceAccount) {
      throw new Error('No active account found for user');
    }

    // Validate recipient account is provided
    if (!request.recipientAccount) {
      throw new Error('Recipient account information is required');
    }

    // Use the actual amount provided by the user
    const sourceCurrency = sourceAccount.currency;
    const targetCurrency = request.recipientAccount.currency;
    
    // Get exchange rate for the currency pair
    const exchangeRate = await this.getExchangeRate(sourceCurrency, targetCurrency);
    
    // Calculate fees
    const fees = this.calculateFees(amount, sourceCurrency, targetCurrency);
    const totalFee = fees.reduce((sum, fee) => sum + fee.amount, 0);
    
    // Calculate target amount
    const targetAmount = sourceCurrency === targetCurrency
      ? amount
      : (amount - totalFee) * exchangeRate.rate;

    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transfer with real user data and actual amount
    const mockTransfer: Transfer = {
      id: transferId,
      sourceAccountId: sourceAccount.id,
      targetAccountId: request.targetAccountId,
      quoteId: request.quoteId,
      status: {
        status: 'PENDING',
        message: 'Transfer initiated successfully',
        timestamp: new Date().toISOString(),
      },
      sourceAmount: amount, // Use actual amount from user
      sourceCurrency: sourceCurrency,
      targetAmount: Math.round(targetAmount * 100) / 100,
      targetCurrency: targetCurrency,
      exchangeRate: exchangeRate.rate,
      fee: totalFee,
      reference: request.reference || `Transfer ${Date.now()}`,
      description: request.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedArrival: this.calculateEstimatedArrival(sourceCurrency, targetCurrency),
      recipient: request.recipientAccount ? {
        name: request.recipientAccount.holderName,
        iban: request.recipientAccount.iban,
        accountNumber: request.recipientAccount.accountNumber,
        bankName: request.recipientAccount.bankName,
      } : undefined,
    };

    // Store in database with actual amount
    await this.storeTransfer(mockTransfer, userId);
    
    // Simulate status updates (in production, would be webhook-driven)
    this.simulateTransferProgress(transferId);
    
    return mockTransfer;
  }

  /**
   * Execute a transfer based on a quote
   */
  async executeTransfer(request: CreateTransferRequest, userId: string): Promise<Transfer> {
    // Find user's source account to get the correct currency and amount
    const sourceAccount = await prisma.wiseAccount.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (!sourceAccount) {
      throw new Error('No active account found for user');
    }

    // Validate recipient account is provided
    if (!request.recipientAccount) {
      throw new Error('Recipient account information is required');
    }

    // In a real implementation, we'd retrieve the quote from storage/cache
    // For now, we'll generate quote data based on the request
    const amount = 500; // This should come from the stored quote
    const sourceCurrency = sourceAccount.currency;
    const targetCurrency = request.recipientAccount.currency;
    
    // Get exchange rate for the currency pair
    const exchangeRate = await this.getExchangeRate(sourceCurrency, targetCurrency);
    
    // Calculate fees
    const fees = this.calculateFees(amount, sourceCurrency, targetCurrency);
    const totalFee = fees.reduce((sum, fee) => sum + fee.amount, 0);
    
    // Calculate target amount
    const targetAmount = sourceCurrency === targetCurrency
      ? amount
      : (amount - totalFee) * exchangeRate.rate;

    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transfer with real user data
    const mockTransfer: Transfer = {
      id: transferId,
      sourceAccountId: sourceAccount.id,
      targetAccountId: request.targetAccountId,
      quoteId: request.quoteId,
      status: {
        status: 'PENDING',
        message: 'Transfer initiated successfully',
        timestamp: new Date().toISOString(),
      },
      sourceAmount: amount,
      sourceCurrency: sourceCurrency,
      targetAmount: Math.round(targetAmount * 100) / 100,
      targetCurrency: targetCurrency,
      exchangeRate: exchangeRate.rate,
      fee: totalFee,
      reference: request.reference || `Transfer ${Date.now()}`,
      description: request.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedArrival: this.calculateEstimatedArrival(sourceCurrency, targetCurrency),
      recipient: request.recipientAccount ? {
        name: request.recipientAccount.holderName,
        iban: request.recipientAccount.iban,
        accountNumber: request.recipientAccount.accountNumber,
        bankName: request.recipientAccount.bankName,
      } : undefined,
    };

    // In real implementation, would store in database
    await this.storeTransfer(mockTransfer, userId);
    
    // Simulate status updates (in production, would be webhook-driven)
    this.simulateTransferProgress(transferId);
    
    return mockTransfer;
  }

  /**
   * Get transfer by ID
   */
  async getTransfer(transferId: string, userId: string): Promise<Transfer | null> {
    // In real implementation, would query database
    try {
      const wiseTransaction = await prisma.wiseTransaction.findFirst({
        where: {
          id: transferId,
          wiseAccount: {
            userId,
          },
        },
        include: {
          wiseAccount: true,
        },
      });

      if (!wiseTransaction) {
        return null;
      }

      // Convert database record to Transfer format
      return {
        id: wiseTransaction.id,
        sourceAccountId: wiseTransaction.wiseAccountId,
        quoteId: `quote_${Date.now()}`,
        status: {
          status: wiseTransaction.status as 'PENDING' | 'PROCESSING' | 'SENT' | 'RECEIVED' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
          message: `Transfer ${wiseTransaction.status.toLowerCase()}`,
          timestamp: wiseTransaction.updatedAt.toISOString(),
        },
        sourceAmount: Number(wiseTransaction.amount),
        sourceCurrency: wiseTransaction.currency,
        targetAmount: Number(wiseTransaction.targetAmount || wiseTransaction.amount),
        targetCurrency: wiseTransaction.targetCurrency || wiseTransaction.currency,
        exchangeRate: Number(wiseTransaction.exchangeRate || 1),
        fee: Number(wiseTransaction.fee || 0),
        reference: wiseTransaction.reference || undefined,
        description: wiseTransaction.description || undefined,
        createdAt: wiseTransaction.createdAt.toISOString(),
        updatedAt: wiseTransaction.updatedAt.toISOString(),
        completedAt: wiseTransaction.completedAt?.toISOString(),
        estimatedArrival: this.calculateEstimatedArrival(
          wiseTransaction.currency,
          wiseTransaction.targetCurrency || wiseTransaction.currency
        ),
      };
    } catch (error) {
      console.error('Error getting transfer:', error);
      return null;
    }
  }

  /**
   * Get user's transfer history
   */
  async getUserTransfers(userId: string, limit = 20, offset = 0): Promise<Transfer[]> {
    try {
      const wiseTransactions = await prisma.wiseTransaction.findMany({
        where: {
          wiseAccount: {
            userId,
          },
        },
        include: {
          wiseAccount: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return wiseTransactions.map(transaction => ({
        id: transaction.id,
        sourceAccountId: transaction.wiseAccountId,
        quoteId: `quote_${Date.now()}`,
        status: {
          status: transaction.status as 'PENDING' | 'PROCESSING' | 'SENT' | 'RECEIVED' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
          message: `Transfer ${transaction.status.toLowerCase()}`,
          timestamp: transaction.updatedAt.toISOString(),
        },
        sourceAmount: Number(transaction.amount),
        sourceCurrency: transaction.currency,
        targetAmount: Number(transaction.targetAmount || transaction.amount),
        targetCurrency: transaction.targetCurrency || transaction.currency,
        exchangeRate: Number(transaction.exchangeRate || 1),
        fee: Number(transaction.fee || 0),
        reference: transaction.reference || undefined,
        description: transaction.description || undefined,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        completedAt: transaction.completedAt?.toISOString(),
        estimatedArrival: this.calculateEstimatedArrival(
          transaction.currency,
          transaction.targetCurrency || transaction.currency
        ),
      }));
    } catch (error) {
      console.error('Error getting user transfers:', error);
      return [];
    }
  }

  /**
   * Store transfer in database
   */
  private async storeTransfer(transfer: Transfer, userId: string): Promise<void> {
    try {
      // Find sender's account
      const senderAccount = await prisma.wiseAccount.findFirst({
        where: {
          userId,
          currency: transfer.sourceCurrency,
        },
      });

      if (!senderAccount) {
        throw new Error('Source account not found');
      }

      // Store outgoing transaction for sender
      await prisma.wiseTransaction.create({
        data: {
          id: transfer.id,
          wiseAccountId: senderAccount.id,
          wiseTransactionId: parseInt(transfer.id.replace(/\D/g, '').slice(-8)) || undefined,
          type: 'TRANSFER',
          status: transfer.status.status,
          amount: -transfer.sourceAmount, // Negative for outgoing
          currency: transfer.sourceCurrency,
          exchangeRate: transfer.exchangeRate,
          targetAmount: transfer.targetAmount,
          targetCurrency: transfer.targetCurrency,
          fee: transfer.fee,
          reference: transfer.reference,
          description: transfer.description || `Transfer to ${transfer.recipient?.name}`,
          completedAt: transfer.completedAt ? new Date(transfer.completedAt) : undefined,
        },
      });

      // Update sender's account balance (subtract amount + fee)
      const newSenderBalance = Number(senderAccount.lastBalance || 0) - (transfer.sourceAmount + transfer.fee);
      await prisma.wiseAccount.update({
        where: { id: senderAccount.id },
        data: {
          lastBalance: newSenderBalance,
          balanceUpdatedAt: new Date(),
        },
      });

      // Find recipient's account by IBAN or account number
      let recipientAccount = null;
      
      console.log('🔍 Looking for recipient account:', {
        iban: transfer.recipient?.iban,
        accountNumber: transfer.recipient?.accountNumber,
        targetCurrency: transfer.targetCurrency
      });
      
      // Try to find by IBAN first
      if (transfer.recipient?.iban) {
        recipientAccount = await prisma.wiseAccount.findFirst({
          where: {
            iban: transfer.recipient.iban,
            currency: transfer.targetCurrency,
            status: 'ACTIVE',
          },
        });
        console.log('📋 Found by IBAN:', !!recipientAccount);
      }
      
      // If not found by IBAN, try by account number
      if (!recipientAccount && transfer.recipient?.accountNumber) {
        recipientAccount = await prisma.wiseAccount.findFirst({
          where: {
            accountNumber: transfer.recipient.accountNumber,
            currency: transfer.targetCurrency,
            status: 'ACTIVE',
          },
        });
        console.log('🔢 Found by account number:', !!recipientAccount);
      }
      
      // If still not found, try to find any account with matching currency
      // This helps in development where account numbers might be different
      if (!recipientAccount) {
        const allAccounts = await prisma.wiseAccount.findMany({
          where: {
            currency: transfer.targetCurrency,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            iban: true,
            accountNumber: true,
            currency: true,
            userId: true,
          },
        });
        console.log('💳 Available accounts for matching:', allAccounts);
        
        // Try to match by partial account number (last 4 digits) as fallback
        if (transfer.recipient?.accountNumber && allAccounts.length > 0) {
          const searchNumber = transfer.recipient.accountNumber.slice(-4);
          const matchedAccount = allAccounts.find(acc => 
            acc.accountNumber?.slice(-4) === searchNumber ||
            acc.iban?.slice(-4) === searchNumber
          );
          
          if (matchedAccount) {
            // Get the full account details including lastBalance
            recipientAccount = await prisma.wiseAccount.findUnique({
              where: { id: matchedAccount.id }
            });
          }
          console.log('🎯 Found by partial match:', !!recipientAccount);
        }
      }

      // Create incoming transaction for recipient if found
      if (recipientAccount) {
          console.log('✅ Creating incoming transaction for recipient:', {
            recipientAccountId: recipientAccount.id,
            amount: transfer.targetAmount,
            currency: transfer.targetCurrency
          });
          
          // Store incoming transaction for recipient
          await prisma.wiseTransaction.create({
            data: {
              id: `${transfer.id}_incoming`,
              wiseAccountId: recipientAccount.id,
              wiseTransactionId: parseInt(transfer.id.replace(/\D/g, '').slice(-8)) || undefined,
              type: 'DEPOSIT',
              status: transfer.status.status,
              amount: transfer.targetAmount, // Positive for incoming
              currency: transfer.targetCurrency,
              exchangeRate: transfer.exchangeRate,
              targetAmount: transfer.targetAmount,
              targetCurrency: transfer.targetCurrency,
              fee: 0, // No fee for recipient
              reference: transfer.reference,
              description: transfer.description || `Transfer from user`,
              completedAt: transfer.completedAt ? new Date(transfer.completedAt) : undefined,
            },
          });

          // Update recipient's balance when transfer completes
          if (transfer.status.status === 'COMPLETED') {
            const newRecipientBalance = Number(recipientAccount.lastBalance || 0) + transfer.targetAmount;
            await prisma.wiseAccount.update({
              where: { id: recipientAccount.id },
              data: {
                lastBalance: newRecipientBalance,
                balanceUpdatedAt: new Date(),
              },
            });
            console.log('💰 Updated recipient balance:', {
              recipientId: recipientAccount.id,
              newBalance: newRecipientBalance
            });
          }
          
          console.log('📝 Incoming transaction created successfully');
      } else {
        console.log('❌ No recipient account found for incoming transaction');
      }
    } catch (error) {
      console.error('Error storing transfer:', error);
      throw error;
    }
  }

  /**
   * Simulate transfer progress updates
   */
  private simulateTransferProgress(transferId: string): void {
    // Simulate faster transfer timeline for development/testing
    const isDev = process.env.NODE_ENV === 'development';
    
    setTimeout(async () => {
      // Update to PROCESSING after 2 seconds (dev) or 30 seconds (prod)
      await this.updateTransferStatus(transferId, 'PROCESSING');
    }, isDev ? 2000 : 30000);

    setTimeout(async () => {
      // Update to SENT after 4 seconds (dev) or 2 minutes (prod)
      await this.updateTransferStatus(transferId, 'SENT');
    }, isDev ? 4000 : 120000);

    setTimeout(async () => {
      // Update to COMPLETED after 6 seconds (dev) or 5 minutes (prod)
      await this.updateTransferStatus(transferId, 'COMPLETED');
    }, isDev ? 6000 : 300000);
  }

  /**
   * Update transfer status
   */
  private async updateTransferStatus(transferId: string, status: string): Promise<void> {
    try {
      // Update outgoing transaction
      await prisma.wiseTransaction.update({
        where: { id: transferId },
        data: {
          status,
          updatedAt: new Date(),
          completedAt: status === 'COMPLETED' ? new Date() : undefined,
        },
      });

      // Update corresponding incoming transaction
      const incomingTxId = `${transferId}_incoming`;
      await prisma.wiseTransaction.updateMany({
        where: { id: incomingTxId },
        data: {
          status,
          updatedAt: new Date(),
          completedAt: status === 'COMPLETED' ? new Date() : undefined,
        },
      });

      // If transfer completed, update recipient balance
      if (status === 'COMPLETED') {
        const incomingTx = await prisma.wiseTransaction.findFirst({
          where: { id: incomingTxId },
          include: { wiseAccount: true },
        });

        if (incomingTx) {
          const newBalance = Number(incomingTx.wiseAccount.lastBalance || 0) + Number(incomingTx.amount);
          await prisma.wiseAccount.update({
            where: { id: incomingTx.wiseAccountId },
            data: {
              lastBalance: newBalance,
              balanceUpdatedAt: new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.error('Error updating transfer status:', error);
    }
  }

  /**
   * Estimate processing time based on currency pair
   */
  private estimateProcessingTime(source: string, target: string): string {
    const sameCurrency = source === target;
    const europeanCurrencies = ['EUR', 'GBP', 'CHF'];
    const isEuropean = europeanCurrencies.includes(source) && europeanCurrencies.includes(target);

    if (sameCurrency) {
      return 'Usually within 1 hour';
    } else if (isEuropean) {
      return 'Usually by the next working day';
    } else {
      return 'Usually within 1-3 working days';
    }
  }

  /**
   * Calculate estimated arrival time
   */
  private calculateEstimatedArrival(source: string, target: string): string {
    const now = new Date();
    const sameCurrency = source === target;
    
    if (sameCurrency) {
      now.setHours(now.getHours() + 1);
    } else {
      now.setDate(now.getDate() + 2); // 2 business days for international
    }
    
    return now.toISOString();
  }

  /**
   * Generate transfer receipt
   */
  async generateReceipt(transferId: string, userId: string): Promise<TransferReceipt | null> {
    const transfer = await this.getTransfer(transferId, userId);
    
    if (!transfer) {
      return null;
    }

    return {
      transferId: transfer.id,
      sourceAccount: {
        iban: 'DE41**********9248', // Would come from actual account
        currency: transfer.sourceCurrency,
        amount: transfer.sourceAmount,
      },
      targetAccount: {
        iban: transfer.recipient?.iban,
        accountNumber: transfer.recipient?.accountNumber,
        currency: transfer.targetCurrency,
        amount: transfer.targetAmount,
        holderName: transfer.recipient?.name || 'Unknown',
        bankName: transfer.recipient?.bankName,
      },
      exchangeRate: transfer.exchangeRate,
      fee: transfer.fee,
      reference: transfer.reference,
      createdAt: transfer.createdAt,
      estimatedArrival: transfer.estimatedArrival || '',
      status: transfer.status.status,
    };
  }
}

export const transferService = new TransferService();