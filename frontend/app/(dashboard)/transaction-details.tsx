import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { transferService } from '../../lib/transfer';
import type { Transfer } from '../../types/transfer';
import { useWalletStore } from '../../lib/walletStore';

export default function TransactionDetailsScreen() {
  const { transferId, recipientName, recipientCurrency } = useLocalSearchParams<{
    transferId?: string;
    recipientName?: string;
    recipientCurrency?: string;
  }>();
  
  const { selectedAccount } = useWalletStore();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recipientInfo, setRecipientInfo] = useState<{
    name: string;
    currency: string;
    iban?: string;
    isInternalUser?: boolean;
    userId?: string;
    username?: string;
  } | null>(null);

  useEffect(() => {
    loadTransferDetails();
  }, [transferId]);

  const loadTransferDetails = async () => {
    if (!transferId) {
      console.log('❌ No transferId provided');
      Alert.alert('Error', 'Transfer ID not provided', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Loading transfer details for ID:', transferId);
      
      // Get transfer history to find the specific transfer
      const response = await transferService.getTransferHistory(50, 0);
      console.log('📋 Got transfer history response:', response.transfers?.length, 'transfers');
      const foundTransfer = response.transfers?.find(t => t.id === transferId);
      
      if (!foundTransfer) {
        Alert.alert('Error', 'Transfer not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      // Found transfer for details (log disabled for performance)
      setTransfer(foundTransfer);
      
      // Extract recipient information
      let extractedRecipientInfo: {
        name: string;
        currency: string;
        iban?: string;
        isInternalUser?: boolean;
        userId?: string;
        username?: string;
      } = {
        name: recipientName || 'Unknown Recipient',
        currency: recipientCurrency || foundTransfer.targetCurrency || 'EUR'
      };

      // Try to extract enhanced metadata
      if (foundTransfer.metadata) {
        try {
          const metadata = JSON.parse(foundTransfer.metadata);
          extractedRecipientInfo = {
            name: metadata.recipientName || recipientName || 'Unknown Recipient',
            currency: foundTransfer.targetCurrency || 'EUR',
            iban: metadata.recipientIban,
            isInternalUser: metadata.isInternalUser || false,
            userId: metadata.recipientUserId,
            username: metadata.recipientUsername
          };
        } catch {
          // Metadata not JSON, continue with fallback
        }
      }

      // Fallback extraction from recipient object
      if (foundTransfer.recipient) {
        extractedRecipientInfo.name = foundTransfer.recipient.name || extractedRecipientInfo.name;
        extractedRecipientInfo.iban = foundTransfer.recipient.iban || extractedRecipientInfo.iban;
      }

      setRecipientInfo(extractedRecipientInfo);
    } catch (error) {
      console.error('❌ Error loading transfer details:', error);
      Alert.alert('Error', 'Failed to load transfer details', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepeatTransfer = () => {
    if (!transfer || !recipientInfo) {
      return;
    }

    const transferAmount = Math.abs(transfer.sourceAmount || 0);
    
    if (recipientInfo.isInternalUser && recipientInfo.userId) {
      // Internal user transfer
      router.push({
        pathname: '/(dashboard)/transfer-amount',
        params: {
          recipientId: recipientInfo.userId,
          recipientName: recipientInfo.name,
          recipientUsername: recipientInfo.username || '',
          transferType: 'user',
          currency: transfer.sourceCurrency || selectedAccount?.currency || 'EUR',
          prefillAmount: transferAmount.toString(),
          fromRepeatTransfer: 'true'
        }
      });
    } else {
      // External bank transfer
      const recipientData = {
        type: 'iban',
        holderName: recipientInfo.name,
        iban: recipientInfo.iban || '',
        currency: recipientInfo.currency,
        country: getCountryFromCurrency(recipientInfo.currency),
        bankName: 'Bank Transfer',
      };
      
      router.push({
        pathname: '/(dashboard)/transfer-amount',
        params: {
          currency: transfer.sourceCurrency || selectedAccount?.currency || 'EUR',
          recipientData: JSON.stringify(recipientData),
          prefillAmount: transferAmount.toString(),
          fromRepeatTransfer: 'true'
        }
      });
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const getStatusIcon = (status: Transfer['status']) => {
    const statusValue = status?.status || 'COMPLETED';
    const statusLower = statusValue.toLowerCase();
    switch (statusLower) {
      case 'completed':
      case 'received':
        return <Ionicons name="checkmark-circle" size={24} color={transferService.getStatusColor(statusValue)} />;
      case 'pending':
      case 'processing':
      case 'sent':
        return <Ionicons name="time" size={24} color={transferService.getStatusColor(statusValue)} />;
      case 'failed':
      case 'cancelled':
        return <Ionicons name="close-circle" size={24} color={transferService.getStatusColor(statusValue)} />;
      default:
        return <Ionicons name="help-circle" size={24} color={transferService.getStatusColor(statusValue)} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transfer || !recipientInfo) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Transaction Not Found</Text>
          <Text style={styles.errorText}>Unable to load transaction details</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Transaction Details</Text>
          <Text style={styles.headerSubtitle}>Transfer Information</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {getStatusIcon(transfer.status)}
            <View style={styles.statusInfo}>
              <Text style={[styles.statusText, { color: transferService.getStatusColor(transfer.status?.status || 'COMPLETED') }]}>
                {transfer.status?.status || 'COMPLETED'}
              </Text>
              <Text style={styles.statusDate}>{formatDate(transfer.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountHeader}>
            <Text style={styles.amountLabel}>Transfer Amount</Text>
            <Text style={styles.amountValue}>
              {formatAmount(transfer.sourceAmount || 0, transfer.sourceCurrency || 'EUR')}
            </Text>
          </View>
          
          {transfer.targetCurrency && transfer.targetCurrency !== transfer.sourceCurrency && (
            <View style={styles.exchangeInfo}>
              <View style={styles.exchangeRow}>
                <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                <Text style={styles.receivedText}>Recipient received</Text>
                <Text style={styles.receivedAmount}>
                  {formatAmount((transfer.targetAmount || Math.abs(transfer.sourceAmount || 0)), transfer.targetCurrency)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Recipient Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Recipient Details</Text>
          
          <View style={styles.recipientInfo}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientInitials}>
                {recipientInfo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.recipientDetails}>
              <Text style={styles.recipientName}>{recipientInfo.name}</Text>
              <View style={styles.recipientMeta}>
                <View style={styles.currencyChip}>
                  <Text style={styles.currencyChipText}>{recipientInfo.currency}</Text>
                </View>
{recipientInfo.currency === 'HNL' && (
                  <View style={styles.internationalBadge}>
                    <Ionicons name="globe-outline" size={12} color="#3B82F6" />
                    <Text style={styles.internationalText}>International</Text>
                  </View>
                )}
              </View>
              {recipientInfo.iban && (
                <Text style={styles.ibanText}>IBAN: {recipientInfo.iban}</Text>
              )}
              {recipientInfo.username && (
                <Text style={styles.usernameText}>@{recipientInfo.username}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Transaction Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Transaction Details</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={styles.detailValue}>{transfer.id}</Text>
            </View>
            
            {transfer.reference && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference</Text>
                <Text style={styles.detailValue}>{transfer.reference}</Text>
              </View>
            )}
            
            {transfer.description && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{transfer.description}</Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transfer Type</Text>
              <Text style={styles.detailValue}>
                {recipientInfo.isInternalUser ? 'Internal Transfer' : 'Bank Transfer'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.repeatButton}
            onPress={handleRepeatTransfer}
            activeOpacity={0.9}
          >
            <Ionicons name="repeat" size={20} color="#FFFFFF" />
            <Text style={styles.repeatButtonText}>Repeat Transfer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header
  header: {
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
  backButton: {
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  headerSpacer: {
    width: 48,
  },
  
  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 32,
  },
  
  // Status Card
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statusDate: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Amount Card
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  amountHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.5,
  },
  exchangeInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  exchangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  receivedText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  receivedAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  
  // Details Cards
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  
  // Recipient Info
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recipientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  recipientInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: -0.2,
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  recipientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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
  internationalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  internationalText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },
  ibanText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  usernameText: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  
  // Details Grid
  detailsGrid: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },
  
  // Action Button
  actionContainer: {
    marginTop: 8,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  repeatButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 16,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});