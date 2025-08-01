import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/auth';
import { apiClient } from '../../lib/api';
import Button from '../../components/ui/Button';

interface ExchangeRateData {
  amount: number;
  currency: string;
  targetAmount: number;
  targetCurrency: string;
  interBankRate: number;
  customerRate: number;
  fees: {
    platformFee: number;
    exchangeMargin: number;
    totalFee: number;
  };
  totalEURDeducted: number;
  source: string;
  timestamp: number;
}

interface Recipient {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  phone?: string;
  address?: string;
  country: string;
}

export default function EURHNLRemittanceScreen() {
  const { token } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateData | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'recipients' | 'amount' | 'confirm'>('recipients');

  useEffect(() => {
    loadRecipients();
  }, []);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      loadExchangeRate();
    } else {
      setExchangeRate(null);
    }
  }, [amount]);

  const loadRecipients = async () => {
    if (!token) {return;}
    
    setIsLoadingRecipients(true);
    try {
      const response = await apiClient.obpGet('/obp/v5.1.0/remittance/recipients', {
        headers: { Authorization: `Bearer ${token}` }
      }) as { success: boolean; data: Recipient[] };

      if (response.success) {
        setRecipients(response.data);
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
      // For demo purposes, create test recipients if none exist
      setRecipients([
        {
          id: '625fede6-0750-485d-acd7-ca85eda46263',
          name: 'Juan Carlos Rodriguez',
          accountNumber: '625fede6-0750-485d-acd7-ca85eda46263',
          bankName: 'Banco Atlántida (HNLBANK2)',
          country: 'HN'
        },
        {
          id: 'demo-recipient-2',
          name: 'Maria Elena Santos',
          accountNumber: 'demo-account-2',
          bankName: 'Banco Atlántida (HNLBANK2)',
          country: 'HN'
        }
      ]);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const loadExchangeRate = async () => {
    if (!token || !amount || parseFloat(amount) <= 0) {return;}
    
    setIsLoadingRate(true);
    try {
      const response = await apiClient.obpGet(`/obp/v5.1.0/remittance/exchange-rate?amount=${amount}`, {
        headers: { Authorization: `Bearer ${token}` }
      }) as { success: boolean; data: ExchangeRateData };

      if (response.success) {
        setExchangeRate(response.data);
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      Alert.alert('Error', 'Failed to load exchange rate');
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setAmount(cleanValue);
  };

  const validateAmount = (): boolean => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return false;
    }
    
    if (numAmount < 1) {
      Alert.alert('Minimum Amount', 'Minimum remittance amount is €1');
      return false;
    }
    
    if (numAmount > 10000) {
      Alert.alert('Maximum Amount', 'Maximum remittance amount is €10,000');
      return false;
    }
    
    return true;
  };

  const handleSendRemittance = async () => {
    if (!validateAmount() || !selectedRecipient || !token) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const remittanceData = {
        recipientAccountId: selectedRecipient.id,
        amountEUR: parseFloat(amount),
        description: `Remittance to ${selectedRecipient.name} in Honduras`,
        recipientName: selectedRecipient.name
      };

      const response = await apiClient.obpPost('/obp/v5.1.0/remittance/send', remittanceData, {
        headers: { Authorization: `Bearer ${token}` }
      }) as { 
        success: boolean; 
        data?: {
          transactionId: string;
          amountEUR: number;
          amountHNL: number;
          exchangeRate: number;
          fees: {
            platformFee: number;
            exchangeMargin: number;
            totalFee: number;
          };
        };
        error?: string;
      };

      if (response.success && response.data) {
        Alert.alert(
          'Remittance Sent Successfully! 🎉',
          `€${response.data.amountEUR} has been sent to ${selectedRecipient.name}. They will receive L.${response.data.amountHNL.toFixed(2)} HNL.`,
          [
            {
              text: 'View Details',
              onPress: () => {
                router.replace({
                  pathname: '/(dashboard)/remittance-success',
                  params: {
                    transactionId: response.data!.transactionId,
                    amountEUR: response.data!.amountEUR.toString(),
                    amountHNL: response.data!.amountHNL.toString(),
                    recipientName: selectedRecipient.name,
                    exchangeRate: response.data!.exchangeRate.toString()
                  }
                });
              }
            },
            {
              text: 'Send Another',
              onPress: () => {
                setAmount('');
                setSelectedRecipient(null);
                setExchangeRate(null);
                setStep('recipients');
              }
            }
          ]
        );
      } else {
        throw new Error(response.error || 'Remittance failed');
      }
    } catch (error) {
      console.error('Remittance error:', error);
      
      let errorMessage = 'There was an error processing your remittance. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Remittance Failed', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };


  const renderRecipientsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>EUR → HNL Remittance</Text>
          <Text style={styles.headerSubtitle}>Send money to Honduras</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <View style={styles.modernContent}>
        <View style={styles.modernSection}>
          <Text style={styles.modernSectionTitle}>Choose Recipient in Honduras</Text>
          
          {isLoadingRecipients ? (
            <View style={styles.modernLoadingCard}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.modernLoadingText}>Loading recipients...</Text>
            </View>
          ) : recipients.length > 0 ? (
            recipients.map((recipient) => (
              <TouchableOpacity 
                key={recipient.id} 
                style={styles.modernRecipientCard}
                onPress={() => {
                  setSelectedRecipient(recipient);
                  setStep('amount');
                }}
              >
                <View style={styles.modernAvatar}>
                  <Text style={styles.modernInitials}>
                    {recipient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modernRecipientInfo}>
                  <Text style={styles.modernRecipientName}>{recipient.name}</Text>
                  <Text style={styles.modernRecipientDetails}>{recipient.bankName}</Text>
                  <Text style={styles.modernRecipientAccount}>Account: {recipient.accountNumber.slice(-8)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.modernEmptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={32} color="#D1D5DB" />
              </View>
              <Text style={styles.modernEmptyText}>No recipients found</Text>
              <Text style={styles.modernEmptySubtext}>Add recipients in Honduras to start sending remittances</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderAmountStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep('recipients')}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Send EUR to Honduras</Text>
          <Text style={styles.headerSubtitle}>To {selectedRecipient?.name}</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <ScrollView style={styles.modernScrollView} contentContainerStyle={styles.modernScrollContent}>
        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>You send</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>€</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              keyboardType="numeric"
              autoFocus={true}
            />
            <Text style={styles.currencyCode}>EUR</Text>
          </View>
        </View>

        {/* Exchange Rate Card */}
        {amount && parseFloat(amount) > 0 && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Remittance Details</Text>
            
            {isLoadingRate ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>Calculating exchange rate...</Text>
              </View>
            ) : exchangeRate ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>You send</Text>
                  <Text style={styles.detailValue}>€{exchangeRate.amount.toFixed(2)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Platform fee</Text>
                  <Text style={styles.detailValue}>€{exchangeRate.fees.platformFee.toFixed(2)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Exchange margin</Text>
                  <Text style={styles.detailValue}>€{exchangeRate.fees.exchangeMargin.toFixed(2)}</Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total EUR deducted</Text>
                  <Text style={[styles.detailValue, styles.totalValue]}>€{exchangeRate.totalEURDeducted.toFixed(2)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Exchange rate</Text>
                  <Text style={styles.detailValue}>1 EUR = {exchangeRate.customerRate.toFixed(4)} HNL</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Recipient gets</Text>
                  <Text style={[styles.detailValue, styles.recipientValue]}>L.{exchangeRate.targetAmount.toFixed(2)} HNL</Text>
                </View>

                <View style={styles.rateInfo}>
                  <Text style={styles.rateInfoText}>
                    Rate includes 1.5% exchange margin • Real-time rates from {exchangeRate.source}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        )}

        {/* Recipient Info */}
        {selectedRecipient && (
          <View style={styles.recipientCard}>
            <Text style={styles.recipientTitle}>Recipient in Honduras</Text>
            <View style={styles.recipientInfo}>
              <Text style={styles.recipientName}>{selectedRecipient.name}</Text>
              <Text style={styles.recipientBank}>{selectedRecipient.bankName}</Text>
              <Text style={styles.recipientDetails}>Account: {selectedRecipient.accountNumber}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionButtons}>
        <Button
          title={exchangeRate ? `Send €${exchangeRate.amount.toFixed(2)}` : 'Enter Amount'}
          onPress={() => setStep('confirm')}
          disabled={!amount || parseFloat(amount) <= 0 || isLoadingRate || !exchangeRate}
          style={styles.sendButton}
          textStyle={styles.sendButtonText}
        />
      </View>
    </View>
  );

  const renderConfirmStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep('amount')}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Confirm Remittance</Text>
          <Text style={styles.headerSubtitle}>Review before sending</Text>
        </View>
        <View style={styles.headerAction} />
      </View>

      <ScrollView style={styles.modernScrollView} contentContainerStyle={styles.modernScrollContent}>
        {exchangeRate && selectedRecipient && (
          <>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Remittance Summary</Text>
                <View style={styles.summaryAmounts}>
                  <Text style={styles.summaryEUR}>€{exchangeRate.amount.toFixed(2)}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#6B7280" />
                  <Text style={styles.summaryHNL}>L.{exchangeRate.targetAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Complete Details */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Complete Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount to send</Text>
                <Text style={styles.detailValue}>€{exchangeRate.amount.toFixed(2)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform fee</Text>
                <Text style={styles.detailValue}>€{exchangeRate.fees.platformFee.toFixed(2)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Exchange margin</Text>
                <Text style={styles.detailValue}>€{exchangeRate.fees.exchangeMargin.toFixed(2)}</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, styles.boldLabel]}>Total EUR deducted</Text>
                <Text style={[styles.detailValue, styles.totalValue]}>€{exchangeRate.totalEURDeducted.toFixed(2)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Exchange rate used</Text>
                <Text style={styles.detailValue}>1 EUR = {exchangeRate.customerRate.toFixed(4)} HNL</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, styles.boldLabel]}>Recipient receives</Text>
                <Text style={[styles.detailValue, styles.recipientValue]}>L.{exchangeRate.targetAmount.toFixed(2)} HNL</Text>
              </View>
            </View>

            {/* Final Recipient Card */}
            <View style={styles.recipientCard}>
              <Text style={styles.recipientTitle}>Sending to</Text>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName}>{selectedRecipient.name}</Text>
                <Text style={styles.recipientBank}>{selectedRecipient.bankName}</Text>
                <Text style={styles.recipientDetails}>Honduras 🇭🇳</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Final Action Button */}
      <View style={styles.actionButtons}>
        <Button
          title={`Confirm & Send €${exchangeRate?.amount.toFixed(2) || '0.00'}`}
          onPress={handleSendRemittance}
          loading={isProcessing}
          disabled={!exchangeRate || !selectedRecipient}
          style={styles.confirmButton}
          textStyle={styles.confirmButtonText}
        />
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
      default:
        return renderRecipientsStep();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {renderStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base Layout
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  stepContainer: {
    flex: 1,
  },
  modernScrollView: {
    flex: 1,
  },
  modernScrollContent: {
    paddingBottom: 32,
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
    gap: 16,
  },
  
  // Modern Sections
  modernSection: {
    marginTop: 8,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
    paddingHorizontal: 4,
    letterSpacing: -0.3,
  },

  // Modern Recipient Cards
  modernRecipientCard: {
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
  modernAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  modernRecipientInfo: {
    flex: 1,
  },
  modernRecipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  modernRecipientDetails: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  modernRecipientAccount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    fontFamily: 'monospace',
  },

  // Loading States
  modernLoadingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  modernLoadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  emptyIconContainer: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    marginBottom: 8,
  },
  modernEmptyText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '700',
    textAlign: 'center',
  },
  modernEmptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Amount Section
  amountSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563eb',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700',
    color: '#1a1d29',
    padding: 0,
  },
  currencyCode: {
    fontSize: 24,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
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
    color: '#64748b',
    fontWeight: '500',
  },
  boldLabel: {
    fontWeight: '700',
    color: '#1e293b',
  },
  detailValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '700',
  },
  recipientValue: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  rateInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  rateInfoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  summaryHeader: {
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 16,
  },
  summaryAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryEUR: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
  },
  summaryHNL: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
  },

  // Recipient Card
  recipientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  recipientTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  recipientInfo: {
    gap: 4,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  recipientBank: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  recipientDetails: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // Action Buttons
  actionButtons: {
    padding: 20,
    backgroundColor: '#f8fafb',
  },
  sendButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Loading Container
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});