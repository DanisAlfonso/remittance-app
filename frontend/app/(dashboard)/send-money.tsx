import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../lib/walletStore';
import { useAuthStore } from '../../lib/auth';
import { apiClient } from '../../lib/api';

type FlowStep = 'recipients' | 'currency' | 'method' | 'amount' | 'processing';

interface Recipient {
  id: string;
  name: string;
  email?: string;
  iban?: string;
  currency: string;
  country: string;
  lastUsed: string;
}

export default function SendMoneyScreen() {
  const { selectedAccount } = useWalletStore();
  const { user, token } = useAuthStore();
  const [step, setStep] = useState<FlowStep>('recipients');
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'HNL' | null>(null);
  const [recentRecipients, setRecentRecipients] = useState<Recipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  useEffect(() => {
    if (!selectedAccount) {
      Alert.alert('No Account Selected', 'Please select an account first', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      loadRecentRecipients();
    }
  }, [selectedAccount]);

  const loadRecentRecipients = async () => {
    if (!user || !token) {
      return;
    }
    
    setIsLoadingRecipients(true);
    try {
      // Fetch user's transfer history from wise transfers
      const response = await apiClient.get('/wise/transfers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const transfers = (response as { transfers: Array<{
        recipient?: {
          name?: string;
          email?: string;
          iban?: string;
          accountNumber?: string;
          bankName?: string;
        };
        targetCurrency: string;
        sourceCurrency: string;
        createdAt: string;
        sourceAmount: number;
      }> }).transfers || [];
      
      // Extract unique recipients from transfers
      const recipientMap = new Map<string, Recipient>();
      
      transfers.forEach((transfer: {
        recipient?: {
          name?: string;
          email?: string;
          iban?: string;
          accountNumber?: string;
          bankName?: string;
        };
        targetCurrency: string;
        sourceCurrency: string;
        createdAt: string;
        sourceAmount: number;
      }) => {
        // Only include outgoing transfers (sent money) where sourceAmount is negative
        if (transfer.sourceAmount < 0 && transfer.recipient && transfer.recipient.name) {
          const recipientKey = transfer.recipient.iban || transfer.recipient.accountNumber || transfer.recipient.name;
          const existing = recipientMap.get(recipientKey);
          
          // Keep the most recent transfer for each recipient
          if (!existing || new Date(transfer.createdAt) > new Date(existing.lastUsed)) {
            recipientMap.set(recipientKey, {
              id: recipientKey,
              name: transfer.recipient.name,
              email: transfer.recipient.email,
              iban: transfer.recipient.iban,
              currency: transfer.targetCurrency,
              country: getCountryFromCurrency(transfer.targetCurrency),
              lastUsed: formatRelativeTime(transfer.createdAt)
            });
          }
        }
      });
      
      // Convert to array and sort by most recent
      const recipients = Array.from(recipientMap.values()).slice(0, 5); // Show max 5 recent recipients
      setRecentRecipients(recipients);
    } catch (error) {
      console.error('Error loading recent recipients:', error);
      // Don't show error to user - just show empty list
      setRecentRecipients([]);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const getCountryFromCurrency = (currency: string): string => {
    const currencyCountryMap: Record<string, string> = {
      'EUR': 'EU',
      'USD': 'US',
      'GBP': 'GB',
      'HNL': 'HN',
      'CAD': 'CA',
      'AUD': 'AU',
      'CHF': 'CH',
      'JPY': 'JP'
    };
    return currencyCountryMap[currency] || 'XX';
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  };

  const handleAddRecipient = () => {
    setStep('currency');
  };

  const handleSelectCurrency = (currency: 'EUR' | 'HNL') => {
    setSelectedCurrency(currency);
    setStep('method');
  };

  const handleSelectMethod = (method: 'wise_user' | 'bank_account') => {
    if (method === 'bank_account') {
      // Navigate to add recipient form
      router.push({
        pathname: '/(dashboard)/add-recipient',
        params: { currency: selectedCurrency }
      });
    } else {
      // Navigate to user search screen
      router.push({
        pathname: '/(dashboard)/user-search',
        params: { currency: selectedCurrency }
      });
    }
  };

  const renderRecipientsStep = () => (
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
          <Text style={styles.headerTitle}>Send Money</Text>
          <Text style={styles.headerSubtitle}>Choose recipient</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        {/* Add Recipient Button */}
        <TouchableOpacity style={styles.modernAddCard} onPress={handleAddRecipient}>
          <View style={styles.modernIconContainer}>
            <Ionicons name="add" size={24} color="#3B82F6" />
          </View>
          <View style={styles.modernCardContent}>
            <Text style={styles.modernCardTitle}>Add New Recipient</Text>
            <Text style={styles.modernCardSubtitle}>Send money to someone new</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Recent Recipients */}
        {isLoadingRecipients ? (
          <View style={styles.modernSection}>
            <Text style={styles.modernSectionTitle}>Recent Recipients</Text>
            <View style={styles.modernLoadingCard}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.modernLoadingText}>Loading recipients...</Text>
            </View>
          </View>
        ) : recentRecipients.length > 0 ? (
          <View style={styles.modernSection}>
            <Text style={styles.modernSectionTitle}>Recent Recipients</Text>
            {recentRecipients.map((recipient) => (
              <TouchableOpacity 
                key={recipient.id} 
                style={styles.modernRecipientCard}
                onPress={() => {
                  // Navigate to transfer amount with recipient data
                  const recipientData = {
                    type: 'iban', // Bank transfer type
                    holderName: recipient.name,
                    iban: recipient.iban,
                    currency: recipient.currency,
                    country: recipient.country,
                    bankName: 'Bank Transfer', // Default for recent recipients
                  };
                  
                  router.push({
                    pathname: '/(dashboard)/transfer-amount',
                    params: {
                      currency: recipient.currency,
                      recipientData: JSON.stringify(recipientData)
                    }
                  });
                }}
              >
                <View style={styles.modernAvatar}>
                  <Text style={styles.modernInitials}>
                    {recipient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modernRecipientInfo}>
                  <Text style={styles.modernRecipientName}>{recipient.name}</Text>
                  <View style={styles.recipientMetadata}>
                    <Text style={styles.modernRecipientDetails}>
                      {recipient.currency}
                    </Text>
                    <View style={styles.metadataDivider} />
                    <Text style={styles.modernRecipientDetails}>
                      {recipient.lastUsed}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.modernSection}>
            <Text style={styles.modernSectionTitle}>Recent Recipients</Text>
            <View style={styles.modernEmptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={32} color="#D1D5DB" />
              </View>
              <Text style={styles.modernEmptyText}>No recent recipients</Text>
              <Text style={styles.modernEmptySubtext}>Start by adding a new recipient above</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderCurrencyStep = () => (
    <View style={styles.stepContainer}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep('recipients')}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Choose Currency</Text>
          <Text style={styles.headerSubtitle}>Select currency to send</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        {/* Euros Option */}
        <TouchableOpacity 
          style={styles.modernCurrencyCard} 
          onPress={() => handleSelectCurrency('EUR')}
        >
          <View style={styles.modernCurrencyIcon}>
            <Ionicons name="card" size={24} color="#3B82F6" />
          </View>
          <View style={styles.modernCardContent}>
            <Text style={styles.modernCardTitle}>Euros (EUR)</Text>
            <Text style={styles.modernCardSubtitle}>Send to European countries</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Other Currencies Section */}
        <View style={styles.modernSection}>
          <Text style={styles.modernSectionTitle}>Other Currencies</Text>
          
          <TouchableOpacity 
            style={styles.modernCurrencyCard} 
            onPress={() => handleSelectCurrency('HNL')}
          >
            <View style={styles.modernCurrencyIcon}>
              <Ionicons name="cash" size={24} color="#10B981" />
            </View>
            <View style={styles.modernCardContent}>
              <Text style={styles.modernCardTitle}>Honduran Lempira (HNL)</Text>
              <Text style={styles.modernCardSubtitle}>Send to Honduras</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderMethodStep = () => (
    <View style={styles.stepContainer}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep('currency')}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {selectedCurrency === 'EUR' ? 'Send Euros' : 'Send Lempira'}
          </Text>
          <Text style={styles.headerSubtitle}>Choose transfer method</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        {selectedCurrency === 'EUR' && (
          <TouchableOpacity 
            style={styles.modernMethodCard} 
            onPress={() => handleSelectMethod('wise_user')}
          >
            <View style={styles.modernMethodIcon}>
              <Ionicons name="person" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.modernCardContent}>
              <Text style={styles.modernCardTitle}>To App User</Text>
              <Text style={styles.modernCardSubtitle}>
                Search by username, email, or phone number
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.modernMethodCard} 
          onPress={() => handleSelectMethod('bank_account')}
        >
          <View style={styles.modernMethodIcon}>
            <Ionicons name="business" size={24} color="#F59E0B" />
          </View>
          <View style={styles.modernCardContent}>
            <Text style={styles.modernCardTitle}>
              {selectedCurrency === 'EUR' ? 'To Bank Account (IBAN)' : 'To Bank Account'}
            </Text>
            <Text style={styles.modernCardSubtitle}>
              {selectedCurrency === 'EUR' 
                ? 'Enter recipient name and IBAN' 
                : 'Enter recipient bank details'
              }
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'recipients':
        return renderRecipientsStep();
      case 'currency':
        return renderCurrencyStep();
      case 'method':
        return renderMethodStep();
      default:
        return renderRecipientsStep();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.modernScrollView}
        contentContainerStyle={styles.modernScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
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
    gap: 16,
  },
  
  // 💎 Modern Add Card
  modernAddCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  modernIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernCardContent: {
    flex: 1,
  },
  modernCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  modernCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 20,
  },
  
  // 🏗️ Modern Sections
  modernSection: {
    marginTop: 24,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
    paddingHorizontal: 4,
    letterSpacing: -0.3,
  },

  // 📱 Modern Recipient Cards
  modernRecipientCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  modernAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  modernRecipientInfo: {
    flex: 1,
  },
  modernRecipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  recipientMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernRecipientDetails: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  metadataDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  
  // 🎭 Enhanced States
  modernLoadingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  modernLoadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  emptyIconContainer: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    marginBottom: 8,
  },
  modernEmptyText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '700',
    textAlign: 'center',
  },
  modernEmptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // 💰 Modern Currency Cards
  modernCurrencyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
    gap: 16,
  },
  modernCurrencyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // 🎯 Modern Method Cards
  modernMethodCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    gap: 16,
  },
  modernMethodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});