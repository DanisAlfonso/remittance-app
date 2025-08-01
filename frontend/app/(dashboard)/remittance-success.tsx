import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';

export default function RemittanceSuccessScreen() {
  const params = useLocalSearchParams();
  
  const transactionId = params.transactionId as string;
  const amountEUR = parseFloat(params.amountEUR as string || '0');
  const amountHNL = parseFloat(params.amountHNL as string || '0');
  const recipientName = params.recipientName as string;
  const exchangeRate = parseFloat(params.exchangeRate as string || '0');

  const formatCurrency = (value: number, currencyCode: string): string => {
    const symbols: Record<string, string> = { 'EUR': '€', 'HNL': 'L.' };
    return `${symbols[currencyCode] || currencyCode}${value.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Remittance Sent Successfully!</Text>
          <Text style={styles.successSubtitle}>Your money is on its way to Honduras</Text>
        </View>

        {/* Transfer Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Transfer Summary</Text>
          
          <View style={styles.amountFlow}>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>You sent</Text>
              <Text style={styles.amountEUR}>{formatCurrency(amountEUR, 'EUR')}</Text>
            </View>
            
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={24} color="#6B7280" />
            </View>
            
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Recipient gets</Text>
              <Text style={styles.amountHNL}>{formatCurrency(amountHNL, 'HNL')}</Text>
            </View>
          </View>

          <View style={styles.rateInfo}>
            <Text style={styles.rateText}>
              Exchange rate: 1 EUR = {exchangeRate.toFixed(4)} HNL
            </Text>
          </View>
        </View>

        {/* Transaction Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Transaction Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{transactionId.slice(-8)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recipient</Text>
            <Text style={styles.detailValue}>{recipientName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Destination</Text>
            <Text style={styles.detailValue}>Honduras 🇭🇳</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Completed</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Important Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <Text style={styles.infoTitle}>Important Information</Text>
          </View>
          <Text style={styles.infoText}>
            • The recipient will receive the lempiras in their Honduras bank account{'\n'}
            • Processing typically takes 1-2 business days{'\n'}
            • You&apos;ll receive an email confirmation shortly{'\n'}
            • Keep this transaction ID for your records
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Send Another Remittance"
          onPress={() => {
            router.replace('/(dashboard)');
          }}
          style={styles.primaryButton}
          textStyle={styles.primaryButtonText}
        />
        
        <Button
          title="Back to Dashboard"
          onPress={() => {
            router.replace('/(dashboard)');
          }}
          variant="outline"
          style={styles.secondaryButton}
          textStyle={styles.secondaryButtonText}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Success Header
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 20,
    textAlign: 'center',
  },
  amountFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountBox: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  amountEUR: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
  },
  amountHNL: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
  },
  arrowContainer: {
    paddingHorizontal: 16,
  },
  rateInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  rateText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  statusText: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Action Buttons
  actionButtons: {
    padding: 20,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});