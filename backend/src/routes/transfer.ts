import { Router, Response, RequestHandler } from 'express';
import { z } from 'zod';
import { transferService } from '../services/transfer';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All transfer routes require authentication
router.use(authenticateToken);

// Validation schemas
const quoteRequestSchema = z.object({
  sourceAccountId: z.string().min(1, 'Source account ID is required'),
  targetCurrency: z.string().length(3, 'Target currency must be 3 characters'),
  targetCountry: z.string().length(2, 'Target country must be 2 characters'),
  amount: z.number().min(1, 'Amount must be greater than 0').max(1000000, 'Amount too large'),
  sourceCurrency: z.string().length(3, 'Source currency must be 3 characters'),
  type: z.enum(['BALANCE_PAYOUT', 'BANK_TRANSFER']),
});

const createTransferSchema = z.object({
  quoteId: z.string().min(1, 'Quote ID is required'),
  targetAccountId: z.string().optional(),
  recipientAccount: z.object({
    type: z.enum(['iban', 'sort_code', 'routing_number']),
    iban: z.string().min(1, 'IBAN is required').optional(),
    accountNumber: z.string().optional(),
    sortCode: z.string().optional(),
    routingNumber: z.string().optional(),
    currency: z.string().length(3),
    country: z.string().length(2),
    holderName: z.string().min(1, 'Account holder name is required'),
    bankName: z.string().optional(),
  }).refine((data) => {
    // Validate that required fields are present based on type
    if (data.type === 'iban' && !data.iban) {
      return false;
    }
    if (data.type === 'sort_code' && (!data.accountNumber || !data.sortCode)) {
      return false;
    }
    if (data.type === 'routing_number' && (!data.accountNumber || !data.routingNumber)) {
      return false;
    }
    return true;
  }, {
    message: 'Required account details missing for the specified account type',
  }),
  reference: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

/**
 * POST /api/v1/transfer/quote
 * Get transfer quote with fees and exchange rate
 */
const createQuoteHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = quoteRequestSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    const quote = await transferService.createQuote(validatedData);

    res.json({
      message: 'Quote generated successfully',
      quote,
    });
  } catch (error) {
    console.error('Quote creation error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate quote',
    });
  }
};

/**
 * POST /api/v1/transfer/create
 * Execute a transfer based on a quote
 */
const createTransferHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createTransferSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    const transfer = await transferService.executeTransfer(validatedData, userId);

    res.status(201).json({
      message: 'Transfer created successfully',
      transfer,
    });
  } catch (error) {
    console.error('Transfer creation error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create transfer',
    });
  }
};

/**
 * GET /api/v1/transfer/:id
 * Get transfer details by ID
 */
const getTransferHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    const transfer = await transferService.getTransfer(id, userId);

    if (!transfer) {
      res.status(404).json({
        error: 'Transfer not found',
        message: 'Transfer not found or not accessible',
      });
      return;
    }

    res.json({
      message: 'Transfer retrieved successfully',
      transfer,
    });
  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve transfer',
    });
  }
};

/**
 * GET /api/v1/transfer/history
 * Get user's transfer history
 */
const getTransferHistoryHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    const transfers = await transferService.getUserTransfers(userId, limit, offset);

    res.json({
      message: 'Transfer history retrieved successfully',
      transfers,
      pagination: {
        limit,
        offset,
        total: transfers.length,
      },
    });
  } catch (error) {
    console.error('Get transfer history error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve transfer history',
    });
  }
};

/**
 * GET /api/v1/transfer/:id/receipt
 * Generate transfer receipt
 */
const getTransferReceiptHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
      });
      return;
    }

    const receipt = await transferService.generateReceipt(id, userId);

    if (!receipt) {
      res.status(404).json({
        error: 'Transfer not found',
        message: 'Transfer not found or not accessible',
      });
      return;
    }

    res.json({
      message: 'Receipt generated successfully',
      receipt,
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate receipt',
    });
  }
};

/**
 * GET /api/v1/transfer/rates/:source/:target
 * Get current exchange rate for currency pair
 */
const getExchangeRateHandler: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { source, target } = req.params;

    if (!source || !target) {
      res.status(400).json({
        error: 'Invalid parameters',
        message: 'Source and target currencies are required',
      });
      return;
    }

    const rate = await transferService.getExchangeRate(source.toUpperCase(), target.toUpperCase());

    res.json({
      message: 'Exchange rate retrieved successfully',
      rate,
    });
  } catch (error) {
    console.error('Get exchange rate error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve exchange rate',
    });
  }
};

// Register routes
router.post('/quote', createQuoteHandler);
router.post('/create', createTransferHandler);
router.get('/history', getTransferHistoryHandler);
router.get('/rates/:source/:target', getExchangeRateHandler);
router.get('/:id', getTransferHandler);
router.get('/:id/receipt', getTransferReceiptHandler);

export default router;