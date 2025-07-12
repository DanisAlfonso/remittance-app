import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
      
      const transfers = (response as { data: { transfers: Array<{
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
      }> } }).data.transfers || [];
      
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
        pathname: '/add-recipient',
        params: { currency: selectedCurrency }
      });
    } else {
      // For now, show alert for app user search - to be implemented later
      Alert.alert('Find App User', 'User search feature coming soon', [
        { text: 'OK' }
      ]);
    }
  };

  const renderRecipientsStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Send Money</Text>
        <Text style={styles.subtitle}>Choose a recipient or add a new one</Text>
      </View>

      <View style={styles.content}>
        {/* Add Recipient Button */}
        <TouchableOpacity style={styles.addRecipientCard} onPress={handleAddRecipient}>
          <View style={styles.addIconContainer}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <View style={styles.addRecipientContent}>
            <Text style={styles.addRecipientTitle}>Add recipient</Text>
            <Text style={styles.addRecipientSubtitle}>Send money to someone new</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Recent Recipients */}
        {isLoadingRecipients ? (
          <View style={styles.recipientsSection}>
            <Text style={styles.sectionTitle}>Recent recipients</Text>
            <View style={styles.loadingCard}>
              <Text style={styles.loadingText}>Loading recent recipients...</Text>
            </View>
          </View>
        ) : recentRecipients.length > 0 ? (
          <View style={styles.recipientsSection}>
            <Text style={styles.sectionTitle}>Recent recipients</Text>
            {recentRecipients.map((recipient) => (
              <TouchableOpacity 
                key={recipient.id} 
                style={styles.recipientCard}
                onPress={() => {
                  // For now, show alert - this would navigate to transfer amount
                  Alert.alert('Send to Recipient', `Send money to ${recipient.name}`, [
                    { text: 'OK', onPress: () => router.back() }
                  ]);
                }}
              >
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientInitials}>
                    {recipient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName}>{recipient.name}</Text>
                  <Text style={styles.recipientDetails}>
                    {recipient.email ? `${recipient.email} • ` : ''}
                    {recipient.currency} • {recipient.lastUsed}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.recipientsSection}>
            <Text style={styles.sectionTitle}>Recent recipients</Text>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No recent recipients</Text>
              <Text style={styles.emptySubtext}>Start by adding a new recipient above</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderCurrencyStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Currency</Text>
        <Text style={styles.subtitle}>Select the currency you want to send</Text>
      </View>

      <View style={styles.content}>
        {/* Euros Option */}
        <TouchableOpacity 
          style={styles.currencyCard} 
          onPress={() => handleSelectCurrency('EUR')}
        >
          <View style={styles.currencyIcon}>
            <Text style={styles.currencyEmoji}>🇪🇺</Text>
          </View>
          <View style={styles.currencyContent}>
            <Text style={styles.currencyTitle}>Euros</Text>
            <Text style={styles.currencySubtitle}>Send EUR to Europe</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Other Currencies Section */}
        <View style={styles.otherCurrenciesSection}>
          <Text style={styles.sectionTitle}>Other currencies</Text>
          
          <TouchableOpacity 
            style={styles.currencyCard} 
            onPress={() => handleSelectCurrency('HNL')}
          >
            <View style={styles.currencyIcon}>
              <Text style={styles.currencyEmoji}>🇭🇳</Text>
            </View>
            <View style={styles.currencyContent}>
              <Text style={styles.currencyTitle}>Honduran Lempira</Text>
              <Text style={styles.currencySubtitle}>Send HNL to Honduras</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderMethodStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {selectedCurrency === 'EUR' ? 'Send Euros' : 'Send Lempira'}
        </Text>
        <Text style={styles.subtitle}>How do you want to send money?</Text>
      </View>

      <View style={styles.content}>
        {selectedCurrency === 'EUR' && (
          <TouchableOpacity 
            style={styles.methodCard} 
            onPress={() => handleSelectMethod('wise_user')}
          >
            <View style={styles.methodIcon}>
              <Text style={styles.methodEmoji}>👤</Text>
            </View>
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>To an app user</Text>
              <Text style={styles.methodSubtitle}>
                Search by username, email, or phone number
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.methodCard} 
          onPress={() => handleSelectMethod('bank_account')}
        >
          <View style={styles.methodIcon}>
            <Text style={styles.methodEmoji}>🏦</Text>
          </View>
          <View style={styles.methodContent}>
            <Text style={styles.methodTitle}>
              {selectedCurrency === 'EUR' ? 'To a bank account (IBAN)' : 'To a bank account'}
            </Text>
            <Text style={styles.methodSubtitle}>
              {selectedCurrency === 'EUR' 
                ? 'Enter recipient name and IBAN' 
                : 'Enter recipient bank details'
              }
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with back button */}
        {step !== 'recipients' && (
          <View style={styles.navigationHeader}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => {
                if (step === 'currency') {
                  setStep('recipients');
                } else if (step === 'method') {
                  setStep('currency');
                } else {
                  router.back();
                }
              }}
            >
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafb',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: {
    fontSize: 24,
    color: '#374151',
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1d29',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  
  // Add Recipient Card
  addRecipientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  addIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addIcon: {
    fontSize: 24,
    color: '#2563eb',
    fontWeight: '300',
  },
  addRecipientContent: {
    flex: 1,
  },
  addRecipientTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  addRecipientSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '300',
  },
  
  // Recipients Section
  recipientsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    paddingHorizontal: 4,
    letterSpacing: -0.3,
  },
  recipientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  recipientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recipientInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3730a3',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  recipientDetails: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  
  // Loading and Empty States
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  emptyText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Currency Selection
  currencyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  currencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currencyEmoji: {
    fontSize: 24,
  },
  currencyContent: {
    flex: 1,
  },
  currencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  currencySubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  otherCurrenciesSection: {
    marginTop: 24,
  },
  
  // Method Selection
  methodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodEmoji: {
    fontSize: 22,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 20,
  },
});