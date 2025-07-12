import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useWalletStore } from '../../lib/walletStore';
import { useAuthStore } from '../../lib/auth';
import { apiClient } from '../../lib/api';
import Button from '../../components/ui/Button';

interface RecipientData {
  type: string;
  holderName: string;
  iban: string;
  bankName: string;
  currency: string;
  country: string;
}

interface ExchangeRate {
  source: string;
  target: string;
  rate: number;
  timestamp: string;
}

export default function TransferAmountScreen() {
  const params = useLocalSearchParams();
  const { selectedAccount, balance } = useWalletStore();
  const { token } = useAuthStore();
  
  const currency = params.currency as string;
  const recipientData = JSON.parse(params.recipientData as string) as RecipientData;
  
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fee, setFee] = useState(0);

  useEffect(() => {
    if (selectedAccount && currency !== selectedAccount.currency) {
      loadExchangeRate();
    }
  }, [selectedAccount, currency]);

  const loadExchangeRate = async () => {
    if (!selectedAccount || !token) {
      return;
    }
    
    setIsLoadingRate(true);
    try {
      const response = await apiClient.get(
        `/transfer/rates/${selectedAccount.currency}/${currency}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setExchangeRate((response as { data: { rate: ExchangeRate } }).data.rate);
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      Alert.alert('Error', 'Failed to load exchange rate');
    } finally {
      setIsLoadingRate(false);
    }
  };

  const calculateFee = (transferAmount: number): number => {
    if (!selectedAccount) {
      return 0;
    }
    
    // Same currency transfer
    if (currency === selectedAccount.currency) {
      return 0.5; // €0.50 fixed fee
    }
    
    // Currency conversion - 0.5% or minimum €2
    return Math.max(2.0, transferAmount * 0.005);
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
    
    // Calculate fee when amount changes
    const numAmount = parseFloat(cleanValue);
    if (!isNaN(numAmount) && numAmount > 0) {
      setFee(calculateFee(numAmount));
    } else {
      setFee(0);
    }
  };

  const getTargetAmount = (): number => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return 0;
    }
    
    // For same currency transfers, recipient gets the full amount (no conversion)
    if (currency === selectedAccount?.currency) {
      return numAmount;
    }
    
    // For different currency transfers, we need an exchange rate
    if (!exchangeRate) {
      return 0;
    }
    
    return (numAmount - fee) * exchangeRate.rate;
  };

  const validateAmount = (): boolean => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return false;
    }
    
    if (numAmount < 1) {
      Alert.alert('Minimum Amount', 'Minimum transfer amount is €1');
      return false;
    }
    
    if (numAmount > 10000) {
      Alert.alert('Maximum Amount', 'Maximum transfer amount is €10,000');
      return false;
    }
    
    if (selectedAccount && balance && numAmount + fee > balance.amount) {
      Alert.alert('Insufficient Funds', 'You don\'t have enough balance for this transfer');
      return false;
    }
    
    return true;
  };

  const handleSendMoney = async () => {
    if (!validateAmount() || !selectedAccount || !token) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const transferData = {
        recipientAccount: {
          type: recipientData.type,
          iban: recipientData.iban,
          accountNumber: recipientData.iban,
          currency: recipientData.currency,
          country: recipientData.country,
          holderName: recipientData.holderName,
          bankName: recipientData.bankName,
        },
        transferDetails: {
          amount: parseFloat(amount),
          reference: `Transfer to ${recipientData.holderName}`,
          description: `International transfer to ${recipientData.bankName}`,
        }
      };
      
      // Use the wise transfers endpoint
      const response = await apiClient.post('/wise/transfers', transferData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Transfer response:', response);
      
      const transferResponse = response as { transfer?: { id: string }; message?: string };
      
      if (!transferResponse.transfer || !transferResponse.transfer.id) {
        throw new Error('Invalid response: transfer data missing');
      }
      
      const transfer = transferResponse.transfer;
      
      Alert.alert(
        'Transfer Initiated!',
        `Your transfer of €${amount} to ${recipientData.holderName} has been initiated successfully.`,
        [
          {
            text: 'View Details',
            onPress: () => {
              router.replace({
                pathname: '/transfer-success',
                params: {
                  transferId: transfer.id,
                  amount,
                  currency,
                  recipientName: recipientData.holderName,
                  targetAmount: getTargetAmount().toFixed(2),
                  targetCurrency: currency
                }
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Transfer error:', error);
      
      let errorMessage = 'There was an error processing your transfer. Please try again.';
      
      // Try to extract more specific error message
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string; details?: Array<{ field: string; message: string }> } } }).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        } else if (response?.data?.details) {
          const details = response.data.details;
          if (Array.isArray(details) && details.length > 0) {
            errorMessage = details.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join('\n');
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Transfer Failed', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number, currencyCode: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Send {currency}</Text>
            <Text style={styles.subtitle}>
              To {recipientData.holderName}
            </Text>
          </View>

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
              <Text style={styles.currencyCode}>{selectedAccount?.currency || 'EUR'}</Text>
            </View>
          </View>

          {/* Transfer Details */}
          {amount && parseFloat(amount) > 0 && (
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Transfer Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transfer amount</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(parseFloat(amount), selectedAccount?.currency || 'EUR')}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fee</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(fee, selectedAccount?.currency || 'EUR')}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total you pay</Text>
                <Text style={[styles.detailValue, styles.totalValue]}>
                  {formatCurrency(parseFloat(amount) + fee, selectedAccount?.currency || 'EUR')}
                </Text>
              </View>
              
              {exchangeRate && currency !== selectedAccount?.currency && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Exchange rate</Text>
                    <Text style={styles.detailValue}>
                      1 {selectedAccount?.currency} = {exchangeRate.rate.toFixed(4)} {currency}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Recipient gets</Text>
                    <Text style={[styles.detailValue, styles.recipientValue]}>
                      {formatCurrency(getTargetAmount(), currency)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Recipient Info */}
          <View style={styles.recipientCard}>
            <Text style={styles.recipientTitle}>Recipient</Text>
            <View style={styles.recipientInfo}>
              <Text style={styles.recipientName}>{recipientData.holderName}</Text>
              <Text style={styles.recipientIban}>
                {recipientData.iban.replace(/(.{4})/g, '$1 ').trim()}
              </Text>
              <Text style={styles.recipientBank}>{recipientData.bankName}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionButtons}>
          <Button
            title={`Send ${amount ? formatCurrency(parseFloat(amount), selectedAccount?.currency || 'EUR') : 'Money'}`}
            onPress={handleSendMoney}
            loading={isProcessing}
            disabled={!amount || parseFloat(amount) <= 0 || isLoadingRate}
            style={styles.sendButton}
            textStyle={styles.sendButtonText}
          />
          
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
            textStyle={styles.cancelButtonText}
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1d29',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  
  // Amount Section
  amountSection: {
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
  
  // Recipient Card
  recipientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  recipientIban: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  recipientBank: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  
  // Action Buttons
  actionButtons: {
    padding: 20,
    gap: 12,
    backgroundColor: '#f8fafb',
  },
  sendButton: {
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
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});