import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../lib/auth';
import { apiClient } from '../../lib/api';
import Button from '../../components/ui/Button';

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

  const handleEditBeneficiary = (beneficiary: Beneficiary) => {
    Alert.alert(
      'Edit Recipient',
      `Edit functionality for ${beneficiary.firstName} ${beneficiary.lastName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit Details', onPress: () => {
          // Navigate to edit screen
          console.log('Edit beneficiary:', beneficiary.id);
        }}
      ]
    );
  };

  const handleAddBeneficiary = () => {
    router.push('/(dashboard)/send-money');
  };

  const renderBeneficiary = ({ item }: { item: Beneficiary }) => (
    <View style={styles.beneficiaryCard}>
      <View style={styles.beneficiaryHeader}>
        <View style={styles.beneficiaryInfo}>
          <Text style={styles.beneficiaryName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.relationship}>{item.relationship}</Text>
          <Text style={styles.country}>{item.country}</Text>
        </View>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.isActive ? '#059669' : '#dc3545' }
        ]} />
      </View>

      <View style={styles.contactInfo}>
        {item.transferCount && (
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>{item.transferCount} transfers</Text>
            {item.lastUsed && <Text style={styles.statsLabel}>Last: {item.lastUsed}</Text>}
          </View>
        )}
        {item.email && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Email:</Text>
            <Text style={styles.contactValue}>{item.email}</Text>
          </View>
        )}
        {item.phone && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone:</Text>
            <Text style={styles.contactValue}>{item.phone}</Text>
          </View>
        )}
        {item.bankAccount && (
          <View style={styles.bankInfo}>
            <Text style={styles.bankLabel}>Bank Details:</Text>
            <Text style={styles.bankValue}>{item.bankAccount.bankName}</Text>
            <Text style={styles.accountNumber}>
              Account: {item.bankAccount.accountNumber}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.beneficiaryActions}>
        <Button
          title="Send Money"
          onPress={() => handleSendMoney(item)}
          style={styles.sendButton}
        />
        <Button
          title="Edit"
          onPress={() => handleEditBeneficiary(item)}
          variant="secondary"
          style={styles.editButton}
        />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading recipients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recipients</Text>
          <Text style={styles.subtitle}>Manage your money recipients</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
            onPress={() => setActiveTab('recent')}
          >
            <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Recipients</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <Button
            title="Add New Recipient"
            onPress={handleAddBeneficiary}
            style={styles.addButton}
          />
        </View>

        <View style={styles.beneficiariesContainer}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'recent' ? 'Recent Recipients' : 'All Recipients'} ({filteredBeneficiaries.length})
          </Text>
          
          {filteredBeneficiaries.length > 0 ? (
            <FlatList
              data={filteredBeneficiaries}
              renderItem={renderBeneficiary}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.beneficiariesList}
              refreshing={isLoading}
              onRefresh={loadBeneficiaries}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No recipients found' : 'No recipients yet'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Try adjusting your search' : 'Start sending money to see recipients here'}
              </Text>
              {!searchQuery && (
                <Button
                  title="Send Your First Transfer"
                  onPress={handleAddBeneficiary}
                  style={styles.firstBeneficiaryButton}
                />
              )}
            </View>
          )}
        </View>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
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
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  quickActions: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 56,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  beneficiariesContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  beneficiariesList: {
    paddingBottom: 24,
  },
  beneficiaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  beneficiaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  beneficiaryInfo: {
    flex: 1,
  },
  beneficiaryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  relationship: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 2,
    fontWeight: '500',
  },
  country: {
    fontSize: 14,
    color: '#64748b',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    backgroundColor: '#059669',
  },
  contactInfo: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  contactLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 60,
  },
  contactValue: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  bankInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  bankLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  bankValue: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 2,
  },
  accountNumber: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  beneficiaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 44,
  },
  editButton: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    borderColor: '#e2e8f0',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  firstBeneficiaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 56,
  },
});