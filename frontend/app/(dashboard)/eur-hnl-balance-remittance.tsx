import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/auth';
import { useWalletStore } from '../../lib/walletStore';
import { apiClient } from '../../lib/api';
import { remittanceService, type HNLRecipient } from '../../lib/remittanceService';

type FlowStep = 'recipients' | 'amount' | 'confirm' | 'processing' | 'success';

interface Recipient {
  id: string;
  name: string;
  accountNumber: string;
  accountId: string;
  bankName: string;
  currency: string;
  country: string;
}

interface BalanceRemittanceResult {
  success: boolean;
  transactionId?: string;
  eurDeducted?: number;
  hnlDeposited?: number;
  exchangeRate?: number;
  error?: {
    code: string;
    message: string;
  };
}

export default function EURHNLBalanceRemittanceScreen() {
  const params = useLocalSearchParams();
  const sourceCurrency = params.sourceCurrency?.toString() || 'EUR';
  const targetCurrency = params.targetCurrency?.toString() || 'HNL';
  const paymentType = params.paymentType?.toString() || 'balance';
  const { user, token } = useAuthStore();
  const { accounts, refreshBalance } = useWalletStore();
  const [step, setStep] = useState<FlowStep>('recipients');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [remittanceResult, setRemittanceResult] = useState<BalanceRemittanceResult | null>(null);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [eurBalance, setEurBalance] = useState<number>(0);

  useEffect(() => {
    // Only load data if we have accounts
    if (accounts && accounts.length > 0) {
      loadRecipients();
      loadEurBalance().catch(error => {
        console.error('Failed to load EUR balance:', error);
      });
    }
  }, [accounts]);

  useEffect(() => {
    if (step === 'amount' && amount && parseFloat(amount) > 0) {
      loadExchangeRate();
    }
  }, [step, amount]);

  const loadEurBalance = async () => {
    const eurAccount = accounts.find(acc => acc.currency === 'EUR');
    if (eurAccount) {
      console.log('🔍 Found EUR account:', eurAccount.id, 'Loading balance...');
      try {
        // Use the wallet store to refresh the balance
        await refreshBalance(eurAccount.id);
        
        // Get the updated balance from the wallet store
        const { balance } = useWalletStore.getState();
        if (balance && balance.amount) {
          let balanceValue: number;
          
          // Handle different balance formats
          if (typeof balance.amount === 'string') {
            balanceValue = parseFloat(balance.amount);
          } else if (typeof balance.amount === 'object' && 'value' in balance.amount) {
            balanceValue = balance.amount.value;
          } else if (typeof balance.amount === 'number') {
            balanceValue = balance.amount;
          } else {
            console.warn('⚠️ Balance format unexpected:', balance);
            setEurBalance(0);
            return;
          }
          
          if (!isNaN(balanceValue)) {
            console.log('💰 EUR balance loaded:', balanceValue);
            setEurBalance(balanceValue);
          } else {
            console.warn('⚠️ Could not parse balance value:', balance.amount);
            setEurBalance(0);
          }
        } else {
          console.warn('⚠️ No balance data found:', balance);
          setEurBalance(0);
        }
      } catch (error) {
        console.error('❌ Error loading EUR balance:', error);
        setEurBalance(0);
      }
    } else {
      console.log('📝 No EUR account found, setting balance to 0');
      setEurBalance(0);
    }
  };

  const loadRecipients = async () => {
    setIsLoadingRecipients(true);
    try {
      console.log('🔍 Loading HNL recipients from HNLBANK...');
      const result = await remittanceService.getHNLRecipients();
      
      if (result.success) {
        const hnlRecipients = result.recipients.map((r: HNLRecipient) => ({
          id: r.id,
          name: r.name,
          accountNumber: r.accountNumber,
          accountId: r.accountId,
          bankName: r.bankName,
          currency: r.currency,
          country: r.country
        }));
        
        console.log('✅ Loaded', hnlRecipients.length, 'HNL recipients');
        setRecipients(hnlRecipients);
      } else {
        console.error('❌ Failed to load recipients:', result.error);
        setRecipients([]);
      }
    } catch (error) {
      console.error('❌ Failed to load recipients:', error);
      setRecipients([]);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const loadExchangeRate = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsLoadingRate(true);
    try {
      console.log('💱 Getting EUR/HNL rate for €', amount);
      const result = await remittanceService.getExchangeRate(parseFloat(amount));
      
      if (result.success && result.data) {
        setCurrentRate(result.data.customerRate);
        console.log('✅ Exchange rate loaded:', result.data.customerRate, 'HNL/EUR');
      } else {
        console.error('❌ Failed to get exchange rate:', result.error);
        setCurrentRate(29.5); // Fallback rate
      }
    } catch (error) {
      console.error('❌ Failed to load exchange rate:', error);
      setCurrentRate(29.5); // Fallback rate
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleSelectRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    setStep('amount');
  };

  const handleContinueToConfirm = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (amountNum > eurBalance) {
      Alert.alert('Insufficient Balance', `You only have €${eurBalance.toFixed(2)} available`);
      return;
    }
    if (amountNum > 10000) {
      Alert.alert('Amount Too Large', 'Maximum amount is €10,000 per transfer');
      return;
    }
    setStep('confirm');
  };

  const handleProcessRemittance = async () => {
    if (!selectedRecipient || !amount) {
      Alert.alert('Error', 'Missing recipient or amount');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      console.log('🚀 Processing EUR → HNL remittance...');
      console.log('   Amount:', amount, 'EUR');
      console.log('   Recipient:', selectedRecipient.name);
      console.log('   Account ID:', selectedRecipient.accountId);

      // Execute real EUR → HNL remittance via production API
      const result = await remittanceService.executeRemittance({
        recipientAccountId: selectedRecipient.accountId,
        amountEUR: parseFloat(amount),
        description: `EUR → HNL remittance to ${selectedRecipient.name}`,
        recipientName: selectedRecipient.name
      });

      if (result.success && result.data) {
        console.log('✅ Remittance successful!', result.data.transactionId);
        
        // Update user's EUR balance in wallet store
        try {
          const { updateAccountBalance } = useWalletStore.getState();
          const eurAccount = accounts.find(acc => acc.currency === 'EUR');
          if (eurAccount && eurAccount.id) {
            const newBalance = eurBalance - result.data.amountEUR;
            updateAccountBalance(eurAccount.id, newBalance);
            console.log('💰 EUR balance updated:', eurBalance, '→', newBalance);
            
            // Also update local balance state
            setEurBalance(newBalance);
          } else {
            console.warn('⚠️ Could not find EUR account for balance update');
          }
        } catch (balanceError) {
          console.error('❌ Failed to update EUR balance:', balanceError);
          // Don't fail the whole transaction for balance update issues
        }

        setRemittanceResult({
          success: true,
          transactionId: result.data.transactionId,
          eurDeducted: result.data.amountEUR,
          hnlDeposited: result.data.amountHNL,
          exchangeRate: result.data.exchangeRate
        });
        setStep('success');
      } else {
        console.error('❌ Remittance failed:', result.error);
        setRemittanceResult({
          success: false,
          error: {
            code: result.error?.code || 'REMITTANCE_FAILED',
            message: result.error?.message || 'Transfer failed'
          }
        });
        setStep('success');
      }
    } catch (error) {
      console.error('❌ Remittance processing failed:', error);
      setRemittanceResult({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
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
    setRemittanceResult(null);
  };

  const calculateHNL = (eurAmount: string): number => {
    const eur = parseFloat(eurAmount);
    return eur && currentRate ? eur * currentRate : 0;
  };

  const calculateFees = (eurAmount: string) => {
    const eur = parseFloat(eurAmount);
    if (!eur) return { platformFee: 0, exchangeMargin: 0, total: 0 };
    
    const platformFee = 0; // No platform fee for balance transfers
    const exchangeMargin = eur * 0.015; // 1.5% margin on exchange
    return {
      platformFee,
      exchangeMargin,
      total: exchangeMargin
    };
  };

  // Render different steps
  const renderRecipientsStep = () => {
    // Show loading if accounts aren't loaded yet
    if (!accounts || accounts.length === 0) {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.modernHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Loading...</Text>
              <Text style={styles.headerSubtitle}>Preparing EUR → HNL transfer</Text>
            </View>
            <View style={styles.headerAction} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading your accounts...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <View style={styles.modernHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>EUR → HNL from Balance</Text>
            <Text style={styles.headerSubtitle}>Choose recipient in Honduras</Text>
          </View>
          <View style={styles.headerAction} />
        </View>

        <View style={styles.modernContent}>
        <View style={styles.balanceInfo}>
          <View style={styles.balanceCard}>
            <Ionicons name="wallet" size={24} color="#10B981" />
            <View style={styles.balanceText}>
              <Text style={styles.balanceLabel}>Available EUR Balance</Text>
              <Text style={styles.balanceAmount}>€{eurBalance.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {isLoadingRecipients ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading recipients...</Text>
          </View>
        ) : recipients.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Recipients in Honduras</Text>
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
                  <Text style={styles.recipientDetails}>{recipient.bankName} • {recipient.currency}</Text>
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
            <Text style={styles.emptyTitle}>No Recipients in Honduras</Text>
            <Text style={styles.emptyText}>Add recipients to send EUR → HNL transfers</Text>
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
  };

  const renderAmountStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => handleBackToStep('recipients')}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Send to {selectedRecipient?.name}</Text>
          <Text style={styles.headerSubtitle}>From your EUR balance</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount to send from EUR balance</Text>
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
          
          <View style={styles.balanceReminder}>
            <Ionicons name="wallet-outline" size={16} color="#6B7280" />
            <Text style={styles.balanceReminderText}>
              Available: €{eurBalance.toFixed(2)}
            </Text>
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
              <Text style={styles.feesTitle}>Balance Transfer Fees</Text>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Platform fee</Text>
                <Text style={styles.feeAmount}>€{calculateFees(amount).platformFee.toFixed(2)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Exchange margin</Text>
                <Text style={styles.feeAmount}>€{calculateFees(amount).exchangeMargin.toFixed(2)}</Text>
              </View>
              <View style={styles.feeDivider} />
              <View style={styles.feeRow}>
                <Text style={styles.totalLabel}>Total deducted from balance</Text>
                <Text style={styles.totalAmount}>
                  €{(parseFloat(amount) + calculateFees(amount).total).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.continueButton, (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > eurBalance) && styles.disabledButton]}
            onPress={handleContinueToConfirm}
            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > eurBalance}
          >
            <Text style={styles.continueButtonText}>Continue to Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderConfirmStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => handleBackToStep('amount')}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Confirm Balance Transfer</Text>
          <Text style={styles.headerSubtitle}>Review transfer details</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        <View style={styles.confirmationCard}>
          <View style={styles.transferSummary}>
            <Text style={styles.summaryTitle}>Balance Transfer Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>From</Text>
              <Text style={styles.summaryValue}>Your EUR Balance</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>To</Text>
              <Text style={styles.summaryValue}>{selectedRecipient?.name}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bank</Text>
              <Text style={styles.summaryValue}>{selectedRecipient?.bankName}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>You send</Text>
              <Text style={styles.summaryValue}>€{amount}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recipient gets</Text>
              <Text style={styles.summaryHighlight}>L.{calculateHNL(amount).toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Exchange margin</Text>
              <Text style={styles.summaryValue}>€{calculateFees(amount).exchangeMargin.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalSummaryLabel}>Total deducted</Text>
              <Text style={styles.totalSummaryValue}>
                €{(parseFloat(amount) + calculateFees(amount).total).toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleProcessRemittance}
          >
            <Text style={styles.confirmButtonText}>Confirm Balance Transfer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingContent}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.processingTitle}>Processing Balance Transfer</Text>
        <Text style={styles.processingText}>
          Converting EUR to HNL from your account balance...
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {remittanceResult?.success ? 'Transfer Successful' : 'Transfer Failed'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {remittanceResult?.success ? 'Balance transfer completed' : 'Something went wrong'}
          </Text>
        </View>
      </View>

      <View style={styles.modernContent}>
        {remittanceResult?.success ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            
            <Text style={styles.successTitle}>Balance Transfer Completed!</Text>
            <Text style={styles.successText}>
              €{remittanceResult.eurDeducted?.toFixed(2)} deducted from your EUR balance
            </Text>
            
            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Transaction ID</Text>
                <Text style={styles.resultValue}>{remittanceResult.transactionId}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Recipient received</Text>
                <Text style={styles.resultHighlight}>L.{remittanceResult.hnlDeposited?.toFixed(2)}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Exchange rate</Text>
                <Text style={styles.resultValue}>{remittanceResult.exchangeRate?.toFixed(4)} HNL/EUR</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.newTransferButton} onPress={handleNewTransfer}>
              <Text style={styles.newTransferText}>Send Another Transfer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.doneButton} onPress={() => router.push('/(dashboard)')}>
              <Text style={styles.doneButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            </View>
            
            <Text style={styles.errorTitle}>Transfer Failed</Text>
            <Text style={styles.errorText}>
              {remittanceResult?.error?.message || 'Unknown error occurred'}
            </Text>
            
            <TouchableOpacity style={styles.retryButton} onPress={() => handleBackToStep('confirm')}>
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
      case 'confirm':
        return renderConfirmStep();
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

  // Balance Info
  balanceInfo: {
    marginBottom: 24,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  balanceText: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
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
  balanceReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  balanceReminderText: {
    fontSize: 14,
    color: '#6B7280',
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

  // Confirmation Step
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