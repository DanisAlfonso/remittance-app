import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { transferService } from '../../lib/transfer';
import type { Transfer } from '../../types/transfer';

export default function TransactionsScreen() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      setError(null);
      const response = await transferService.getTransferHistory(50, 0); // Load more transactions
      setTransfers(response.transfers);
    } catch (error: unknown) {
      console.error('Failed to load transfers:', error);
      setError(error instanceof Error ? error.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTransfers();
    setIsRefreshing(false);
  };

  const calculateSummary = () => {
    let totalSent = 0;
    let totalReceived = 0;

    transfers.forEach((transfer) => {
      if (transfer.sourceAmount > 0) {
        // Incoming transfer (positive amount)
        totalReceived += transfer.sourceAmount;
      } else {
        // Outgoing transfer (negative amount) - add absolute value to totalSent
        totalSent += Math.abs(transfer.sourceAmount);
      }
    });

    return { totalSent, totalReceived };
  };

  const getTransferType = (transfer: Transfer): 'send' | 'receive' => {
    // If sourceAmount is positive, it's an incoming transfer (deposit)
    // If sourceAmount is negative, it's an outgoing transfer
    return transfer.sourceAmount > 0 ? 'receive' : 'send';
  };

  const getRecipientName = (transfer: Transfer): string => {
    if (getTransferType(transfer) === 'receive') {
      // For incoming transfers, try to extract sender name from description
      if (transfer.description?.includes('Transfer from')) {
        const senderName = transfer.description.replace('Transfer from ', '').trim();
        return senderName || 'App user';
      }
      // Try to get from reference field
      if (transfer.reference?.includes('Transfer from')) {
        const senderName = transfer.reference.replace('Transfer from ', '').trim();
        return senderName || 'App user';
      }
      return 'App user';
    }
    
    // For outgoing transfers, show recipient name
    if (transfer.recipient?.name) {
      return transfer.recipient.name;
    }
    
    // Fallback to extracting from reference
    if (transfer.reference?.includes('Transfer to')) {
      const recipientName = transfer.reference.replace('Transfer to ', '').trim();
      return recipientName || 'Recipient';
    }
    
    return 'Recipient';
  };

  const getTransferDescription = (transfer: Transfer): string => {
    const transferType = getTransferType(transfer);
    
    if (transferType === 'receive') {
      // For incoming transfers
      if (transfer.sourceCurrency === transfer.targetCurrency) {
        return 'Money received';
      } else {
        return `${transfer.sourceCurrency} to ${transfer.targetCurrency} conversion`;
      }
    } else {
      // For outgoing transfers
      if (transfer.recipient?.bankName) {
        return `Transfer to ${transfer.recipient.bankName}`;
      }
      if (transfer.sourceCurrency === transfer.targetCurrency) {
        return 'Money sent';
      } else {
        return `${transfer.sourceCurrency} to ${transfer.targetCurrency} transfer`;
      }
    }
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#059669'; // Professional green
      case 'pending':
        return '#d97706'; // Professional amber
      case 'processing':
      case 'sent':
        return '#0284c7'; // Professional blue
      case 'failed':
      case 'cancelled':
        return '#dc2626'; // Subtle red
      default:
        return '#6b7280'; // Professional gray
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const renderTransaction = ({ item }: { item: Transfer }) => {
    const transferType = getTransferType(item);
    const recipientName = getRecipientName(item);
    // Use absolute value of sourceAmount since incoming transfers are already positive
    // and outgoing transfers are negative but we want to show them as positive with - sign
    const amount = Math.abs(Number(item.sourceAmount) || 0);
    const currency = item.sourceCurrency;
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionType}>
              {transferType === 'send' ? 'Sent to' : 'Received from'}
            </Text>
            <Text style={styles.recipientName}>{recipientName}</Text>
            <Text style={styles.transactionDescription}>
              {getTransferDescription(item)}
            </Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={[
              styles.amount,
              { color: transferType === 'send' ? '#6b7280' : '#059669' }
            ]}>
              {transferType === 'send' ? '-' : '+'}${amount.toFixed(2)}
            </Text>
            <Text style={styles.currency}>{currency}</Text>
          </View>
        </View>
        
        <View style={styles.transactionFooter}>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status.status) + '20' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(item.status.status) }
            ]}>
              {getStatusText(item.status.status)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Your recent transaction history</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Quick Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Sent</Text>
            <Text style={styles.summaryValue}>${calculateSummary().totalSent.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Received</Text>
            <Text style={styles.summaryValue}>${calculateSummary().totalReceived.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : transfers.length > 0 ? (
          <FlatList
            data={transfers}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.transactionsList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No transactions yet
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Your transaction history will appear here
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  transactionsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  transactionsList: {
    paddingBottom: 24,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currency: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
});