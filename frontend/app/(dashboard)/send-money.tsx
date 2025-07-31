import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
  const { currency, paymentType } = useLocalSearchParams<{ currency?: string; paymentType?: string }>();
  const { selectedAccount } = useWalletStore();
  const { user, token } = useAuthStore();
  const [step, setStep] = useState<FlowStep>('recipients');
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'HNL' | null>(
    currency ? (currency as 'EUR' | 'HNL') : null
  );
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
      // Fetch user's transfer history from OBP transaction requests
      const response = await apiClient.obpGet('/obp/v5.1.0/transaction-requests', {
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
    if (currency) {
      // Currency already selected from account - skip to method selection
      setSelectedCurrency(currency as 'EUR' | 'HNL');
      setStep('method');
    } else {
      // No currency pre-selected - go to currency selection
      setStep('currency');
    }
  };

  const handleSelectCurrency = (currency: 'EUR' | 'HNL') => {
    setSelectedCurrency(currency);
    setStep('method');
  };

  const handleSelectMethod = (method: 'app_user' | 'bank_account' | 'eur_to_hnl') => {
    if (method === 'bank_account') {
      // Navigate to add recipient form
      router.push({
        pathname: '/(dashboard)/add-recipient',
        params: { currency: selectedCurrency }
      });
    } else if (method === 'eur_to_hnl') {
      // Navigate to EUR → HNL balance-based remittance flow
      router.push({
        pathname: '/(dashboard)/eur-hnl-balance-remittance',
        params: { 
          sourceCurrency: 'EUR',
          targetCurrency: 'HNL',
          paymentType: 'balance'
        }
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
      {/* Premium Header */}
      <View style={styles.premiumHeader}>
        <TouchableOpacity 
          style={styles.premiumBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.premiumHeaderTitle}>Send Money</Text>
          <Text style={styles.premiumHeaderSubtitle}>
            {paymentType === 'balance' 
              ? `From your ${currency} balance`
              : currency ? `Send ${currency}` : 'Choose recipient'
            }
          </Text>
        </View>
        <TouchableOpacity style={styles.headerActionButton}>
          <Ionicons name="search" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.premiumContent}>
        {/* Hero Add Recipient Card */}
        <TouchableOpacity 
          style={styles.heroAddCard} 
          onPress={handleAddRecipient}
          activeOpacity={0.95}
        >
          <View style={styles.heroGradient}>
            <View style={styles.heroIconContainer}>
              <View style={styles.heroIconBg}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Add New Recipient</Text>
              <Text style={styles.heroSubtitle}>Send money to someone new</Text>
              <View style={styles.heroFeatures}>
                <View style={styles.heroFeature}>
                  <Ionicons name="flash" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.heroFeatureText}>Instant</Text>
                </View>
                <View style={styles.heroFeature}>
                  <Ionicons name="shield-checkmark" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.heroFeatureText}>Secure</Text>
                </View>
              </View>
            </View>
            <View style={styles.heroArrow}>
              <Ionicons name="arrow-forward" size={24} color="rgba(255, 255, 255, 0.9)" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Recent Recipients Section */}
        {isLoadingRecipients ? (
          <View style={styles.recipientsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Recipients</Text>
              <View style={styles.sectionBadge}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            </View>
            <View style={styles.loadingCard}>
              <View style={styles.loadingShimmer}>
                <View style={styles.shimmerAvatar} />
                <View style={styles.shimmerContent}>
                  <View style={styles.shimmerLine} />
                  <View style={styles.shimmerLineSmall} />
                </View>
              </View>
              <View style={styles.loadingShimmer}>
                <View style={styles.shimmerAvatar} />
                <View style={styles.shimmerContent}>
                  <View style={styles.shimmerLine} />
                  <View style={styles.shimmerLineSmall} />
                </View>
              </View>
            </View>
          </View>
        ) : recentRecipients.length > 0 ? (
          <View style={styles.recipientsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Recipients</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{recentRecipients.length}</Text>
              </View>
            </View>
            
            {/* Quick Actions Row */}
            <View style={styles.quickActionsRow}>
              <View style={styles.quickActionsContainer}>
                <TouchableOpacity style={styles.quickAction}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.quickActionText}>Favorites</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction}>
                  <Ionicons name="time" size={16} color="#8B5CF6" />
                  <Text style={styles.quickActionText}>Recent</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction}>
                  <Ionicons name="globe" size={16} color="#10B981" />
                  <Text style={styles.quickActionText}>International</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Recipient Cards */}
            <View style={styles.recipientsList}>
              {recentRecipients.map((recipient, index) => (
                <TouchableOpacity 
                  key={recipient.id} 
                  style={[
                    styles.premiumRecipientCard,
                    { marginBottom: index === recentRecipients.length - 1 ? 0 : 12 }
                  ]}
                  onPress={() => {
                    const recipientData = {
                      type: 'iban',
                      holderName: recipient.name,
                      iban: recipient.iban,
                      currency: recipient.currency,
                      country: recipient.country,
                      bankName: 'Bank Transfer',
                    };
                    
                    router.push({
                      pathname: '/(dashboard)/transfer-amount',
                      params: {
                        currency: recipient.currency,
                        recipientData: JSON.stringify(recipientData)
                      }
                    });
                  }}
                  activeOpacity={0.98}
                >
                  <View style={styles.recipientCardContent}>
                    <View style={styles.recipientLeft}>
                      <View style={styles.premiumAvatar}>
                        <Text style={styles.premiumInitials}>
                          {recipient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.recipientInfo}>
                        <View style={styles.recipientNameRow}>
                          <Text style={styles.premiumRecipientName}>{recipient.name}</Text>
                          {recipient.currency === 'HNL' && (
                            <View style={styles.countryFlag}>
                              <Text style={styles.flagEmoji}>🇭🇳</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.recipientMeta}>
                          <View style={styles.currencyChip}>
                            <Text style={styles.currencyChipText}>{recipient.currency}</Text>
                          </View>
                          <View style={styles.metaDot} />
                          <Text style={styles.lastUsedText}>{recipient.lastUsed}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.recipientRight}>
                      <TouchableOpacity style={styles.sendAgainButton}>
                        <Ionicons name="repeat" size={16} color="#3B82F6" />
                        <Text style={styles.sendAgainText}>Send Again</Text>
                      </TouchableOpacity>
                      <View style={styles.chevronContainer}>
                        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.recipientsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Recipients</Text>
            </View>
            <View style={styles.premiumEmptyState}>
              <View style={styles.emptyStateIcon}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="people-outline" size={32} color="#8B5CF6" />
                </View>
              </View>
              <Text style={styles.emptyStateTitle}>No recipients yet</Text>
              <Text style={styles.emptyStateText}>
                Add your first recipient to start sending money quickly and securely
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleAddRecipient}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyStateButtonText}>Add First Recipient</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Trust Indicators */}
        <View style={styles.trustSection}>
          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.trustText}>Bank-level security</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="flash" size={20} color="#F59E0B" />
              <Text style={styles.trustText}>Instant transfers</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="globe" size={20} color="#3B82F6" />
              <Text style={styles.trustText}>Global coverage</Text>
            </View>
          </View>
        </View>
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
      {/* Premium Header */}
      <View style={styles.premiumHeader}>
        <TouchableOpacity 
          style={styles.premiumBackButton}
          onPress={() => {
            if (paymentType === 'balance') {
              // If we came from payment method selection, go back there
              router.back();
            } else {
              // Original logic for direct send-money entry
              setStep('currency');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.premiumHeaderTitle}>
            {selectedCurrency === 'EUR' ? 'Send Euros' : 'Send Lempira'}
          </Text>
          <Text style={styles.premiumHeaderSubtitle}>Choose transfer method</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.premiumContent}>
        {/* Transfer Methods */}
        <View style={styles.methodsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transfer Methods</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{selectedCurrency === 'EUR' ? '3' : '2'}</Text>
            </View>
          </View>

          <View style={styles.methodsList}>
            {/* App User Method */}
            {(selectedCurrency === 'EUR' || selectedCurrency === 'HNL') && (
              <TouchableOpacity 
                style={styles.premiumMethodCard} 
                onPress={() => handleSelectMethod('app_user')}
                activeOpacity={0.98}
              >
                <View style={styles.methodCardContent}>
                  <View style={styles.methodIconContainer}>
                    <View style={[styles.methodIconBg, { backgroundColor: '#F3E8FF' }]}>
                      <Ionicons name="person" size={28} color="#8B5CF6" />
                    </View>
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.premiumMethodTitle}>To App User</Text>
                    <Text style={styles.premiumMethodSubtitle}>
                      Send to another {selectedCurrency} account holder
                    </Text>
                    <View style={styles.methodFeatures}>
                      <View style={styles.methodFeature}>
                        <Ionicons name="flash" size={12} color="#8B5CF6" />
                        <Text style={styles.methodFeatureText}>Instant</Text>
                      </View>
                      <View style={styles.methodFeature}>
                        <Ionicons name="shield-checkmark" size={12} color="#8B5CF6" />
                        <Text style={styles.methodFeatureText}>No fees</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.methodArrow}>
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Bank Account Method */}
            <TouchableOpacity 
              style={styles.premiumMethodCard} 
              onPress={() => handleSelectMethod('bank_account')}
              activeOpacity={0.98}
            >
              <View style={styles.methodCardContent}>
                <View style={styles.methodIconContainer}>
                  <View style={[styles.methodIconBg, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="business" size={28} color="#F59E0B" />
                  </View>
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.premiumMethodTitle}>
                    {selectedCurrency === 'EUR' ? 'To European Bank (IBAN)' : 'To Bank Account'}
                  </Text>
                  <Text style={styles.premiumMethodSubtitle}>
                    {selectedCurrency === 'EUR' 
                      ? 'Send within Europe using IBAN' 
                      : 'Enter recipient bank details'
                    }
                  </Text>
                  <View style={styles.methodFeatures}>
                    <View style={styles.methodFeature}>
                      <Ionicons name="card" size={12} color="#F59E0B" />
                      <Text style={styles.methodFeatureText}>Secure</Text>
                    </View>
                    <View style={styles.methodFeature}>
                      <Ionicons name="globe" size={12} color="#F59E0B" />
                      <Text style={styles.methodFeatureText}>Global</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.methodArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </View>
              </View>
            </TouchableOpacity>

            {/* EUR → HNL Remittance Method */}
            {selectedCurrency === 'EUR' && (
              <TouchableOpacity 
                style={styles.premiumMethodCard} 
                onPress={() => handleSelectMethod('eur_to_hnl')}
                activeOpacity={0.98}
              >
                <View style={styles.methodCardContent}>
                  <View style={styles.methodIconContainer}>
                    <View style={[styles.methodIconBg, { backgroundColor: '#ECFDF5' }]}>
                      <View style={styles.remittanceFlags}>
                        <Text style={styles.remittanceFlagEmoji}>🇪🇺</Text>
                        <Ionicons name="arrow-forward" size={16} color="#10B981" />
                        <Text style={styles.remittanceFlagEmoji}>🇭🇳</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.premiumMethodTitle}>To Honduras (EUR → HNL)</Text>
                    <Text style={styles.premiumMethodSubtitle}>
                      Send EUR, recipient gets Lempiras
                    </Text>
                    <View style={styles.methodFeatures}>
                      <View style={styles.methodFeature}>
                        <Ionicons name="trending-up" size={12} color="#10B981" />
                        <Text style={styles.methodFeatureText}>Best rates</Text>
                      </View>
                      <View style={styles.methodFeature}>
                        <Ionicons name="globe" size={12} color="#10B981" />
                        <Text style={styles.methodFeatureText}>International</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.methodArrow}>
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <View style={styles.paymentInfoCard}>
            <View style={styles.paymentInfoHeader}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.paymentInfoTitle}>
                {paymentType === 'balance' ? 'Balance Transfer' : 'Transfer Information'}
              </Text>
            </View>
            <Text style={styles.paymentInfoText}>
              {paymentType === 'balance' 
                ? `Money will be deducted from your ${selectedCurrency} account balance.`
                : `Choose how you want to send your ${selectedCurrency}.`
              }
            </Text>
          </View>
        </View>
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

  // 🌟 Premium Header
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  premiumBackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  premiumHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.4,
  },
  premiumHeaderSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  headerActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // 🏗️ Premium Content
  premiumContent: {
    padding: 20,
    gap: 24,
  },

  // 🎯 Hero Add Card
  heroAddCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  heroGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#3B82F6',
    background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
  },
  heroIconContainer: {
    marginRight: 20,
  },
  heroIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 20,
  },
  heroFeatures: {
    flexDirection: 'row',
    gap: 20,
  },
  heroFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroFeatureText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroArrow: {
    marginLeft: 16,
  },

  // 📋 Recipients Section
  recipientsSection: {
    gap: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  sectionBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // 🔥 Quick Actions
  quickActionsRow: {
    marginBottom: 8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 0, // No extra padding since parent container already has 20px
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  // 💎 Premium Recipient Cards
  recipientsList: {
    gap: 0,
  },
  premiumRecipientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  recipientCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  premiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  premiumInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: -0.2,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  premiumRecipientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.2,
  },
  countryFlag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
  },
  recipientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyChip: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  currencyChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  lastUsedText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  recipientRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sendAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  sendAgainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  chevronContainer: {
    padding: 4,
  },

  // 🎭 Loading States
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  loadingShimmer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  shimmerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
  },
  shimmerContent: {
    flex: 1,
    gap: 8,
  },
  shimmerLine: {
    height: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    width: '70%',
  },
  shimmerLineSmall: {
    height: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    width: '40%',
  },

  // 🎪 Premium Empty State
  premiumEmptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 🏆 Trust Section
  trustSection: {
    marginTop: 8,
  },
  trustGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  trustItem: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  flagEmoji: {
    fontSize: 14,
  },

  // 🎯 Methods Section
  methodsSection: {
    gap: 20,
  },
  methodsList: {
    gap: 16,
  },
  premiumMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  methodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIconContainer: {
    marginRight: 20,
  },
  methodIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  premiumMethodTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  premiumMethodSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 12,
  },
  methodFeatures: {
    flexDirection: 'row',
    gap: 16,
  },
  methodFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodFeatureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  methodArrow: {
    marginLeft: 16,
    padding: 4,
  },
  remittanceFlags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remittanceFlagEmoji: {
    fontSize: 18,
  },

  // 💡 Payment Info
  paymentInfo: {
    marginTop: 8,
  },
  paymentInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontWeight: '500',
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
  flagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flagEmoji: {
    fontSize: 16,
  },
});