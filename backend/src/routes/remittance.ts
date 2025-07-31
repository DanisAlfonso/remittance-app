/**
 * Remittance API Routes
 * 
 * API endpoints for EUR → HNL remittances
 */

import { Router } from 'express';
import { z } from 'zod';
import { remittanceService } from '../services/remittance-service';
import { productionRemittanceService } from '../services/production-remittance-service';
import { ExchangeRateService } from '../services/exchange-rates';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();
const exchangeService = new ExchangeRateService();

// Validation schemas
const remittanceRequestSchema = z.object({
  recipientAccountId: z.string().min(1, 'Recipient account ID is required'),
  amountEUR: z.number().min(1, 'Amount must be at least €1').max(10000, 'Amount cannot exceed €10,000'),
  description: z.string().optional(),
  recipientName: z.string().optional()
});

const exchangeRateQuerySchema = z.object({
  amount: z.string().transform(val => parseFloat(val)).refine(val => val > 0, 'Amount must be positive')
});

/**
 * GET /obp/v5.1.0/remittance/exchange-rate
 * Get current EUR → HNL exchange rate with margin
 */
router.get('/exchange-rate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { amount } = exchangeRateQuerySchema.parse(req.query);

    // Get real-time exchange rate
    const rateResult = await exchangeService.getExchangeRate('EUR', 'HNL');
    
    if (!rateResult.success || !rateResult.rate) {
      res.status(500).json({
        success: false,
        error: 'Unable to fetch exchange rate',
        details: rateResult.error
      });
      return;
    }

    const interBankRate = rateResult.rate;
    const margin = 0.025; // 2.5% company margin
    const customerRate = interBankRate * (1 - margin);
    const hnlAmount = amount * customerRate;
    const platformFee = 0.99; // €0.99 platform fee
    const totalEURDeducted = amount + platformFee;
    const exchangeMargin = amount * (interBankRate - customerRate);

    res.json({
      success: true,
      data: {
        amount: amount,
        currency: 'EUR',
        targetAmount: parseFloat(hnlAmount.toFixed(2)),
        targetCurrency: 'HNL',
        interBankRate: parseFloat(interBankRate.toFixed(4)),
        customerRate: parseFloat(customerRate.toFixed(4)),
        fees: {
          platformFee: platformFee,
          exchangeMargin: parseFloat(exchangeMargin.toFixed(2)),
          totalFee: parseFloat((platformFee + exchangeMargin).toFixed(2))
        },
        totalEURDeducted: parseFloat(totalEURDeducted.toFixed(2)),
        source: rateResult.source,
        timestamp: rateResult.timestamp || Date.now()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
      return;
    }

    console.error('Exchange rate error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /obp/v5.1.0/remittance/send
 * Execute EUR → HNL remittance
 */
router.post('/send', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const validatedData = remittanceRequestSchema.parse(req.body);

    // Execute PRODUCTION remittance with complete master account management
    const result = await productionRemittanceService.executeProductionRemittance({
      senderId: userId,
      recipientAccountId: validatedData.recipientAccountId,
      amountEUR: validatedData.amountEUR,
      description: validatedData.description,
      recipientName: validatedData.recipientName
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        data: {
          transactionId: result.transactionId,
          amountEUR: result.eurDeducted,
          amountHNL: result.hnlDeposited,
          exchangeRate: result.exchangeRate,
          fees: result.fees,
          masterAccountImpact: result.masterAccountImpact,
          timeline: result.timeline
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message || 'Remittance failed',
        code: result.error?.code,
        details: result.error?.details
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
      return;
    }

    console.error('Remittance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /obp/v5.1.0/remittance/status/:transactionId
 * Get remittance transaction status
 */
router.get('/status/:transactionId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    // Get transaction status
    const result = await remittanceService.getRemittanceStatus(transactionId);

    if (result.success && result.transaction) {
      // Verify user owns this transaction
      if (result.transaction.user.firstName && result.transaction.user.email !== req.user?.email) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this transaction'
        });
        return;
      }

      // Parse metadata
      let metadata = {};
      try {
        metadata = JSON.parse(result.transaction.metadata || '{}');
      } catch {
        // Ignore parse errors
      }

      res.json({
        success: true,
        data: {
          transactionId: result.transaction.id,
          status: result.transaction.status,
          amountEUR: parseFloat(result.transaction.amount.toString()),
          amountHNL: parseFloat(result.transaction.targetAmount?.toString() || '0'),
          exchangeRate: parseFloat(result.transaction.exchangeRate?.toString() || '0'),
          fees: {
            platformFee: parseFloat(result.transaction.platformFee?.toString() || '0'),
            totalFee: parseFloat(result.transaction.totalFee?.toString() || '0')
          },
          description: result.transaction.description,
          createdAt: result.transaction.createdAt,
          completedAt: result.transaction.completedAt,
          metadata: metadata,
          user: {
            name: `${result.transaction.user.firstName} ${result.transaction.user.lastName}`,
            email: result.transaction.user.email
          }
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

  } catch (error) {
    console.error('Transaction status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /obp/v5.1.0/remittance/recipients
 * Get user's recipients (beneficiaries) for remittances
 */
router.get('/recipients', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    // Get user's beneficiaries
    const beneficiaries = await prisma.beneficiary.findMany({
      where: { 
        userId: userId,
        country: 'HN' // Only Honduras recipients for EUR → HNL
      },
      orderBy: { createdAt: 'desc' }
    });

    const recipients = beneficiaries.map(beneficiary => ({
      id: beneficiary.id,
      name: `${beneficiary.firstName} ${beneficiary.lastName}`,
      accountNumber: beneficiary.accountNumber,
      bankName: beneficiary.bankName,
      phone: beneficiary.phone,
      address: beneficiary.address,
      country: beneficiary.country
    }));

    res.json({
      success: true,
      data: recipients
    });

  } catch (error) {
    console.error('Recipients error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /obp/v5.1.0/remittance/history
 * Get user's remittance transaction history
 */
router.get('/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Get user's remittance transactions
    const transactions = await prisma.transaction.findMany({
      where: { 
        userId: userId,
        type: 'OUTBOUND_TRANSFER',
        targetCurrency: 'HNL' // EUR → HNL remittances
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.transaction.count({
      where: { 
        userId: userId,
        type: 'OUTBOUND_TRANSFER',
        targetCurrency: 'HNL'
      }
    });

    const remittances = transactions.map(tx => {
      let metadata = {};
      try {
        metadata = JSON.parse(tx.metadata || '{}');
      } catch {
        // Ignore parse errors
      }

      return {
        transactionId: tx.id,
        status: tx.status,
        amountEUR: parseFloat(tx.amount.toString()),
        amountHNL: parseFloat(tx.targetAmount?.toString() || '0'),
        exchangeRate: parseFloat(tx.exchangeRate?.toString() || '0'),
        fees: {
          platformFee: parseFloat(tx.platformFee?.toString() || '0'),
          totalFee: parseFloat(tx.totalFee?.toString() || '0')
        },
        description: tx.description,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
        recipientName: (metadata as Record<string, unknown>).recipientName as string || 'Unknown recipient'
      };
    });

    res.json({
      success: true,
      data: {
        remittances,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Remittance history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;