import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '../../components/ui/Button';

export default function TransferSuccessScreen() {
  const params = useLocalSearchParams();
  
  const transferId = params.transferId as string;
  const amount = params.amount as string;
  const recipientName = params.recipientName as string;
  const targetAmount = params.targetAmount as string;
  const targetCurrency = params.targetCurrency as string;

  const formatCurrency = (value: string, currencyCode: string): string => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(numValue);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Success Icon */}
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Transfer Initiated!</Text>
            <Text style={styles.subtitle}>
              Your money is on its way to {recipientName}
            </Text>
          </View>

          {/* Transfer Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Transfer Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Transfer ID</Text>
              <Text style={styles.summaryValue}>{transferId}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount sent</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(amount, 'EUR')}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recipient gets</Text>
              <Text style={[styles.summaryValue, styles.recipientAmount]}>
                {formatCurrency(targetAmount, targetCurrency)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recipient</Text>
              <Text style={styles.summaryValue}>{recipientName}</Text>
            </View>
          </View>

          {/* Status Timeline */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Transfer Status</Text>
            
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.completedDot]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineText}>Transfer initiated</Text>
                <Text style={styles.timelineTime}>Just now</Text>
              </View>
            </View>
            
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.pendingDot]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineText}>Processing payment</Text>
                <Text style={styles.timelineTime}>Within 2 hours</Text>
              </View>
            </View>
            
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.futureDot]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineText}>Money arrives</Text>
                <Text style={styles.timelineTime}>1-2 business days</Text>
              </View>
            </View>
          </View>

          {/* Next Steps */}
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>What happens next?</Text>
            <Text style={styles.nextStepsText}>
              • We&apos;ll send you updates about your transfer
            </Text>
            <Text style={styles.nextStepsText}>
              • The recipient will be notified when money arrives
            </Text>
            <Text style={styles.nextStepsText}>
              • You can track your transfer in the activity tab
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="View Transfer Details"
            onPress={() => {
              // Navigate back to dashboard
              router.push('/(dashboard)');
            }}
            style={styles.detailsButton}
            textStyle={styles.detailsButtonText}
          />
          
          <Button
            title="Send Another Transfer"
            onPress={() => {
              router.replace('/send-money');
            }}
            variant="outline"
            style={styles.sendAnotherButton}
            textStyle={styles.sendAnotherButtonText}
          />
          
          <Button
            title="Back to Dashboard"
            onPress={() => {
              router.replace('/(dashboard)');
            }}
            variant="outline"
            style={styles.dashboardButton}
            textStyle={styles.dashboardButtonText}
          />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  
  // Success Icon
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 40,
    color: '#ffffff',
    fontWeight: '700',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1d29',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    textAlign: 'center',
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  recipientAmount: {
    color: '#059669',
    fontWeight: '700',
  },
  
  // Timeline Card
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  completedDot: {
    backgroundColor: '#059669',
  },
  pendingDot: {
    backgroundColor: '#f59e0b',
  },
  futureDot: {
    backgroundColor: '#e2e8f0',
  },
  timelineContent: {
    flex: 1,
  },
  timelineText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 13,
    color: '#64748b',
  },
  
  // Next Steps Card
  nextStepsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  nextStepsText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
    marginBottom: 6,
  },
  
  // Action Buttons
  actionButtons: {
    padding: 20,
    gap: 12,
    backgroundColor: '#f8fafb',
  },
  detailsButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  detailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sendAnotherButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendAnotherButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  dashboardButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  dashboardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});