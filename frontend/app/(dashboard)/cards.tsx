import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '../../lib/auth';
import { config } from '../../utils/config';
import { CardDesigns, CardDesignProps } from '../../components/CardDesigns';
import CardDesignSelector, { CardDesignType } from '../../components/CardDesignSelector';

interface Card {
  id: string;
  last4: string;
  brand: string;
  currency: string;
  status: string;
  type: 'virtual' | 'physical';
  isTestCard: boolean;
  spendingLimit: number;
  expiryMonth: number;
  expiryYear: number;
  design?: CardDesignType;
}

export default function CardsScreen() {
  const { currency } = useLocalSearchParams<{ currency: string }>();
  const { token } = useAuthStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<CardDesignType>('classic');
  const [showDesignSelector, setShowDesignSelector] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/v1/cards`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      const result = await response.json();
      if (result.success) {
        setCards(result.cards);
      } else {
        console.error('Failed to load cards:', result.error);
      }
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVirtualCard = async () => {
    // Check card limit (5 cards max like Wise)
    if (cards.length >= 5) {
      Alert.alert(
        'Card Limit Reached',
        'You can have maximum 5 cards. Please delete a card first to create a new one.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Show design selector
    setShowDesignSelector(true);
  };

  const createCardWithDesign = async (design: CardDesignType) => {
    setIsCreatingCard(true);
    try {
      console.log('Creating virtual card for currency:', currency, 'with design:', design);
      
      const response = await fetch(`${config.API_URL}/api/v1/cards/create-virtual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currency: currency?.toLowerCase() || 'eur',
          spendingLimit: 500, // €500 daily limit
          design, // Include selected design
        })
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '🎉 Virtual Card Created!',
          `Your ${currency} test card is ready!\n\n` +
          `• Card: **** **** **** ${result.card.last4}\n` +
          `• Brand: ${result.card.brand.toUpperCase()}\n` +
          `• Daily Limit: ${currency} ${result.card.spendingLimit}\n` +
          `• Type: Stripe Test Card\n\n` +
          `You can now test purchases with this card!`,
          [
            {
              text: 'Test Purchase',
              onPress: () => handleTestPurchase(result.card.id),
            },
            { 
              text: 'OK', 
              onPress: () => {
                loadCards();
              }
            }
          ]
        );
      } else {
        Alert.alert('Card Creation Failed', result.error || 'Please try again.');
      }
    } catch (error) {
      console.error('Card creation error:', error);
      Alert.alert('Error', 'Failed to create card. Please try again.');
    } finally {
      setIsCreatingCard(false);
    }
  };

  const handleTestPurchase = (cardId: string) => {
    // Use a fixed amount for cross-platform compatibility
    Alert.alert(
      '🛒 Test Purchase',
      `Make a test purchase of ${currency} 25.99 at Test Grocery Store?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase €25.99',
          onPress: () => performTestPurchase(cardId, 25.99)
        }
      ]
    );
  };

  const handleDeleteCard = (cardId: string, cardDesign: string) => {
    Alert.alert(
      'Delete Card',
      `Are you sure you want to delete this ${cardDesign} card? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteCard(cardId)
        }
      ]
    );
  };

  const deleteCard = async (cardId: string) => {
    setDeletingCardId(cardId);
    try {
      const response = await fetch(`${config.API_URL}/api/v1/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Card Deleted', 'Your card has been successfully deleted.');
        loadCards(); // Refresh the list
      } else {
        Alert.alert('Delete Failed', result.error || 'Could not delete card.');
      }
    } catch (error) {
      console.error('Delete card error:', error);
      Alert.alert('Error', 'Failed to delete card. Please try again.');
    } finally {
      setDeletingCardId(null);
    }
  };

  const performTestPurchase = async (cardId: string, amount: number) => {
    try {
      console.log(`Making test purchase: ${amount} on card ${cardId}`);
      
      const response = await fetch(`${config.API_URL}/api/v1/cards/${cardId}/test-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          merchantName: 'Test Grocery Store',
        })
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '✅ Test Purchase Successful!',
          `${currency} ${result.amount} charged successfully!\n\n` +
          `• Merchant: ${result.merchantName}\n` +
          `• Status: ${result.status}\n` +
          `• Auth ID: ${result.authorizationId}\n\n` +
          `This was a Stripe sandbox transaction - no real money involved!`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert(
          'Purchase Failed', 
          result.error || 'Test purchase could not be completed.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Test purchase error:', error);
      Alert.alert('Error', 'Failed to process test purchase.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading cards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </Pressable>
        <Text style={styles.title}>Cards</Text>
        <View />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Cards Yet</Text>
            <Text style={styles.emptyText}>
              Create a virtual test card to try out Stripe Issuing functionality.
            </Text>
            <Text style={styles.emptySubtext}>
              This will create a real Stripe test card that you can use for sandbox testing.
            </Text>
            
            <Pressable
              style={[styles.createCardButton, isCreatingCard && styles.createCardButtonDisabled]}
              onPress={handleCreateVirtualCard}
              disabled={isCreatingCard}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createCardText}>
                {isCreatingCard ? 'Creating Card...' : `Create ${currency} Test Card`}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Cards</Text>
              <Text style={styles.cardCount}>{cards.length}/5</Text>
            </View>
            
            {cards.map(card => {
              const cardProps: CardDesignProps = {
                cardNumber: `**** **** **** ${card.last4}`,
                holderName: 'REMITPAY USER',
                expiryMonth: card.expiryMonth,
                expiryYear: card.expiryYear,
                brand: card.brand,
                currency: card.currency,
                isTestCard: card.isTestCard,
              };
              
              const cardDesign = card.design || 'classic';
              
              return (
                <View key={card.id} style={styles.cardItem}>
                  <View style={styles.cardContainer}>
                    {CardDesigns[cardDesign](cardProps)}
                  </View>
                  
                  <View style={styles.cardActions}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardInfoTitle}>{cardDesign.charAt(0).toUpperCase() + cardDesign.slice(1)} Card</Text>
                      <Text style={styles.cardLimit}>Daily limit: {card.currency} {card.spendingLimit}</Text>
                      <Text style={styles.cardStatus}>Status: {card.status}</Text>
                    </View>
                    
                    <View style={styles.cardButtons}>
                      <Pressable
                        style={styles.cardButton}
                        onPress={() => handleTestPurchase(card.id)}
                      >
                        <Ionicons name="storefront-outline" size={16} color="#3B82F6" />
                        <Text style={styles.cardButtonText}>Test Purchase</Text>
                      </Pressable>
                      
                      <Pressable
                        style={styles.cardButton}
                        onPress={() => {
                          Alert.alert(
                            '🔢 Card PIN',
                            'Your card PIN is: 1234\n\n(This is a demo PIN for testing)',
                            [{ text: 'OK' }]
                          );
                        }}
                      >
                        <Ionicons name="keypad-outline" size={16} color="#059669" />
                        <Text style={styles.cardButtonText}>Show PIN</Text>
                      </Pressable>
                      
                      <Pressable
                        style={styles.cardButton}
                        onPress={() => {
                          Alert.alert(
                            '💳 Card Details',
                            `Card Number: 4242 4242 4242 ${card.last4}\nExpiry: ${card.expiryMonth.toString().padStart(2, '0')}/${card.expiryYear}\nCVV: 123\n\n(Demo details for testing)`,
                            [{ text: 'OK' }]
                          );
                        }}
                      >
                        <Ionicons name="card-outline" size={16} color="#7C3AED" />
                        <Text style={styles.cardButtonText}>Show Details</Text>
                      </Pressable>
                      
                      <Pressable
                        style={[styles.cardButton, styles.deleteButton, deletingCardId === card.id && styles.disabledButton]}
                        onPress={() => handleDeleteCard(card.id, cardDesign)}
                        disabled={deletingCardId === card.id}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={[styles.cardButtonText, styles.deleteButtonText]}>
                          {deletingCardId === card.id ? 'Deleting...' : 'Delete'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
            
            <Pressable
              style={[styles.addCardButton, isCreatingCard && styles.addCardButtonDisabled]}
              onPress={handleCreateVirtualCard}
              disabled={isCreatingCard}
            >
              <Ionicons name="add" size={20} color="#3B82F6" />
              <Text style={styles.addCardText}>
                {isCreatingCard ? 'Creating...' : `Add Another ${currency} Card`}
              </Text>
            </Pressable>
            
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                🎉 <Text style={styles.boldText}>Stripe Issuing Enabled:</Text> These are Stripe test cards for sandbox testing. 
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Card Design Selector Modal */}
      <CardDesignSelector
        visible={showDesignSelector}
        onClose={() => setShowDesignSelector(false)}
        onSelect={(design) => {
          setSelectedDesign(design);
          createCardWithDesign(design);
        }}
        selectedDesign={selectedDesign}
        cardProps={{
          cardNumber: `**** **** **** 4242`,
          holderName: 'REMITPAY USER',
          expiryMonth: 12,
          expiryYear: 2027,
          brand: 'visa',
          currency: currency?.toUpperCase() || 'EUR',
          isTestCard: true,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  cardCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },
  createCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createCardButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createCardText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardActions: {
    gap: 16,
  },
  cardInfo: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  cardButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
    minWidth: 90,
    justifyContent: 'center',
  },
  cardButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cardLimit: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  cardStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  testPurchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'stretch',
    gap: 8,
  },
  testPurchaseText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  addCardButtonDisabled: {
    opacity: 0.5,
  },
  addCardText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
  },
});
