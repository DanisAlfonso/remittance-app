import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
      
      // Debug: Log the transfer data to understand the issue
      console.log('🔍 Debug: Transfer data received:', response.transfers);
      response.transfers.forEach((transfer, index) => {
        console.log(`Transfer ${index}:`, {
          id: transfer.id,
          sourceAmount: transfer.sourceAmount,
          sourceCurrency: transfer.sourceCurrency,
          description: transfer.description,
          type: transfer.sourceAmount > 0 ? 'receive' : 'send'
        });
      });
      
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

  const formatCurrency = (amount: number, currencyCode: string): string => {
    const currencySymbols: Record<string, string> = {
      'EUR': '€',
      'USD': '$',
      'HNL': 'L', // Honduran Lempira
    };
    
    const symbol = currencySymbols[currencyCode] || currencyCode;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const calculateSummary = () => {
    let totalSent = 0;
    let totalReceived = 0;
    let primaryCurrency = 'EUR'; // Default to EUR

    transfers.forEach((transfer) => {
      // Use the first transfer's currency as primary currency for summary
      if (primaryCurrency === 'EUR' && transfer.sourceCurrency) {
        primaryCurrency = transfer.sourceCurrency;
      }
      
      if (transfer.sourceAmount > 0) {
        // Incoming transfer (positive amount)
        totalReceived += transfer.sourceAmount;
      } else {
        // Outgoing transfer (negative amount) - add absolute value to totalSent
        totalSent += Math.abs(transfer.sourceAmount);
      }
    });

    return { totalSent, totalReceived, primaryCurrency };
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

  const getStatusColor = (status: string | undefined) => {
    if (!status) {
      return '#6b7280'; // Professional gray for undefined/null
    }
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

  const getStatusText = (status: string | undefined) => {
    if (!status) {
      return 'Unknown';
    }
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const renderTransaction = ({ item }: { item: Transfer }) => {
    const transferType = getTransferType(item);
    const recipientName = getRecipientName(item);
    const amount = Math.abs(Number(item.sourceAmount) || 0);
    const currency = item.sourceCurrency;
    
    return (
      <TouchableOpacity style={styles.modernTransactionCard} activeOpacity={0.7}>
        <View style={styles.transactionIconContainer}>
          <View style={[
            styles.transactionIcon,
            { backgroundColor: transferType === 'send' ? '#EEF2FF' : '#F0FDF4' }
          ]}>
            <Ionicons 
              name={transferType === 'send' ? "arrow-up" : "arrow-down"}
              size={20} 
              color={transferType === 'send' ? "#3B82F6" : "#10B981"} 
            />
          </View>
        </View>
        
        <View style={styles.transactionDetails}>
          <View style={styles.transactionMainInfo}>
            <Text style={styles.modernRecipientName}>{recipientName}</Text>
            <Text style={styles.modernTransactionType}>
              {transferType === 'send' ? 'Money sent' : 'Money received'}
            </Text>
            <View style={styles.transactionMetadata}>
              <Text style={styles.modernDate}>
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              <View style={styles.statusDivider} />
              <View style={[
                styles.modernStatusBadge,
                { backgroundColor: getStatusColor(item.status.status) + '20' }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(item.status.status) }
                ]} />
                <Text style={[
                  styles.modernStatusText,
                  { color: getStatusColor(item.status.status) }
                ]}>
                  {getStatusText(item.status.status)}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.amountSection}>
            <Text style={[
              styles.modernAmount,
              { color: transferType === 'send' ? '#3B82F6' : '#10B981' }
            ]}>
              {transferType === 'send' ? '-' : '+'}{formatCurrency(amount, currency)}
            </Text>
            <Text style={styles.modernCurrency}>{currency}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Transactions</Text>
          <Text style={styles.headerSubtitle}>Your transaction history</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {/* Modern Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCardModern}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="arrow-up-circle" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.summaryTitleModern}>Total Sent</Text>
          </View>
          <Text style={styles.summaryValueModern}>{formatCurrency(calculateSummary().totalSent, calculateSummary().primaryCurrency)}</Text>
          <Text style={styles.summarySubtext}>This month</Text>
        </View>
        
        <View style={styles.summaryCardModern}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="arrow-down-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.summaryTitleModern}>Total Received</Text>
          </View>
          <Text style={styles.summaryValueModern}>{formatCurrency(calculateSummary().totalReceived, calculateSummary().primaryCurrency)}</Text>
          <Text style={styles.summarySubtext}>This month</Text>
        </View>
      </View>

      {/* Transactions Section */}
      <View style={styles.transactionsContainer}>
        <View style={styles.sectionHeaderModern}>
          <Text style={styles.sectionTitleModern}>All Transactions</Text>
          <Text style={styles.transactionCount}>{transfers.length} transactions</Text>
        </View>
        
        {isLoading ? (
          <View style={styles.modernLoadingContainer}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
            <Text style={styles.modernLoadingText}>Loading transactions...</Text>
            <Text style={styles.modernLoadingSubtext}>Please wait while we fetch your data</Text>
          </View>
        ) : error ? (
          <View style={styles.modernErrorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.modernErrorTitle}>Unable to load transactions</Text>
            <Text style={styles.modernErrorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadTransfers}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
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
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          />
        ) : (
          <View style={styles.modernEmptyState}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.modernEmptyStateTitle}>
              No transactions yet
            </Text>
            <Text style={styles.modernEmptyStateText}>
              Your transaction history will appear here once you start sending money
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => router.push('/(dashboard)/send-money')}
            >
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
              <Text style={styles.emptyStateButtonText}>Send Your First Transfer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🎨 Base Layout
  container: {
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 💎 Modern Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  summaryCardModern: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitleModern: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    flex: 1,
  },
  summaryValueModern: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // 🏗️ Transactions Section
  transactionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitleModern: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  transactionCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // 📱 Modern Transaction List
  transactionsList: {
    paddingBottom: 32,
  },
  modernTransactionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  transactionIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  transactionDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionMainInfo: {
    flex: 1,
  },
  modernRecipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  modernTransactionType: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  transactionMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statusDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  modernStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modernStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  modernAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  modernCurrency: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // 🎭 Enhanced States
  modernEmptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyStateIconContainer: {
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
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modernLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 64,
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
  },
  modernLoadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modernErrorContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  errorIconContainer: {
    padding: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FECACA',
    marginBottom: 8,
  },
  modernErrorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  modernErrorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});