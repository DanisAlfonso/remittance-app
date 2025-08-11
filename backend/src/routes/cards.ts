import { Router, Response } from 'express';
import { stripeCardsService } from '../services/stripe-cards-service';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

/**
 * POST /api/v1/cards/create-virtual
 * Create virtual test card using Stripe Issuing
 */
router.post('/create-virtual', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currency = 'eur', spendingLimit = 500, design = 'classic' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate currency
    if (!['eur', 'usd'].includes(currency)) {
      return res.status(400).json({ error: 'Unsupported currency. Use EUR or USD.' });
    }

    // Validate spending limit
    if (spendingLimit <= 0 || spendingLimit > 10000) {
      return res.status(400).json({ error: 'Spending limit must be between 1 and 10,000' });
    }

    // Check card limit (5 cards max like Wise)
    const existingCards = await stripeCardsService.getUserCards(userId);
    if (existingCards.length >= 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Card limit reached. You can have maximum 5 cards. Please delete a card first to create a new one.' 
      });
    }

    console.log(`💳 [API] Creating virtual ${currency.toUpperCase()} card for user ${userId} (${existingCards.length + 1}/5)`);

    const result = await stripeCardsService.createTestVirtualCard({
      userId,
      currency,
      spendingLimit,
      design,
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [API] Card creation failed:', error);
    
    // Handle specific Stripe errors
    if (error instanceof Error && error.message.includes('You cannot create an Issuing object in test mode')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Stripe Issuing is not enabled in test mode. Please enable it in your Stripe Dashboard.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Card creation failed' 
    });
  }
});

/**
 * GET /api/v1/cards
 * Get user's cards
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🔍 [API] Getting cards for user ${userId}`);

    const cards = await stripeCardsService.getUserCards(userId);

    res.json({ success: true, cards });

  } catch (error) {
    console.error('❌ [API] Failed to get cards:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get cards' 
    });
  }
});

/**
 * POST /api/v1/cards/:cardId/test-purchase
 * Create test purchase using Stripe test helpers
 */
router.post('/:cardId/test-purchase', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { cardId } = req.params;
    const { amount, merchantName = 'Test Merchant' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate amount
    if (!amount || amount <= 0 || amount > 1000) {
      return res.status(400).json({ error: 'Amount must be between 0.01 and 1000' });
    }

    console.log(`🛒 [API] Creating test purchase for card ${cardId}: €${amount}`);

    const result = await stripeCardsService.createTestPurchase({
      cardId,
      amount: Math.round(amount * 100), // Convert to cents
      merchantName,
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [API] Test purchase failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Test purchase failed' 
    });
  }
});

/**
 * GET /api/v1/cards/:cardId/transactions
 * Get card transactions
 */
router.get('/:cardId/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { cardId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`📊 [API] Getting transactions for card ${cardId}`);

    const transactions = await stripeCardsService.getCardTransactions(cardId, limit);

    res.json({ success: true, transactions });

  } catch (error) {
    console.error('❌ [API] Failed to get card transactions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get transactions' 
    });
  }
});

/**
 * PUT /api/v1/cards/:cardId/spending-controls
 * Update card spending controls
 */
router.put('/:cardId/spending-controls', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { cardId } = req.params;
    const { spendingLimit, allowedCategories } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`⚙️ [API] Updating spending controls for card ${cardId}`);

    const result = await stripeCardsService.updateCardSpendingControls({
      cardId,
      spendingLimit,
      allowedCategories,
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [API] Failed to update spending controls:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update spending controls' 
    });
  }
});

/**
 * DELETE /api/v1/cards/:cardId
 * Delete/cancel a card (like Wise)
 */
router.delete('/:cardId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🗑️ [API] Deleting card ${cardId} for user ${userId}`);

    const result = await stripeCardsService.deleteCard(cardId, userId);

    res.json(result);

  } catch (error) {
    console.error('❌ [API] Failed to delete card:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete card' 
    });
  }
});

export default router;