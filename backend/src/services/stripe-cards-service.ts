import Stripe from 'stripe';
import { prisma } from '../config/database';

export class StripeCardsService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  /**
   * Create test virtual card following Stripe Issuing documentation
   * Falls back to development simulation if Stripe Issuing is not enabled
   */
  async createTestVirtualCard({
    userId,
    currency = 'eur',
    spendingLimit = 500, // €500 daily limit
    design = 'classic',
  }: {
    userId: string;
    currency?: 'eur' | 'usd';
    spendingLimit?: number;
    design?: string;
  }) {
    try {
      console.log(`💳 [STRIPE-ISSUING] Creating virtual card for user ${userId} (${currency.toUpperCase()})`);

      // 1. Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      try {
        // 2. Try to create cardholder first (required by Stripe Issuing)
        console.log('👤 Creating cardholder...');
        const cardholder = await this.stripe.issuing.cardholders.create({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          type: 'individual',
          billing: {
            address: {
              line1: '123 Test Street',
              city: currency === 'eur' ? 'Madrid' : 'New York',
              country: currency === 'eur' ? 'ES' : 'US',
              postal_code: currency === 'eur' ? '28001' : '10001',
              state: currency === 'eur' ? undefined : 'NY',
            }
          },
          // Add required individual information for test mode
          individual: {
            first_name: user.firstName,
            last_name: user.lastName,
            dob: {
              day: 1,
              month: 1,
              year: 1990
            }
          },
          // Required phone number for 3D Secure
          phone_number: '+34600123456', // Spanish test number for EUR cards
          // Spending controls at cardholder level
          spending_controls: {
            spending_limits: [
              {
                amount: spendingLimit * 100, // Convert to cents
                interval: 'daily',
              },
              {
                amount: spendingLimit * 100 * 7, // Weekly limit
                interval: 'weekly',
              }
            ],
            allowed_categories: [
              'grocery_stores_supermarkets',
              'service_stations',
              'eating_places_restaurants',
              'miscellaneous',
            ]
          },
          metadata: {
            userId,
            environment: 'test',
            purpose: 'remittance_card',
          }
        });

        console.log(`✅ Cardholder created: ${cardholder.id}`);

        // 3. Create virtual card
        console.log('💳 Creating virtual card...');
        const card = await this.stripe.issuing.cards.create({
          cardholder: cardholder.id,
          currency,
          type: 'virtual',
          status: 'active',
          // Additional spending controls at card level
          spending_controls: {
            spending_limits: [
              {
                amount: 10000, // €100 per authorization
                interval: 'per_authorization',
              }
            ]
          },
          metadata: {
            userId,
            environment: 'test',
            linkedCurrency: currency.toUpperCase(),
            purpose: 'spending_card',
          }
        });

        console.log(`✅ Virtual card created: ${card.id}`);

        // 4. Store in database
        const cardRecord = await prisma.issuedCard.create({
          data: {
            userId,
            stripeCardId: card.id,
            stripeCardholderId: cardholder.id,
            currency: currency.toUpperCase(),
            cardType: 'VIRTUAL',
            status: 'ACTIVE',
            spendingLimit: spendingLimit,
            isTestCard: true,
            design: design,
            createdAt: new Date(),
          }
        });

        return {
          success: true,
          card: {
            id: card.id,
            last4: card.last4,
            brand: card.brand,
            currency: currency.toUpperCase(),
            status: card.status,
            type: 'virtual',
            spendingLimit,
            isTestCard: true,
            expiryMonth: card.exp_month,
            expiryYear: card.exp_year,
            cardholderId: cardholder.id,
          }
        };

      } catch (stripeError: any) {
        // Check if this is a Stripe Issuing not enabled error
        if (stripeError.message && stripeError.message.includes('not set up to use Issuing')) {
          console.log('⚠️ [STRIPE-ISSUING] Stripe Issuing not enabled, creating development simulation card...');
          
          // Create simulated card for development
          const simulatedCardId = `card_test_${Date.now()}`;
          const simulatedCardholderId = `cardholder_test_${Date.now()}`;
          
          // Store simulated card in database
          const cardRecord = await prisma.issuedCard.create({
            data: {
              userId,
              stripeCardId: simulatedCardId,
              stripeCardholderId: simulatedCardholderId,
              currency: currency.toUpperCase(),
              cardType: 'VIRTUAL',
              status: 'ACTIVE',
              spendingLimit: spendingLimit,
              isTestCard: true,
              design: design,
              createdAt: new Date(),
            }
          });

          console.log(`✅ Development simulation card created: ${simulatedCardId}`);

          return {
            success: true,
            card: {
              id: simulatedCardId,
              last4: '4242', // Stripe test card last4
              brand: 'visa',
              currency: currency.toUpperCase(),
              status: 'active',
              type: 'virtual',
              spendingLimit,
              isTestCard: true,
              expiryMonth: 12,
              expiryYear: new Date().getFullYear() + 3,
              cardholderId: simulatedCardholderId,
              isDevelopmentCard: true,
            }
          };
        } else {
          throw stripeError;
        }
      }

    } catch (error) {
      console.error('❌ [STRIPE-ISSUING] Card creation failed:', error);
      throw new Error(`Card creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's cards
   */
  async getUserCards(userId: string) {
    try {
      const cardRecords = await prisma.issuedCard.findMany({
        where: {
          userId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      });

      const cards = await Promise.all(
        cardRecords.map(async (record) => {
          try {
            // Handle development simulation cards
            if (record.stripeCardId.startsWith('card_test_')) {
              return {
                id: record.stripeCardId,
                last4: '4242',
                brand: 'visa',
                currency: record.currency,
                status: 'active',
                type: 'virtual',
                isTestCard: record.isTestCard,
                spendingLimit: record.spendingLimit,
                expiryMonth: 12,
                expiryYear: new Date().getFullYear() + 3,
                design: record.design,
                isDevelopmentCard: true,
              };
            }

            // Handle real Stripe cards
            const card = await this.stripe.issuing.cards.retrieve(record.stripeCardId);
            return {
              id: card.id,
              last4: card.last4,
              brand: card.brand,
              currency: record.currency,
              status: card.status,
              type: card.type,
              isTestCard: record.isTestCard,
              spendingLimit: record.spendingLimit,
              expiryMonth: card.exp_month,
              expiryYear: card.exp_year,
              design: record.design,
            };
          } catch (error) {
            console.error(`❌ Failed to get card details for ${record.stripeCardId}:`, error);
            return null;
          }
        })
      );

      return cards.filter(card => card !== null);

    } catch (error) {
      console.error('❌ [STRIPE-ISSUING] Failed to get user cards:', error);
      throw error;
    }
  }

  /**
   * Create test purchase using Stripe test helpers (official sandbox method)
   * Falls back to development simulation if Stripe Issuing is not enabled
   */
  async createTestPurchase({
    cardId,
    amount,
    merchantName = 'Test Grocery Store',
    merchantCategory = 'grocery_stores_supermarkets',
  }: {
    cardId: string;
    amount: number; // in cents
    merchantName?: string;
    merchantCategory?: string;
  }) {
    try {
      console.log(`🛒 [TEST-PURCHASE] Creating test purchase: €${amount/100} at ${merchantName}`);

      // Check if this is a development simulation card
      if (cardId.startsWith('card_test_')) {
        console.log('🔄 [TEST-PURCHASE] Development simulation card detected, creating simulated transaction...');
        
        const simulatedAuthId = `auth_test_${Date.now()}`;
        const simulatedTransactionId = `tx_test_${Date.now()}`;
        
        // Simulate successful transaction
        console.log(`✅ Simulated transaction created: ${simulatedTransactionId}`);
        
        return {
          success: true,
          authorizationId: simulatedAuthId,
          transactionId: simulatedTransactionId,
          amount: amount / 100,
          merchantName,
          status: 'completed',
          isDevelopmentTransaction: true,
        };
      }

      // Use official Stripe test helpers for real cards
      const authorization = await this.stripe.testHelpers.issuing.authorizations.create({
        card: cardId,
        amount,
        currency: 'eur',
        merchant_data: {
          category: merchantCategory,
          name: merchantName,
          city: 'Madrid',
          country: 'ES',
        }
      });

      console.log(`✅ Test authorization created: ${authorization.id}`);

      // Capture the transaction (complete the purchase)
      const transaction = await this.stripe.testHelpers.issuing.transactions.createForceCapture({
        card: cardId,
        amount,
        currency: 'eur',
        merchant_data: {
          category: merchantCategory,
          name: merchantName,
          city: 'Madrid',
          country: 'ES',
        }
      });

      console.log(`✅ Test transaction captured: ${transaction.id}`);

      return {
        success: true,
        authorizationId: authorization.id,
        transactionId: transaction.id,
        amount: amount / 100,
        merchantName,
        status: 'completed',
      };

    } catch (error) {
      console.error('❌ [TEST-PURCHASE] Failed to create test purchase:', error);
      
      // Parse Stripe error for user-friendly message
      if (error instanceof Stripe.errors.StripeCardError) {
        return {
          success: false,
          error: error.message,
          decline_code: error.decline_code,
        };
      }
      
      throw error;
    }
  }

  /**
   * Get card transactions
   */
  async getCardTransactions(cardId: string, limit: number = 10) {
    try {
      const transactions = await this.stripe.issuing.transactions.list({
        card: cardId,
        limit,
      });

      return transactions.data.map(transaction => ({
        id: transaction.id,
        amount: transaction.amount / 100,
        currency: transaction.currency.toUpperCase(),
        merchantName: transaction.merchant_data.name,
        merchantCategory: transaction.merchant_data.category,
        status: transaction.status,
        created: new Date(transaction.created * 1000),
      }));

    } catch (error) {
      console.error('❌ Failed to get card transactions:', error);
      throw error;
    }
  }

  /**
   * Delete/cancel card (like Wise)
   */
  async deleteCard(cardId: string, userId: string) {
    try {
      console.log(`🗑️ [STRIPE-ISSUING] Deleting card ${cardId}`);

      // Find the card record to verify ownership
      const cardRecord = await prisma.issuedCard.findFirst({
        where: {
          stripeCardId: cardId,
          userId: userId,
          status: 'ACTIVE'
        }
      });

      if (!cardRecord) {
        throw new Error('Card not found or not owned by user');
      }

      // Handle development simulation cards
      if (cardId.startsWith('card_test_')) {
        console.log('🔄 [CARD-DELETE] Development simulation card, updating database only...');
        
        await prisma.issuedCard.update({
          where: { id: cardRecord.id },
          data: { 
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        });

        console.log(`✅ Development card cancelled: ${cardId}`);
        
        return {
          success: true,
          message: 'Card deleted successfully'
        };
      }

      // Cancel the real Stripe card
      const card = await this.stripe.issuing.cards.update(cardId, {
        status: 'canceled'
      });

      // Update database record
      await prisma.issuedCard.update({
        where: { id: cardRecord.id },
        data: { 
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });

      console.log(`✅ Card cancelled successfully: ${cardId}`);

      return {
        success: true,
        message: 'Card deleted successfully'
      };

    } catch (error) {
      console.error('❌ [STRIPE-ISSUING] Card deletion failed:', error);
      throw new Error(`Card deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update card spending controls
   */
  async updateCardSpendingControls({
    cardId,
    spendingLimit,
    allowedCategories,
  }: {
    cardId: string;
    spendingLimit?: number;
    allowedCategories?: string[];
  }) {
    try {
      const updateData: any = {};

      if (spendingLimit || allowedCategories) {
        updateData.spending_controls = {};
        
        if (spendingLimit) {
          updateData.spending_controls.spending_limits = [
            {
              amount: spendingLimit * 100,
              interval: 'daily',
            }
          ];
        }

        if (allowedCategories) {
          updateData.spending_controls.allowed_categories = allowedCategories;
        }
      }

      const card = await this.stripe.issuing.cards.update(cardId, updateData);

      return {
        success: true,
        card: {
          id: card.id,
          status: card.status,
          spendingControls: card.spending_controls,
        }
      };

    } catch (error) {
      console.error('❌ Failed to update card spending controls:', error);
      throw error;
    }
  }
}

export const stripeCardsService = new StripeCardsService();