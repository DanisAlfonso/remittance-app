import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../lib/walletStore';
import { wiseService } from '../../lib/wise';
import { transferService } from '../../lib/transfer';
import ComprehensiveBankingDetails from '../../components/ui/ComprehensiveBankingDetails';
import type { Transfer } from '../../types/transfer';

export default function AccountDetailsScreen() {
  const { selectedAccount, balance, refreshBalance } = useWalletStore();
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRecentTransfers();
  }, []);

  const loadRecentTransfers = async () => {
    try {
      const response = await transferService.getTransferHistory(5, 0);
      setRecentTransfers(response.transfers);
    } catch (error) {
      console.error('Failed to load transfers:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (selectedAccount) {
        await refreshBalance(selectedAccount.id);
      }
      await loadRecentTransfers();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!selectedAccount) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>No Account Selected</Text>
          <Text style={styles.errorSubtext}>Please select an account to view details</Text>
          <Pressable
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.modernHeader}>
        <Pressable 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </Pressable>
        <Text style={styles.headerTitle}>Account Details</Text>
        <Pressable style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#1E3A8A" />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* Premium Balance Hero Card */}
        <View style={styles.balanceHeroCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.accountIconLarge}>
              <Ionicons name="card" size={32} color="#3B82F6" />
            </View>
            <View style={styles.accountTitleSection}>
              <Text style={styles.accountNameLarge}>{selectedAccount.name}</Text>
              <Text style={styles.accountTypeLarge}>
                {wiseService.getAccountTypeDisplayName(selectedAccount.type)}
              </Text>
            </View>
            <View style={styles.statusBadgeContainer}>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: selectedAccount.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2' }
              ]}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: wiseService.getAccountStatusColor(selectedAccount.status || 'ACTIVE') }
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: selectedAccount.status === 'ACTIVE' ? '#10B981' : '#EF4444' }
                ]}>
                  {selectedAccount.status || 'ACTIVE'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.balanceDisplay}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              {wiseService.formatAmount(balance?.amount || 0, selectedAccount.currency)}
            </Text>
            <View style={styles.balanceMetadata}>
              <Ionicons name="time-outline" size={12} color="#9CA3AF" />
              <Text style={styles.balanceUpdated}>
                Last updated • {balance?.updatedAt ? new Date(balance.updatedAt).toLocaleTimeString() : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.quickActions}>
            <Pressable 
              style={styles.primaryActionButton}
              onPress={() => router.push('/(dashboard)/send-money')}
            >
              <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Send Money</Text>
            </Pressable>
            <Pressable 
              style={styles.secondaryActionButton}
              onPress={() => router.push('/(dashboard)/transactions')}
            >
              <Ionicons name="list" size={20} color="#3B82F6" />
              <Text style={styles.secondaryActionText}>View History</Text>
            </Pressable>
          </View>
        </View>

        {/* Account Information Card */}
        <View style={styles.modernSection}>
          <View style={styles.sectionHeaderModern}>
            <Text style={styles.sectionTitleModern}>Account Information</Text>
            <Ionicons name="information-circle" size={20} color="#6B7280" />
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="globe" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.infoCardLabel}>Currency</Text>
              <Text style={styles.infoCardValue}>{selectedAccount.currency}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="location" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.infoCardLabel}>Country</Text>
              <Text style={styles.infoCardValue}>
                {selectedAccount.iban 
                  ? wiseService.getCountryName(wiseService.getCountryFromIban(selectedAccount.iban))
                  : selectedAccount.country || 'N/A'}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.infoCardLabel}>Created</Text>
              <Text style={styles.infoCardValue}>
                {new Date(selectedAccount.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Comprehensive Banking Details */}
        <ComprehensiveBankingDetails 
          account={selectedAccount}
          style={styles.bankingSection}
        />

        {/* Recent Activity */}
        <View style={styles.modernSection}>
          <View style={styles.sectionHeaderModern}>
            <Text style={styles.sectionTitleModern}>Recent Activity</Text>
            {recentTransfers.length > 0 && (
              <Pressable
                onPress={() => router.push('/(dashboard)/transactions')}
                style={styles.viewAllButtonModern}
              >
                <Text style={styles.viewAllTextModern}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </Pressable>
            )}
          </View>

          {recentTransfers.length > 0 ? (
            <View style={styles.modernTransfersList}>
              {recentTransfers.map((transfer) => (
                <Pressable key={transfer.id} style={styles.modernTransferItem}>
                  <View style={styles.transferIconContainer}>
                    <View style={styles.transferIcon}>
                      <Ionicons 
                        name={Number(transfer.sourceAmount) < 0 ? "arrow-up" : "arrow-down"}
                        size={20} 
                        color={Number(transfer.sourceAmount) < 0 ? "#6B7280" : "#10B981"} 
                      />
                    </View>
                  </View>
                  
                  <View style={styles.transferDetailsModern}>
                    <Text style={styles.transferAmountModern}>
                      {transferService.formatAmount(transfer.sourceAmount, transfer.sourceCurrency)}
                    </Text>
                    <Text style={styles.transferDescriptionModern}>
                      {transfer.description || transfer.reference || 'Transfer'}
                    </Text>
                    <Text style={styles.transferDateModern}>
                      {new Date(transfer.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.transferStatusModern}>
                    <View style={[
                      styles.statusDotModern,
                      { backgroundColor: transferService.getStatusColor(transfer.status.status) }
                    ]} />
                    <Text style={[
                      styles.transferStatusTextModern,
                      { color: transferService.getStatusColor(transfer.status.status) }
                    ]}>
                      {transfer.status.status}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateModern}>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitleModern}>No recent activity</Text>
              <Text style={styles.emptyStateTextModern}>Your transfers will appear here once you start sending money</Text>
              <Pressable 
                style={styles.emptyStateButton}
                onPress={() => router.push('/(dashboard)/send-money')}
              >
                <Text style={styles.emptyStateButtonText}>Send Your First Transfer</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🎨 Base Container
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 💎 Premium Balance Hero Card
  balanceHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  accountIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitleSection: {
    flex: 1,
  },
  accountNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  accountTypeLarge: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadgeContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 8,
    letterSpacing: -1,
  },
  balanceMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // 🏗️ Modern Section Design
  modernSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitleModern: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  viewAllButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    gap: 4,
  },
  viewAllTextModern: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // 📊 Info Grid Layout
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '700',
    textAlign: 'center',
  },

  bankingSection: {
    marginBottom: 24,
  },

  // 📱 Modern Transfers
  modernTransfersList: {
    gap: 12,
  },
  modernTransferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  transferIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferDetailsModern: {
    flex: 1,
    gap: 2,
  },
  transferAmountModern: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  transferDescriptionModern: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  transferDateModern: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  transferStatusModern: {
    alignItems: 'center',
    gap: 4,
  },
  statusDotModern: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  transferStatusTextModern: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 🎭 Enhanced Error & Empty States
  emptyStateModern: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyStateIconContainer: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  emptyStateTitleModern: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptyStateTextModern: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 24,
  },
  errorIconContainer: {
    padding: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});