import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/(dashboard)')}
        >
          <Ionicons name="close" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Transfer Complete</Text>
          <Text style={styles.headerSubtitle}>Success confirmation</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <ScrollView 
        style={styles.modernScrollView}
        contentContainerStyle={styles.modernScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Success Section */}
        <View style={styles.modernSuccessSection}>
          {/* Success Icon */}
          <View style={styles.modernSuccessIcon}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>

          <View style={styles.modernHeaderContent}>
            <Text style={styles.modernTitle}>Transfer Initiated!</Text>
            <Text style={styles.modernSubtitle}>
              Your money is on its way to {recipientName}
            </Text>
          </View>
        </View>

        {/* Modern Transfer Summary */}
        <View style={styles.modernSummaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="receipt" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.modernSummaryTitle}>Transfer Summary</Text>
          </View>
          
          <View style={styles.modernSummaryContent}>
            <View style={styles.modernSummaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="document-text" size={16} color="#6B7280" />
                <Text style={styles.modernSummaryLabel}>Transfer ID</Text>
              </View>
              <Text style={styles.modernSummaryValue}>{transferId}</Text>
            </View>
            
            <View style={styles.modernSummaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="arrow-up-circle" size={16} color="#EF4444" />
                <Text style={styles.modernSummaryLabel}>Amount sent</Text>
              </View>
              <Text style={styles.modernSummaryValue}>
                {formatCurrency(amount, 'EUR')}
              </Text>
            </View>
            
            <View style={styles.modernSummaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="arrow-down-circle" size={16} color="#10B981" />
                <Text style={styles.modernSummaryLabel}>Recipient gets</Text>
              </View>
              <Text style={[styles.modernSummaryValue, styles.modernRecipientAmount]}>
                {formatCurrency(targetAmount, targetCurrency)}
              </Text>
            </View>
            
            <View style={styles.modernSummaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="person" size={16} color="#6B7280" />
                <Text style={styles.modernSummaryLabel}>Recipient</Text>
              </View>
              <Text style={styles.modernSummaryValue}>{recipientName}</Text>
            </View>
          </View>
        </View>

        {/* Modern Status Timeline */}
        <View style={styles.modernTimelineCard}>
          <View style={styles.timelineHeader}>
            <View style={styles.timelineIconContainer}>
              <Ionicons name="time" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.modernTimelineTitle}>Transfer Status</Text>
          </View>
          
          <View style={styles.modernTimelineContent}>
            <View style={styles.modernTimelineItem}>
              <View style={styles.modernTimelineIconContainer}>
                <View style={[styles.modernTimelineDot, styles.modernCompletedDot]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.timelineLine, styles.completedLine]} />
              </View>
              <View style={styles.modernTimelineContent}>
                <Text style={styles.modernTimelineText}>Transfer initiated</Text>
                <Text style={styles.modernTimelineTime}>Just now</Text>
              </View>
            </View>
            
            <View style={styles.modernTimelineItem}>
              <View style={styles.modernTimelineIconContainer}>
                <View style={[styles.modernTimelineDot, styles.modernPendingDot]}>
                  <Ionicons name="hourglass" size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.timelineLine, styles.pendingLine]} />
              </View>
              <View style={styles.modernTimelineContent}>
                <Text style={styles.modernTimelineText}>Processing payment</Text>
                <Text style={styles.modernTimelineTime}>Within 2 hours</Text>
              </View>
            </View>
            
            <View style={styles.modernTimelineItem}>
              <View style={styles.modernTimelineIconContainer}>
                <View style={[styles.modernTimelineDot, styles.modernFutureDot]}>
                  <Ionicons name="airplane" size={12} color="#9CA3AF" />
                </View>
              </View>
              <View style={styles.modernTimelineContent}>
                <Text style={styles.modernTimelineText}>Money arrives</Text>
                <Text style={styles.modernTimelineTime}>1-2 business days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Modern Next Steps */}
        <View style={styles.modernNextStepsCard}>
          <View style={styles.nextStepsHeader}>
            <View style={styles.nextStepsIconContainer}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.modernNextStepsTitle}>What happens next?</Text>
          </View>
          
          <View style={styles.modernNextStepsList}>
            <View style={styles.modernNextStepItem}>
              <Ionicons name="mail" size={16} color="#10B981" />
              <Text style={styles.modernNextStepsText}>
                We&apos;ll send you updates about your transfer
              </Text>
            </View>
            <View style={styles.modernNextStepItem}>
              <Ionicons name="notifications" size={16} color="#10B981" />
              <Text style={styles.modernNextStepsText}>
                The recipient will be notified when money arrives
              </Text>
            </View>
            <View style={styles.modernNextStepItem}>
              <Ionicons name="analytics" size={16} color="#10B981" />
              <Text style={styles.modernNextStepsText}>
                You can track your transfer in the activity tab
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modern Action Buttons */}
      <View style={styles.modernActionButtons}>
        <Button
          title="Send Another Transfer"
          onPress={() => {
            router.replace('/(dashboard)/send-money');
          }}
          style={styles.modernPrimaryButton}
          textStyle={styles.modernPrimaryButtonText}
        />
        
        <Button
          title="Back to Dashboard"
          onPress={() => {
            router.replace('/(dashboard)');
          }}
          variant="outline"
          style={styles.modernSecondaryButton}
          textStyle={styles.modernSecondaryButtonText}
        />
      </View>
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
  headerAction: {
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

  // 🎉 Modern Success Section
  modernSuccessSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modernSuccessIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  modernHeaderContent: {
    alignItems: 'center',
  },
  modernTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  modernSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
  },

  // 📋 Modern Summary Card
  modernSummaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
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
    marginBottom: 20,
    gap: 12,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernSummaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  modernSummaryContent: {
    gap: 16,
  },
  modernSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modernSummaryLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  modernSummaryValue: {
    fontSize: 15,
    color: '#1E3A8A',
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  modernRecipientAmount: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
  },

  // ⏱️ Modern Timeline Card
  modernTimelineCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernTimelineTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  modernTimelineContent: {
    gap: 0,
  },
  modernTimelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 60,
  },
  modernTimelineIconContainer: {
    alignItems: 'center',
    width: 32,
    marginRight: 16,
  },
  modernTimelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modernCompletedDot: {
    backgroundColor: '#10B981',
  },
  modernPendingDot: {
    backgroundColor: '#F59E0B',
  },
  modernFutureDot: {
    backgroundColor: '#E5E7EB',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 36,
  },
  completedLine: {
    backgroundColor: '#10B981',
  },
  pendingLine: {
    backgroundColor: '#F59E0B',
  },
  modernTimelineText: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
    marginBottom: 4,
  },
  modernTimelineTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // 💡 Modern Next Steps Card
  modernNextStepsCard: {
    backgroundColor: '#F0FDF4',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  nextStepsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modernNextStepsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  modernNextStepsList: {
    gap: 16,
  },
  modernNextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modernNextStepsText: {
    fontSize: 15,
    color: '#047857',
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
  },

  // 🎯 Modern Action Buttons
  modernActionButtons: {
    padding: 16,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  modernPrimaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modernPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modernSecondaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  modernSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});