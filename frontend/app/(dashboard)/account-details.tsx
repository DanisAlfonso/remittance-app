import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useWalletStore } from '../../lib/walletStore';
import { wiseService } from '../../lib/wise';
import { transferService } from '../../lib/transfer';
import Button from '../../components/ui/Button';
import IbanDisplay from '../../components/ui/IbanDisplay';
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
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No account selected</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Account Details</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {wiseService.formatAmount(balance?.amount || 0, selectedAccount.currency)}
          </Text>
          <Text style={styles.balanceUpdated}>
            {balance?.cached ? 'Cached' : 'Updated'} • {balance?.updatedAt ? new Date(balance.updatedAt).toLocaleTimeString() : 'N/A'}
          </Text>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Name</Text>
            <Text style={styles.infoValue}>{selectedAccount.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Type</Text>
            <Text style={styles.infoValue}>
              {wiseService.getAccountTypeDisplayName(selectedAccount.type)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Currency</Text>
            <Text style={styles.infoValue}>{selectedAccount.currency}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Country</Text>
            <Text style={styles.infoValue}>{selectedAccount.country}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: wiseService.getAccountStatusColor(selectedAccount.status || 'ACTIVE') }
                ]} 
              />
              <Text style={styles.infoValue}>{selectedAccount.status || 'ACTIVE'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(selectedAccount.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* IBAN Display */}
        {selectedAccount.iban && (
          <IbanDisplay
            iban={selectedAccount.iban}
            accountName={selectedAccount.name}
            currency={selectedAccount.currency}
            style={styles.ibanSection}
          />
        )}

        {/* Banking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Banking Details</Text>
          
          {selectedAccount.accountNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Number</Text>
              <Text style={styles.infoValueMono}>{selectedAccount.accountNumber}</Text>
            </View>
          )}

          {selectedAccount.routingNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Routing Number</Text>
              <Text style={styles.infoValueMono}>{selectedAccount.routingNumber}</Text>
            </View>
          )}

          {selectedAccount.sortCode && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sort Code</Text>
              <Text style={styles.infoValueMono}>{selectedAccount.sortCode}</Text>
            </View>
          )}

          {selectedAccount.bic && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BIC/SWIFT</Text>
              <Text style={styles.infoValueMono}>{selectedAccount.bic}</Text>
            </View>
          )}

          {selectedAccount.bankName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bank Name</Text>
              <Text style={styles.infoValue}>{selectedAccount.bankName}</Text>
            </View>
          )}
        </View>

        {/* Recent Transfers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Button
              title="View All"
              onPress={() => router.push('/(dashboard)/transactions')}
              variant="outline"
              style={styles.viewAllButton}
            />
          </View>

          {recentTransfers.length > 0 ? (
            <View style={styles.transfersList}>
              {recentTransfers.map((transfer) => (
                <View key={transfer.id} style={styles.transferItem}>
                  <View style={styles.transferInfo}>
                    <Text style={styles.transferAmount}>
                      {transferService.formatAmount(transfer.sourceAmount, transfer.sourceCurrency)}
                    </Text>
                    <Text style={styles.transferDescription}>
                      {transfer.description || transfer.reference || 'Transfer'}
                    </Text>
                    <Text style={styles.transferDate}>
                      {new Date(transfer.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.transferStatus}>
                    <Text style={styles.transferStatusIcon}>
                      {transferService.getStatusIcon(transfer.status.status)}
                    </Text>
                    <Text 
                      style={[
                        styles.transferStatusText,
                        { color: transferService.getStatusColor(transfer.status.status) }
                      ]}
                    >
                      {transfer.status.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No recent activity</Text>
              <Text style={styles.emptyStateText}>Your transfers will appear here</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Button
            title="Send Money"
            onPress={() => router.push('/(dashboard)/send-money')}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
  },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  balanceUpdated: {
    fontSize: 12,
    color: '#6c757d',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#333333',
    marginBottom: 16,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderRadius: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  infoValueMono: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '400',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  ibanSection: {
    marginBottom: 16,
  },
  transfersList: {
    gap: 12,
  },
  transferItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  transferInfo: {
    flex: 1,
  },
  transferAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  transferDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  transferDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  transferStatus: {
    alignItems: 'center',
  },
  transferStatusIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  transferStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  actionSection: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 24,
  },
});