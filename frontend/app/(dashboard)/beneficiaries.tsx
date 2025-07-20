import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/auth';
import { apiClient } from '../../lib/api';

interface Beneficiary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  country: string;
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    routingNumber?: string;
    iban?: string;
  };
  relationship: string;
  isActive: boolean;
  createdAt: string;
  currency?: string;
  lastUsed?: string;
  transferCount?: number;
}

interface RecentRecipient {
  id: string;
  name: string;
  email?: string;
  iban?: string;
  currency: string;
  country: string;
  lastUsed: string;
  transferCount: number;
}

export default function BeneficiariesScreen() {
  const { token } = useAuthStore();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('recent');

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    if (!token) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Load recent recipients from transfer history
      const transferResponse = await apiClient.get('/wise/transfers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const transfers = (transferResponse as { transfers: Array<{
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
      const recipientMap = new Map<string, RecentRecipient>();
      
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
          
          if (!existing || new Date(transfer.createdAt) > new Date(existing.lastUsed)) {
            recipientMap.set(recipientKey, {
              id: recipientKey,
              name: transfer.recipient.name,
              email: transfer.recipient.email,
              iban: transfer.recipient.iban,
              currency: transfer.targetCurrency,
              country: getCountryFromCurrency(transfer.targetCurrency),
              lastUsed: formatRelativeTime(transfer.createdAt),
              transferCount: (existing?.transferCount || 0) + 1
            });
          } else if (existing) {
            existing.transferCount += 1;
          }
        }
      });
      
      // Convert to array and sort by most recent
      const recipients = Array.from(recipientMap.values())
        .sort((a, b) => b.transferCount - a.transferCount);
      
      // setRecentRecipients(recipients);
      
      // Convert recent recipients to beneficiary format for unified display
      const beneficiariesFromRecents: Beneficiary[] = recipients.map(recipient => ({
        id: recipient.id,
        firstName: recipient.name.split(' ')[0] || recipient.name,
        lastName: recipient.name.split(' ').slice(1).join(' ') || '',
        email: recipient.email,
        country: recipient.country,
        bankAccount: recipient.iban ? {
          accountNumber: recipient.iban?.slice(-4) || '',
          bankName: 'Bank Transfer',
          iban: recipient.iban
        } : undefined,
        relationship: 'Recent Transfer',
        isActive: true,
        createdAt: new Date().toISOString(),
        currency: recipient.currency,
        lastUsed: recipient.lastUsed,
        transferCount: recipient.transferCount
      }));
      
      setBeneficiaries(beneficiariesFromRecents);
    } catch (error) {
      console.error('Error loading beneficiaries:', error);
      Alert.alert('Error', 'Failed to load beneficiaries');
    } finally {
      setIsLoading(false);
    }
  };

  const getCountryFromCurrency = (currency: string): string => {
    const currencyCountryMap: Record<string, string> = {
      'EUR': 'European Union',
      'USD': 'United States',
      'GBP': 'United Kingdom',
      'HNL': 'Honduras',
      'CAD': 'Canada',
      'AUD': 'Australia',
      'CHF': 'Switzerland',
      'JPY': 'Japan'
    };
    return currencyCountryMap[currency] || currency;
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

  const filteredBeneficiaries = beneficiaries.filter(beneficiary => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      beneficiary.firstName.toLowerCase().includes(query) ||
      beneficiary.lastName.toLowerCase().includes(query) ||
      beneficiary.email?.toLowerCase().includes(query) ||
      beneficiary.country.toLowerCase().includes(query) ||
      beneficiary.bankAccount?.bankName?.toLowerCase().includes(query)
    );
  });

  const handleSendMoney = (beneficiary: Beneficiary) => {
    if (!beneficiary.bankAccount?.iban && !beneficiary.bankAccount?.accountNumber) {
      Alert.alert('No Bank Details', 'This recipient does not have bank account information available.');
      return;
    }
    
    const recipientData = {
      type: 'iban',
      holderName: `${beneficiary.firstName} ${beneficiary.lastName}`.trim(),
      iban: beneficiary.bankAccount?.iban || beneficiary.bankAccount?.accountNumber || '',
      currency: beneficiary.currency || 'EUR',
      country: beneficiary.country,
      bankName: beneficiary.bankAccount?.bankName || 'Bank Transfer',
    };
    
    router.push({
      pathname: '/(dashboard)/transfer-amount',
      params: {
        currency: beneficiary.currency || 'EUR',
        recipientData: JSON.stringify(recipientData)
      }
    });
  };

  // Removed edit functionality as requested

  const handleAddBeneficiary = () => {
    router.push('/(dashboard)/send-money');
  };

  const renderBeneficiary = ({ item }: { item: Beneficiary }) => (
    <TouchableOpacity 
      style={styles.modernRecipientCard} 
      onPress={() => handleSendMoney(item)}
      activeOpacity={0.7}
    >
      <View style={styles.modernRecipientHeader}>
        <View style={styles.modernRecipientAvatar}>
          <Text style={styles.modernRecipientInitials}>
            {item.firstName[0]}{item.lastName[0] || ''}
          </Text>
        </View>
        
        <View style={styles.modernRecipientInfo}>
          <Text style={styles.modernRecipientName}>
            {item.firstName} {item.lastName}
          </Text>
          <View style={styles.recipientMetadata}>
            <View style={styles.relationshipContainer}>
              <Ionicons name="bookmark" size={12} color="#3B82F6" />
              <Text style={styles.modernRelationship}>{item.relationship}</Text>
            </View>
            <View style={styles.metadataDivider} />
            <View style={styles.countryContainer}>
              <Ionicons name="location" size={12} color="#6B7280" />
              <Text style={styles.modernCountry}>{item.country}</Text>
            </View>
          </View>
          
          {/* Stats Row */}
          {item.transferCount && (
            <View style={styles.modernStatsRow}>
              <View style={styles.transferCountContainer}>
                <Ionicons name="repeat" size={12} color="#10B981" />
                <Text style={styles.modernStatsLabel}>{item.transferCount} transfers</Text>
              </View>
              {item.lastUsed && (
                <View style={styles.lastUsedContainer}>
                  <Ionicons name="time" size={12} color="#9CA3AF" />
                  <Text style={styles.modernStatsLabel}>Last: {item.lastUsed}</Text>
                </View>
              )}
            </View>
          )}
          
          {/* Bank Info */}
          {item.bankAccount && (
            <View style={styles.modernBankInfo}>
              <View style={styles.bankInfoRow}>
                <Ionicons name="business" size={14} color="#6B7280" />
                <Text style={styles.modernBankName}>{item.bankAccount.bankName}</Text>
              </View>
              {item.bankAccount.iban && (
                <View style={styles.bankInfoRow}>
                  <Ionicons name="card" size={14} color="#6B7280" />
                  <Text style={styles.modernAccountInfo}>IBAN: •••• {item.bankAccount.iban.slice(-4)}</Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.modernRecipientAction}>
          <View style={[
            styles.modernStatusIndicator,
            { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }
          ]} />
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Modern Header */}
        <View style={styles.modernHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Recipients</Text>
            <Text style={styles.headerSubtitle}>Loading your recipients</Text>
          </View>
          <View style={styles.headerActionSpacer} />
        </View>
        
        <View style={styles.modernLoadingContainer}>
          <View style={styles.loadingIconContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
          <Text style={styles.modernLoadingText}>Loading recipients...</Text>
          <Text style={styles.modernLoadingSubtext}>Please wait while we fetch your data</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Recipients</Text>
          <Text style={styles.headerSubtitle}>Manage your money recipients</Text>
        </View>
        <TouchableOpacity style={styles.addHeaderButton} onPress={handleAddBeneficiary}>
          <Ionicons name="add" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.modernScrollView}
        contentContainerStyle={styles.modernScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Search Bar */}
        <View style={styles.modernSearchSection}>
          <View style={styles.modernSearchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#6B7280" />
            </View>
            <TextInput
              style={styles.modernSearchInput}
              placeholder="Search recipients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.modernClearButton}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Modern Tab Navigation */}
        <View style={styles.modernTabSection}>
          <View style={styles.modernTabContainer}>
            <TouchableOpacity
              style={[styles.modernTab, activeTab === 'recent' && styles.modernActiveTab]}
              onPress={() => setActiveTab('recent')}
            >
              <Ionicons 
                name="time" 
                size={16} 
                color={activeTab === 'recent' ? '#3B82F6' : '#9CA3AF'} 
              />
              <Text style={[styles.modernTabText, activeTab === 'recent' && styles.modernActiveTabText]}>Recent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modernTab, activeTab === 'all' && styles.modernActiveTab]}
              onPress={() => setActiveTab('all')}
            >
              <Ionicons 
                name="people" 
                size={16} 
                color={activeTab === 'all' ? '#3B82F6' : '#9CA3AF'} 
              />
              <Text style={[styles.modernTabText, activeTab === 'all' && styles.modernActiveTabText]}>All Recipients</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modern Recipients Section */}
        <View style={styles.modernRecipientsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.modernSectionTitle}>
              {activeTab === 'recent' ? 'Recent Recipients' : 'All Recipients'}
            </Text>
            <View style={styles.recipientCount}>
              <Ionicons name="people" size={16} color="#6B7280" />
              <Text style={styles.recipientCountText}>{filteredBeneficiaries.length}</Text>
            </View>
          </View>
          
          {filteredBeneficiaries.length > 0 ? (
            <View style={styles.modernRecipientsList}>
              {filteredBeneficiaries.map((item) => renderBeneficiary({ item }))}
            </View>
          ) : (
            <View style={styles.modernEmptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.modernEmptyStateTitle}>
                {searchQuery ? 'No recipients found' : 'No recipients yet'}
              </Text>
              <Text style={styles.modernEmptyStateText}>
                {searchQuery ? 'Try adjusting your search criteria' : 'Start sending money to see recipients here'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity 
                  style={styles.modernEmptyStateButton}
                  onPress={handleAddBeneficiary}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.modernEmptyStateButtonText}>Send Your First Transfer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
  addHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionSpacer: {
    width: 44,
    height: 44,
  },

  // 📱 Modern Scroll
  modernScrollView: {
    flex: 1,
  },
  modernScrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  // 🔍 Modern Search Section
  modernSearchSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  searchIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  modernClearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 📑 Modern Tab Section
  modernTabSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  modernTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  modernActiveTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  modernTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  modernActiveTabText: {
    color: '#3B82F6',
    fontWeight: '700',
  },

  // 👥 Modern Recipients Section
  modernRecipientsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  recipientCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  recipientCountText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },

  // 💳 Modern Recipient Cards
  modernRecipientsList: {
    gap: 12,
  },
  modernRecipientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modernRecipientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  modernRecipientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernRecipientInitials: {
    fontSize: 18,
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
    marginBottom: 8,
    gap: 8,
  },
  relationshipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modernRelationship: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  metadataDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modernCountry: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  transferCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastUsedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modernStatsLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernBankInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  bankInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernBankName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  modernAccountInfo: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'monospace',
    flex: 1,
  },
  modernRecipientAction: {
    alignItems: 'center',
    gap: 8,
  },
  modernStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // 🎭 Modern Loading State
  modernLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingIconContainer: {
    padding: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 24,
    marginBottom: 8,
  },
  modernLoadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  modernLoadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // 🎭 Modern Empty State
  modernEmptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconContainer: {
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  modernEmptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  modernEmptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  modernEmptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  modernEmptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});