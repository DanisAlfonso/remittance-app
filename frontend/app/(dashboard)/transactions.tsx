import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  currency: string;
  recipient: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

// Mock data for demo
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'send',
    amount: 500.00,
    currency: 'USD',
    recipient: 'John Smith',
    date: '2024-01-15',
    status: 'completed',
  },
  {
    id: '2',
    type: 'send',
    amount: 250.00,
    currency: 'USD',
    recipient: 'Maria Garcia',
    date: '2024-01-14',
    status: 'pending',
  },
  {
    id: '3',
    type: 'receive',
    amount: 100.00,
    currency: 'USD',
    recipient: 'David Wilson',
    date: '2024-01-13',
    status: 'completed',
  },
];

export default function TransactionsScreen() {
  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status: Transaction['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionType}>
            {item.type === 'send' ? '↗️ Sent to' : '↙️ Received from'}
          </Text>
          <Text style={styles.recipientName}>{item.recipient}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[
            styles.amount,
            { color: item.type === 'send' ? '#dc3545' : '#28a745' }
          ]}>
            {item.type === 'send' ? '-' : '+'}${item.amount.toFixed(2)}
          </Text>
          <Text style={styles.currency}>{item.currency}</Text>
        </View>
      </View>
      
      <View style={styles.transactionFooter}>
        <Text style={styles.date}>
          {new Date(item.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(item.status) }
          ]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
    </View>
  );

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
            <Text style={styles.summaryValue}>$750.00</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Received</Text>
            <Text style={styles.summaryValue}>$100.00</Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {mockTransactions.length > 0 ? (
          <FlatList
            data={mockTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.transactionsList}
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
});