import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../lib/walletStore';
import { useAuthStore } from '../../lib/auth';
// import { apiClient } from '../../lib/api';
import { transferService } from '../../lib/transfer';
import type { Transfer } from '../../types/transfer';

type FlowStep = 'recipients' | 'currency' | 'method' | 'amount' | 'processing';

interface Recipient {
  id: string;
  name: string;
  email?: string;
  iban?: string;
  currency: string;
  country: string;
  lastUsed: string;
  isFavorite?: boolean;
  isInternational?: boolean;
  // Enhanced fields for better handling
  userId?: string | null;
  username?: string | null;
  isInternalUser?: boolean;
  lastTransferAmount?: number;
  transferId?: string;
  sourceAmount?: number;
  sourceCurrency?: string;
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
  const [activeTab, setActiveTab] = useState<'favorites' | 'recent' | 'international'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [favoriteRecipients, setFavoriteRecipients] = useState<Set<string>>(new Set());

  // Load favorites from SecureStore on component mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await SecureStore.getItemAsync(`favorites_${user?.id}`);
        if (storedFavorites) {
          const favoritesArray = JSON.parse(storedFavorites);
          setFavoriteRecipients(new Set(favoritesArray));
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    if (user?.id) {
      loadFavorites();
    }
  }, [user?.id]);

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
      console.log('🔍 Loading recent recipients from transfer history...');
      
      // Use the proper transfer service to get transfer history
      const response = await transferService.getTransferHistory(10, 0); // Get last 10 transfers
      const transfers = response.transfers || [];
      
      // Found transfers (log disabled for performance)
      
      // Extract unique recipients from outgoing transfers
      const recipientMap = new Map<string, Recipient>();
      
      transfers.forEach((transfer: Transfer) => {
        // Only include outgoing transfers (sent money) where sourceAmount is negative
        if (transfer.sourceAmount < 0) {
          let recipientName = '';
          let recipientIban = '';
          let recipientAccountNumber = '';
          let recipientUserId = null;
          let recipientUsername = null;
          let isInternalUser = false;
          let lastTransferAmount = 0;
          
          // First, try to extract enhanced metadata if available (new transactions will have this)
          if (transfer.metadata) {
            try {
              const metadata = JSON.parse(transfer.metadata);
              if (metadata.recipientName) {
                recipientName = metadata.recipientName;
                recipientIban = metadata.recipientIban || '';
                recipientUserId = metadata.recipientUserId;
                recipientUsername = metadata.recipientUsername;
                isInternalUser = metadata.isInternalUser || false;
                lastTransferAmount = metadata.transferAmount || 0;
              }
            } catch {
              // Metadata not JSON, continue with fallback methods
            }
          }
          
          // Fallback to existing extraction methods if metadata didn't provide info
          if (!recipientName) {
            // Primary: Try to get recipient info from recipient object
            if (transfer.recipient?.name) {
              recipientName = transfer.recipient.name;
              recipientIban = transfer.recipient.iban || '';
              recipientAccountNumber = transfer.recipient.accountNumber || '';
            }
            // Fallback 1: Try to extract from reference field
            else if (transfer.reference?.includes('Transfer to')) {
              recipientName = transfer.reference.replace('Transfer to ', '').trim();
            }
            // Fallback 2: Try to extract from description field  
            else if (transfer.description?.includes('to ')) {
              const parts = transfer.description.split(' to ');
              if (parts.length > 1) {
                recipientName = parts[1].trim();
              }
            }
            // Fallback 3: Try to extract recipient name from description patterns
            else if (transfer.description) {
              // Look for patterns like "EUR → HNL remittance to [Name]"
              const toMatch = transfer.description.match(/to\s+([^-]+)/i);
              if (toMatch) {
                recipientName = toMatch[1].trim();
              }
            }
          }
          
          // Only proceed if we have a recipient name
          if (recipientName) {
            const recipientKey = recipientIban || recipientAccountNumber || recipientName;
            const existing = recipientMap.get(recipientKey);
            
            // Processing recipient (log disabled for performance)
            
            // Keep the most recent transfer for each recipient
            if (!existing || new Date(transfer.createdAt) > new Date(existing.lastUsed)) {
              const recipientCountry = getCountryFromCurrency(transfer.targetCurrency);
              const newRecipient = {
                id: recipientKey,
                name: recipientName,
                email: recipientName, // Use name as fallback for email
                iban: recipientIban,
                currency: transfer.targetCurrency,
                country: recipientCountry,
                lastUsed: formatRelativeTime(transfer.createdAt),
                isFavorite: favoriteRecipients.has(recipientKey),
                isInternational: recipientCountry !== 'EU' && recipientCountry !== getCountryFromCurrency(selectedAccount?.currency || 'EUR'),
                // Enhanced fields for better handling
                userId: recipientUserId,
                username: recipientUsername,
                isInternalUser: isInternalUser,
                lastTransferAmount: lastTransferAmount,
                transferId: transfer.id,
                sourceAmount: Math.abs(transfer.sourceAmount || 0),
                sourceCurrency: transfer.sourceCurrency
              };
              
              // Added/Updated recipient (log disabled for performance)
              recipientMap.set(recipientKey, newRecipient);
            }
          }
        }
      });
      
      // Convert to array and sort by most recent
      const recipients = Array.from(recipientMap.values()).slice(0, 5); // Show max 5 recent recipients
      // Extracted unique recipients (log disabled for performance)
      setRecentRecipients(recipients);
    } catch (error) {
      console.error('❌ Error loading recent recipients:', error);
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

  const getTransferTypeLabel = (sourceCurrency?: string, targetCurrency?: string): string => {
    const source = sourceCurrency || 'EUR';
    const target = targetCurrency || 'EUR';
    
    if (source === target) {
      return `${source} → ${target}`;
    }
    
    // International transfers
    if (source === 'EUR' && target === 'HNL') {
      return 'EUR → HNL';
    } else if (source === 'HNL' && target === 'EUR') {
      return 'HNL → EUR';
    } else if (source === 'EUR' && target !== 'EUR') {
      return `EUR → ${target}`;
    } else if (target === 'EUR' && source !== 'EUR') {
      return `${source} → EUR`;
    }
    
    return `${source} → ${target}`;
  };

  const getTransferTypeColor = (sourceCurrency?: string, targetCurrency?: string): string => {
    const source = sourceCurrency || 'EUR';
    const target = targetCurrency || 'EUR';
    
    if (source === target) {
      return '#059669'; // Green for same currency
    }
    
    // International transfers
    return '#3B82F6'; // Blue for currency conversion
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


  const handleRecipientCardPress = (recipient: Recipient) => {
    console.log('💳 Recipient card pressed - navigating to transaction details:', recipient.name);
    
    // Navigate to transaction details screen
    router.push({
      pathname: '/(dashboard)/transaction-details',
      params: {
        transferId: recipient.transferId || '',
        recipientName: recipient.name,
        recipientCurrency: recipient.currency
      }
    });
  };

  // Memoized recipient filtering to prevent repeated operations
  const filteredRecipients = useMemo(() => {
    let filtered = recentRecipients;

    // CURRENCY CONTEXT FILTERING: Only show recipients from the same currency context
    // This prevents the cross-currency repeat transfer bug
    const currentCurrency = selectedAccount?.currency;
    if (currentCurrency) {
      filtered = filtered.filter(r => r.sourceCurrency === currentCurrency);
      if (__DEV__) {
        console.log(`🎯 Filtering recipients by currency context: ${currentCurrency}`);
        console.log(`📋 Filtered ${recentRecipients.length} recipients to ${filtered.length} matching currency`);
      }
    }

    // Filter by tab
    switch (activeTab) {
      case 'favorites':
        filtered = filtered.filter(r => r.isFavorite);
        break;
      case 'international':
        filtered = filtered.filter(r => r.isInternational);
        break;
      case 'recent':
      default:
        // Show all recent recipients (already sorted by recency)
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.email?.toLowerCase().includes(query) ||
        r.currency.toLowerCase().includes(query) ||
        r.country.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [recentRecipients, selectedAccount?.currency, activeTab, searchQuery]);

  const handleTabPress = (tab: 'favorites' | 'recent' | 'international') => {
    setActiveTab(tab);
  };

  const handleSearchPress = () => {
    setIsSearchModalVisible(true);
  };

  const handleSearchClose = () => {
    setIsSearchModalVisible(false);
    setSearchQuery('');
  };

  const toggleFavorite = async (recipientId: string) => {
    const newFavorites = new Set(favoriteRecipients);
    
    if (newFavorites.has(recipientId)) {
      newFavorites.delete(recipientId);
    } else {
      newFavorites.add(recipientId);
    }
    
    setFavoriteRecipients(newFavorites);
    
    // Update the recipients list immediately to reflect the change
    setRecentRecipients(prevRecipients => 
      prevRecipients.map(recipient => 
        recipient.id === recipientId 
          ? { ...recipient, isFavorite: newFavorites.has(recipientId) }
          : recipient
      )
    );
    
    // Save to SecureStore
    try {
      const favoritesArray = Array.from(newFavorites);
      await SecureStore.setItemAsync(`favorites_${user?.id}`, JSON.stringify(favoritesArray));
      console.log('Favorites saved:', favoritesArray);
    } catch (error) {
      console.error('Error saving favorites:', error);
      // Could show a toast notification here in a real app
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
        <TouchableOpacity style={styles.headerActionButton} onPress={handleSearchPress}>
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
              <Text style={styles.sectionTitle}>
                {activeTab === 'favorites' ? 'Favorite Recipients' :
                 activeTab === 'international' ? 'International Recipients' :
                 'Recent Recipients'}
              </Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{filteredRecipients.length}</Text>
              </View>
            </View>
            
            {/* Quick Actions Row */}
            <View style={styles.quickActionsRow}>
              <View style={styles.quickActionsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.quickAction,
                    activeTab === 'favorites' && styles.quickActionActive
                  ]}
                  onPress={() => handleTabPress('favorites')}
                >
                  <Ionicons 
                    name="star" 
                    size={16} 
                    color={activeTab === 'favorites' ? "#FFFFFF" : "#F59E0B"} 
                  />
                  <Text style={[
                    styles.quickActionText,
                    activeTab === 'favorites' && styles.quickActionTextActive
                  ]}>
                    Favorites
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.quickAction,
                    activeTab === 'recent' && styles.quickActionActive
                  ]}
                  onPress={() => handleTabPress('recent')}
                >
                  <Ionicons 
                    name="time" 
                    size={16} 
                    color={activeTab === 'recent' ? "#FFFFFF" : "#8B5CF6"} 
                  />
                  <Text style={[
                    styles.quickActionText,
                    activeTab === 'recent' && styles.quickActionTextActive
                  ]}>
                    Recent
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.quickAction,
                    activeTab === 'international' && styles.quickActionActive
                  ]}
                  onPress={() => handleTabPress('international')}
                >
                  <Ionicons 
                    name="globe" 
                    size={16} 
                    color={activeTab === 'international' ? "#FFFFFF" : "#10B981"} 
                  />
                  <Text style={[
                    styles.quickActionText,
                    activeTab === 'international' && styles.quickActionTextActive
                  ]}>
                    International
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Recipient Cards */}
            {filteredRecipients.length > 0 ? (
              <View style={styles.recipientsList}>
                {filteredRecipients.map((recipient, index) => (
                <TouchableOpacity 
                  key={recipient.id} 
                  style={[
                    styles.premiumRecipientCard,
                    { marginBottom: index === filteredRecipients.length - 1 ? 0 : 12 }
                  ]}
                  onPress={() => {
                    handleRecipientCardPress(recipient);
                  }}
                  activeOpacity={0.98}
                >
                  <View style={styles.recipientCardContent}>
                    <View style={styles.recipientTopRow}>
                      <View style={styles.recipientMainInfo}>
                        <View style={styles.premiumAvatar}>
                          <Text style={styles.premiumInitials}>
                            {recipient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.recipientNameSection}>
                          <Text style={styles.premiumRecipientName} numberOfLines={1} ellipsizeMode="tail">
                            {recipient.name}
                          </Text>
                          <View style={styles.recipientMeta}>
                            <View style={styles.transferTypeChip}>
                              <Text style={[styles.transferTypeText, { color: getTransferTypeColor(recipient.sourceCurrency, recipient.currency) }]}>
                                {getTransferTypeLabel(recipient.sourceCurrency, recipient.currency)}
                              </Text>
                            </View>
                            <View style={styles.metaDot} />
                            <Text style={styles.lastUsedText}>{recipient.lastUsed}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.favoriteButtonProminent}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavorite(recipient.id);
                        }}
                      >
                        <Ionicons 
                          name={recipient.isFavorite ? "star" : "star-outline"} 
                          size={18} 
                          color={recipient.isFavorite ? "#F59E0B" : "#D1D5DB"} 
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.lastTransferInfo}>
                      <Text style={styles.lastTransferLabel}>Last sent:</Text>
                      <Text style={styles.lastTransferAmount}>
                        {(() => {
                          const amount = recipient.lastTransferAmount || recipient.sourceAmount || 0;
                          if (amount > 0) {
                            return new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: recipient.sourceCurrency || 'EUR',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(amount);
                          }
                          return '€0.00';
                        })()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.filteredEmptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons 
                    name={activeTab === 'favorites' ? 'star-outline' : 
                          activeTab === 'international' ? 'globe-outline' : 'time-outline'} 
                    size={32} 
                    color="#9CA3AF" 
                  />
                </View>
                <Text style={styles.emptyStateTitle}>
                  {activeTab === 'favorites' ? 'No favorites yet' :
                   activeTab === 'international' ? 'No international recipients' :
                   'No recent recipients'}
                </Text>
                <Text style={styles.emptyStateText}>
                  {activeTab === 'favorites' ? 'Add recipients to favorites for quick access' :
                   activeTab === 'international' ? 'International transfers will appear here' :
                   'Start sending money to see recipients here'}
                </Text>
              </View>
            )}
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
      <View style={styles.premiumHeader}>
        <TouchableOpacity 
          style={styles.premiumBackButton}
          onPress={() => setStep('recipients')}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.premiumHeaderTitle}>Choose Currency</Text>
          <Text style={styles.premiumHeaderSubtitle}>Select currency to send</Text>
        </View>
        <View style={styles.headerActionButton} />
      </View>

      <View style={styles.premiumContent}>
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
        <View style={styles.headerActionButton} />
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
                    <Text style={styles.premiumMethodTitle}>Send to Contact</Text>
                    <Text style={styles.premiumMethodSubtitle}>
                      Send money instantly using @username
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

      {/* Search Modal */}
      <Modal
        visible={isSearchModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleSearchClose}
      >
        <SafeAreaView style={styles.searchModalContainer}>
          <View style={styles.searchHeader}>
            <TouchableOpacity 
              style={styles.searchCloseButton}
              onPress={handleSearchClose}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.searchTitle}>Search Recipients</Text>
            <View style={styles.searchHeaderSpacer} />
          </View>

          <View style={styles.searchInputContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, email, or currency..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
                placeholderTextColor="#9CA3AF"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={styles.searchResults}>
            {filteredRecipients.length > 0 ? (
              <View style={styles.searchResultsList}>
                {filteredRecipients.map((recipient) => (
                  <TouchableOpacity
                    key={recipient.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      handleSearchClose();
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
                  >
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultInitials}>
                        {recipient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{recipient.name}</Text>
                      <Text style={styles.searchResultDetails}>
                        {recipient.currency} • {recipient.lastUsed}
                      </Text>
                    </View>
                    <View style={styles.searchResultActions}>
                      <TouchableOpacity 
                        style={styles.searchFavoriteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavorite(recipient.id);
                        }}
                      >
                        <Ionicons 
                          name={recipient.isFavorite ? "star" : "star-outline"} 
                          size={18} 
                          color={recipient.isFavorite ? "#F59E0B" : "#9CA3AF"} 
                        />
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : searchQuery.trim() ? (
              <View style={styles.searchEmptyState}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                <Text style={styles.searchEmptyTitle}>No results found</Text>
                <Text style={styles.searchEmptyText}>
                  Try searching with a different name or currency
                </Text>
              </View>
            ) : (
              <View style={styles.searchEmptyState}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.searchEmptyTitle}>Start typing to search</Text>
                <Text style={styles.searchEmptyText}>
                  Search through your recent recipients
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 4, // Small padding to prevent edge touch
    gap: 8, // Even spacing between buttons
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
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
  quickActionActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  quickActionTextActive: {
    color: '#FFFFFF',
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
    flexDirection: 'column',
    gap: 12,
  },
  recipientTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  recipientMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  recipientNameSection: {
    flex: 1,
    minWidth: 0,
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
    alignSelf: 'center',
  },
  premiumInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: -0.2,
  },
  recipientInfo: {
    flex: 1,
    minWidth: 0, // Allow text to wrap/truncate properly
  },
  recipientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    maxWidth: '100%',
  },
  premiumRecipientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  recipientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  transferTypeChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transferTypeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  lastUsedText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  lastTransferInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  lastTransferLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  lastTransferAmount: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '700',
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  favoriteButtonProminent: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
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
  filteredEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
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

  // 🔍 Search Modal Styles
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  searchHeaderSpacer: {
    width: 40,
  },
  searchInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchResultsList: {
    paddingVertical: 16,
    gap: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchFavoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  searchResultDetails: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  searchEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  searchEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});