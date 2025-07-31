import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../lib/walletStore';
import { useAuthStore } from '../../lib/auth';

export default function PaymentMethodScreen() {
  const { currency } = useLocalSearchParams<{ currency?: string }>();
  const { selectedAccount, accounts, refreshBalance } = useWalletStore();
  const { user } = useAuthStore();
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [eurBalance, setEurBalance] = useState<number>(0);

  useEffect(() => {
    loadUserBalance();
  }, [selectedAccount]);

  const loadUserBalance = async () => {
    setIsLoadingBalance(true);
    try {
      // Find user's EUR account
      const eurAccount = accounts.find(acc => acc.currency === 'EUR');
      if (eurAccount) {
        console.log('🔍 Found EUR account:', eurAccount.id, 'Loading balance...');
        
        // Use the wallet store to refresh the balance
        await refreshBalance(eurAccount.id);
        
        // Get the updated balance from the wallet store
        const { balance } = useWalletStore.getState();
        if (balance && balance.amount) {
          let balanceValue: number;
          
          // Handle different balance formats
          if (typeof balance.amount === 'string') {
            balanceValue = parseFloat(balance.amount);
          } else if (typeof balance.amount === 'object' && 'value' in balance.amount) {
            balanceValue = balance.amount.value;
          } else if (typeof balance.amount === 'number') {
            balanceValue = balance.amount;
          } else {
            console.warn('⚠️ Balance format unexpected:', balance);
            setEurBalance(0);
            return;
          }
          
          if (!isNaN(balanceValue)) {
            console.log('💰 EUR balance loaded:', balanceValue);
            setEurBalance(balanceValue);
          } else {
            console.warn('⚠️ Could not parse balance value:', balance.amount);
            setEurBalance(0);
          }
        } else {
          console.warn('⚠️ No balance data found:', balance);
          setEurBalance(0);
        }
      } else {
        console.log('📝 No EUR account found, setting balance to 0');
        setEurBalance(0);
      }
    } catch (error) {
      console.error('❌ Error loading EUR balance:', error);
      setEurBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleUseBalance = () => {
    if (eurBalance <= 0) {
      Alert.alert(
        'Insufficient Balance',
        'You need to add funds to your EUR account first.',
        [
          { text: 'Add Funds', onPress: () => router.push('/(dashboard)/add-funds') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Route to existing send-money flow with balance payment type
    router.push({
      pathname: '/(dashboard)/send-money',
      params: { 
        currency: 'EUR',
        paymentType: 'balance'
      }
    });
  };

  const handleDirectPayment = () => {
    // Route to direct payment flow (new implementation)
    router.push({
      pathname: '/(dashboard)/direct-payment',
      params: { 
        currency: 'EUR',
        paymentType: 'direct'
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.modernScrollView}
        contentContainerStyle={styles.modernScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepContainer}>
          {/* Modern Header */}
          <View style={styles.modernHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Send EUR</Text>
              <Text style={styles.headerSubtitle}>Choose payment method</Text>
            </View>
            <View style={styles.headerAction} />
          </View>

          <View style={styles.modernContent}>
            {/* Option 1: Use Balance */}
            <TouchableOpacity 
              style={[
                styles.modernPaymentCard,
                eurBalance <= 0 && styles.disabledCard
              ]} 
              onPress={handleUseBalance}
              disabled={eurBalance <= 0}
            >
              <View style={styles.modernPaymentIcon}>
                <Ionicons name="wallet" size={28} color="#10B981" />
              </View>
              <View style={styles.modernCardContent}>
                <Text style={styles.modernCardTitle}>Use EUR Balance</Text>
                {isLoadingBalance ? (
                  <View style={styles.balanceLoader}>
                    <ActivityIndicator size="small" color="#6B7280" />
                    <Text style={styles.modernCardSubtitle}>Loading balance...</Text>
                  </View>
                ) : (
                  <Text style={[
                    styles.modernCardSubtitle,
                    eurBalance <= 0 && styles.insufficientBalance
                  ]}>
                    {eurBalance > 0 
                      ? `Available: €${eurBalance.toFixed(2)}`
                      : 'Insufficient balance - Add funds first'
                    }
                  </Text>
                )}
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="flash" size={14} color="#10B981" />
                    <Text style={styles.featureText}>Instant transfer</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                    <Text style={styles.featureText}>From your account</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardAction}>
                {eurBalance > 0 ? (
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                ) : (
                  <View style={styles.disabledIndicator}>
                    <Ionicons name="lock-closed" size={16} color="#D1D5DB" />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Option 2: Direct Payment */}
            <TouchableOpacity 
              style={styles.modernPaymentCard} 
              onPress={handleDirectPayment}
            >
              <View style={styles.modernPaymentIcon}>
                <Ionicons name="card" size={28} color="#3B82F6" />
              </View>
              <View style={styles.modernCardContent}>
                <Text style={styles.modernCardTitle}>Pay with Card/Bank</Text>
                <Text style={styles.modernCardSubtitle}>
                  Pay directly without pre-funding
                </Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="trending-up" size={14} color="#3B82F6" />
                    <Text style={styles.featureText}>Best exchange rates</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="globe" size={14} color="#3B82F6" />
                    <Text style={styles.featureText}>Direct to recipient</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardAction}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            {/* Payment Method Comparison */}
            <View style={styles.comparisonSection}>
              <Text style={styles.comparisonTitle}>Why choose direct payment?</Text>
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonItem}>
                  <Ionicons name="timer" size={20} color="#10B981" />
                  <View style={styles.comparisonContent}>
                    <Text style={styles.comparisonLabel}>No pre-funding needed</Text>
                    <Text style={styles.comparisonDesc}>Send money instantly without adding funds first</Text>
                  </View>
                </View>
                
                <View style={styles.comparisonDivider} />
                
                <View style={styles.comparisonItem}>
                  <Ionicons name="trending-up" size={20} color="#3B82F6" />
                  <View style={styles.comparisonContent}>
                    <Text style={styles.comparisonLabel}>Live exchange rates</Text>
                    <Text style={styles.comparisonDesc}>Get the best EUR → HNL rates in real-time</Text>
                  </View>
                </View>
                
                <View style={styles.comparisonDivider} />
                
                <View style={styles.comparisonItem}>
                  <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
                  <View style={styles.comparisonContent}>
                    <Text style={styles.comparisonLabel}>Production-grade security</Text>
                    <Text style={styles.comparisonDesc}>Bank-level security with complete audit trails</Text>
                  </View>
                </View>
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🎨 Base Layout
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modernScrollView: {
    flex: 1,
  },
  modernScrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  stepContainer: {
    flex: 1,
  },

  // 🌟 Modern Header
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  headerAction: {
    width: 44,
    height: 44,
  },

  // 🏗️ Modern Content
  modernContent: {
    padding: 16,
    gap: 24,
  },
  
  // 💳 Modern Payment Cards
  modernPaymentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-start',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 20,
  },
  disabledCard: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },
  modernPaymentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modernCardContent: {
    flex: 1,
  },
  modernCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  modernCardSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 16,
  },
  insufficientBalance: {
    color: '#EF4444',
    fontWeight: '600',
  },
  balanceLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardAction: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledIndicator: {
    padding: 4,
  },

  // 🎯 Feature Lists
  featureList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // 📊 Comparison Section
  comparisonSection: {
    marginTop: 8,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  comparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  comparisonContent: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  comparisonDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  comparisonDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },

  // 📈 Stats Section
  statsSection: {
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
});