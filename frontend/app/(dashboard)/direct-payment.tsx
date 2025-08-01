import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// import { useAuthStore } from '../../lib/auth';
import { apiClient } from '../../lib/api';

type FlowStep = 'recipients' | 'amount' | 'payment' | 'processing' | 'success';

interface Recipient {
  id: string;
  name: string;
  email?: string;
  iban?: string;
  currency: string;
  country: string;
  lastUsed: string;
  accountNumber?: string;
  bankName?: string;
}

interface DirectPaymentResult {
  success: boolean;
  transactionId?: string;
  eurDeducted?: number;
  hnlDeposited?: number;
  exchangeRate?: number;
  fees?: {
    platformFee: number;
    exchangeMargin: number;
    totalFee: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export default function DirectPaymentScreen() {
  // const { user, token } = useAuthStore(); // Commented out as not used
  const [step, setStep] = useState<FlowStep>('recipients');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<DirectPaymentResult | null>(null);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  useEffect(() => {
    loadRecipients();
  }, []);

  useEffect(() => {
    if (step === 'amount' && amount) {
      loadExchangeRate();
    }
  }, [step, amount]);

  const loadRecipients = async () => {
    setIsLoadingRecipients(true);
    try {
      // Load HNL recipients from beneficiaries
      const response = await apiClient.get('/api/v1/beneficiaries') as {
        success: boolean;
        data?: {
          beneficiaries: Array<{
            currency: string;
            accountNumber: string;
            firstName: string;
            lastName: string;
            bankName: string;
          }>;
        };
      };
      
      if (response.success && response.data?.beneficiaries) {
        const hnlRecipients = response.data.beneficiaries
          .filter((b) => b.currency === 'HNL')
          .map((b) => ({
            id: b.accountNumber,
            name: `${b.firstName} ${b.lastName}`,
            accountNumber: b.accountNumber,
            currency: 'HNL',
            country: 'HN',
            bankName: b.bankName,
            lastUsed: 'Available'
          }));
        
        setRecipients(hnlRecipients);
      }
    } catch (error) {
      console.error('Failed to load recipients:', error);
      setRecipients([]);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const loadExchangeRate = async () => {
    setIsLoadingRate(true);
    try {
      const response = await apiClient.get('/api/v1/exchange-rates/EUR/HNL') as {
        success: boolean;
        data?: { rate: number };
      };
      if (response.success && response.data?.rate) {
        // Apply 1.5% margin like production service
        const interBankRate = response.data.rate;
        const customerRate = interBankRate * 0.985; // 1.5% margin
        setCurrentRate(customerRate);
      }
    } catch (error) {
      console.error('Failed to load exchange rate:', error);
      setCurrentRate(29.5); // Fallback rate
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleSelectRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    setStep('amount');
  };

  const handleContinueToPayment = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (amountNum > 10000) {
      Alert.alert('Amount Too Large', 'Maximum amount is €10,000 per transfer');
      return;
    }
    setStep('payment');
  };

  const handleProcessPayment = async () => {
    if (!selectedRecipient || !amount) {
      Alert.alert('Error', 'Missing recipient or amount');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      // Call production remittance API
      const response = await apiClient.post('/api/v1/remittance/production', {
        recipientAccountId: selectedRecipient.accountNumber,
        amountEUR: parseFloat(amount),
        description: `Direct payment to ${selectedRecipient.name} - €${amount}`,
        recipientName: selectedRecipient.name
      }) as {
        success: boolean;
        data?: {
          transactionId: string;
          eurDeducted: number;
          hnlDeposited: number;
          exchangeRate: number;
          fees: {
            platformFee: number;
            exchangeMargin: number;
            totalFee: number;
          };
        };
        error?: {
          message: string;
        };
      };

      if (response.success && response.data) {
        setPaymentResult({
          success: true,
          transactionId: response.data.transactionId,
          eurDeducted: response.data.eurDeducted,
          hnlDeposited: response.data.hnlDeposited,
          exchangeRate: response.data.exchangeRate,
          fees: response.data.fees
        });
        setStep('success');
      } else {
        throw new Error(response.error?.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentResult({
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      });
      setStep('success');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToStep = (targetStep: FlowStep) => {
    setStep(targetStep);
  };

  const handleNewTransfer = () => {
    setStep('recipients');
    setSelectedRecipient(null);
    setAmount('');
    setPaymentResult(null);
  };

  const calculateHNL = (eurAmount: string): number => {
    const eur = parseFloat(eurAmount);
    return eur && currentRate ? eur * currentRate : 0;
  };

  const calculatePlatformFee = (amount: number): number => {
    if (amount <= 100) {return 0.99;}      // €0.99 for transfers up to €100
    if (amount <= 500) {return 1.99;}      // €1.99 for transfers €101-€500
    if (amount <= 1000) {return 2.99;}     // €2.99 for transfers €501-€1000
    return 4.99;                         // €4.99 for transfers over €1000
  };

  const calculateFees = (eurAmount: string) => {
    const eur = parseFloat(eurAmount);
    const baseFee = eur ? calculatePlatformFee(eur) : 0.99;
    if (!eur) {return { platformFee: baseFee, exchangeMargin: 0, total: baseFee };}
    
    const platformFee = baseFee;
    // Note: Exchange margin is built into the rate (like real remittance services)
    const exchangeMargin = 0; // Margin is built into exchange rate
    return {
      platformFee,
      exchangeMargin,
      total: platformFee // Only show the transparent transfer fee
    };
  };

  // Render different steps
  const renderRecipientsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Direct Payment</Text>
          <Text style={styles.headerSubtitle}>Choose recipient in Honduras</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        {isLoadingRecipients ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading recipients...</Text>
          </View>
        ) : recipients.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Available Recipients</Text>
            {recipients.map((recipient) => (
              <TouchableOpacity 
                key={recipient.id}
                style={styles.recipientCard}
                onPress={() => handleSelectRecipient(recipient)}
              >
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientInitials}>
                    {recipient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName}>{recipient.name}</Text>
                  <Text style={styles.recipientDetails}>{recipient.bankName} • HNL</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Recipients Yet</Text>
            <Text style={styles.emptyText}>You need to add recipients first</Text>
            <TouchableOpacity 
              style={styles.addRecipientButton}
              onPress={() => router.push('/(dashboard)/add-recipient?currency=HNL')}
            >
              <Text style={styles.addRecipientText}>Add Recipient</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderAmountStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => handleBackToStep('recipients')}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Send to {selectedRecipient?.name}</Text>
          <Text style={styles.headerSubtitle}>Enter amount to send</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount to send</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>€</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          {amount && currentRate > 0 && (
            <View style={styles.conversionCard}>
              <View style={styles.conversionRow}>
                <Text style={styles.conversionLabel}>Recipient gets</Text>
                <Text style={styles.conversionAmount}>
                  L.{calculateHNL(amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.conversionRow}>
                <Text style={styles.conversionRate}>
                  Rate: {currentRate.toFixed(4)} HNL/EUR
                </Text>
                {isLoadingRate && <ActivityIndicator size="small" color="#6B7280" />}
              </View>
            </View>
          )}

          {amount && (
            <View style={styles.feesCard}>
              <Text style={styles.feesTitle}>Fees & Charges</Text>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Platform fee</Text>
                <Text style={styles.feeAmount}>€{calculateFees(amount).platformFee.toFixed(2)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.totalLabel}>Total cost</Text>
                <Text style={styles.totalAmount}>
                  €{(parseFloat(amount) + calculateFees(amount).total).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.continueButton, (!amount || parseFloat(amount) <= 0) && styles.disabledButton]}
            onPress={handleContinueToPayment}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <Text style={styles.continueButtonText}>Continue to Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => handleBackToStep('amount')}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Confirm Payment</Text>
          <Text style={styles.headerSubtitle}>Review transfer details</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        <View style={styles.confirmationCard}>
          <View style={styles.transferSummary}>
            <Text style={styles.summaryTitle}>Transfer Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>To</Text>
              <Text style={styles.summaryValue}>{selectedRecipient?.name}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bank</Text>
              <Text style={styles.summaryValue}>{selectedRecipient?.bankName}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>€{amount}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recipient gets</Text>
              <Text style={styles.summaryHighlight}>L.{calculateHNL(amount).toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform fee</Text>
              <Text style={styles.summaryValue}>€{calculateFees(amount).platformFee.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalSummaryLabel}>Total to pay</Text>
              <Text style={styles.totalSummaryValue}>
                €{(parseFloat(amount) + calculateFees(amount).total).toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleProcessPayment}
          >
            <Text style={styles.confirmButtonText}>Confirm & Pay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingContent}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.processingTitle}>Processing Payment</Text>
        <Text style={styles.processingText}>
          Executing production-grade remittance through master accounts...
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {paymentResult?.success ? 'Payment Successful' : 'Payment Failed'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {paymentResult?.success ? 'Transfer completed' : 'Something went wrong'}
          </Text>
        </View>
      </View>

      <View style={styles.modernContent}>
        {paymentResult?.success ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            
            <Text style={styles.successTitle}>Transfer Completed!</Text>
            <Text style={styles.successText}>
              €{paymentResult.eurDeducted?.toFixed(2)} sent to {selectedRecipient?.name}
            </Text>
            
            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Transaction ID</Text>
                <Text style={styles.resultValue}>{paymentResult.transactionId}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Recipient received</Text>
                <Text style={styles.resultHighlight}>L.{paymentResult.hnlDeposited?.toFixed(2)}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Exchange rate</Text>
                <Text style={styles.resultValue}>{paymentResult.exchangeRate?.toFixed(4)} HNL/EUR</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.newTransferButton} onPress={handleNewTransfer}>
              <Text style={styles.newTransferText}>Send Another Transfer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.doneButton} onPress={() => router.push('/(dashboard)')}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            </View>
            
            <Text style={styles.errorTitle}>Payment Failed</Text>
            <Text style={styles.errorText}>
              {paymentResult?.error?.message || 'Unknown error occurred'}
            </Text>
            
            <TouchableOpacity style={styles.retryButton} onPress={() => handleBackToStep('payment')}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.push('/(dashboard)')}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'recipients':
        return renderRecipientsStep();
      case 'amount':
        return renderAmountStep();
      case 'payment':
        return renderPaymentStep();
      case 'processing':
        return renderProcessingStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderRecipientsStep();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.modernScrollView}
        contentContainerStyle={styles.modernScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base Layout
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modernScrollView: {
    flex: 1,
  },
  modernScrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  stepContainer: {
    flex: 1,
  },

  // Modern Header
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

  // Modern Content
  modernContent: {
    padding: 16,
  },

  // Recipients Step
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  recipientCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
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
  recipientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  recipientDetails: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addRecipientButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addRecipientText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // Amount Step
  amountSection: {
    gap: 24,
  },
  amountLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#1E3A8A',
    padding: 0,
  },
  conversionCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversionLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  conversionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  conversionRate: {
    fontSize: 14,
    color: '#6B7280',
  },
  feesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  feesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  feeAmount: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Payment Step
  confirmationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  transferSummary: {
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  summaryHighlight: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  totalSummaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  totalSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  confirmButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Processing Step
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingContent: {
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 24,
    marginBottom: 16,
  },
  processingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Success/Error Steps
  successCard: {
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  resultDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  resultHighlight: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
  },
  newTransferButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  newTransferText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  doneButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error State
  errorCard: {
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});