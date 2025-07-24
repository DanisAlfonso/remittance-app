import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useWalletStore } from '../../lib/walletStore';
import { useAuthStore } from '../../lib/auth';
import { apiClient } from '../../lib/api';
import Button from '../../components/ui/Button';

interface RecipientData {
  id?: string; // User ID for @username transfers
  name?: string; // Display name
  type: string; // 'user' (via @username) or 'iban' (direct IBAN)
  currency: string;
  username?: string; // Username for @username transfers
  
  // Bank transfer fields (required for all transfers)
  holderName: string;
  iban: string;
  bankName?: string;
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
  
  // Function to fetch user IBAN for @username transfers
  const fetchUserIban = async (userId: string): Promise<{
    holderName: string;
    iban: string;
    country: string;
    currency: string;
  }> => {
    try {
      const response = await apiClient.get(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }) as {
        user: {
          displayName: string;
          firstName: string;
          lastName: string;
          primaryAccount: {
            iban: string;
            country: string;
            currency: string;
          };
        };
      };
      
      if (!response.user?.primaryAccount?.iban) {
        throw new Error('User does not have an active account available for transfers');
      }
      
      const user = response.user;
      const account = user.primaryAccount;
      
      return {
        holderName: user.displayName || `${user.firstName} ${user.lastName}`,
        iban: account.iban,
        country: account.country,
        currency: account.currency,
      };
    } catch (error) {
      console.error('Error fetching user IBAN:', error);
      throw new Error('Unable to get recipient account information');
    }
  };
  
  const currency = params.currency as string;
  
  // Handle both JSON recipientData (from add-recipient) and individual params (from user-search)
  const recipientData: Partial<RecipientData> = params.recipientData 
    ? JSON.parse(params.recipientData as string) as RecipientData
    : {
        // From user search - this will be @username transfer
        id: params.recipientId as string,
        name: params.recipientName as string,
        type: 'user', // @username transfer type
        currency: params.currency as string,
        username: params.recipientUsername as string || undefined,
        // IBAN will be fetched dynamically
        holderName: '', // Will be populated
        iban: '', // Will be populated
        country: '', // Will be populated
      };
  
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // All transfers are now free - no fees

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

  // All transfers are free - no fee calculation needed

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
    
    // All transfers are free - no fee calculation needed
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
    
    return numAmount * exchangeRate.rate;
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
    
    if (selectedAccount && balance && numAmount > balance.amount) {
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
      let finalRecipientData = { ...recipientData };
      
      // If this is a @username transfer, fetch the user's IBAN first
      if (recipientData.type === 'user' && recipientData.id) {
        console.log('🔍 Fetching IBAN for @username transfer...');
        const userIbanData = await fetchUserIban(recipientData.id);
        
        // Update recipient data with real IBAN information
        finalRecipientData = {
          ...recipientData,
          holderName: userIbanData.holderName,
          iban: userIbanData.iban,
          country: userIbanData.country,
          currency: userIbanData.currency,
        };
        
        console.log('✅ IBAN fetched for user:', {
          username: recipientData.username,
          holderName: userIbanData.holderName,
          iban: userIbanData.iban?.slice(-4), // Only log last 4 digits for security
          country: userIbanData.country,
        });
      }
      
      // All transfers now go through OBP-API as real bank transfers
      const transferData = {
        recipientAccount: {
          type: 'iban',
          iban: finalRecipientData.iban,
          accountNumber: finalRecipientData.iban,
          currency: finalRecipientData.currency,
          country: finalRecipientData.country,
          holderName: finalRecipientData.holderName,
          bankName: finalRecipientData.bankName || 'Banking Account',
        },
        recipientDetails: {
          firstName: finalRecipientData.holderName?.split(' ')[0] || 'Unknown',
          lastName: finalRecipientData.holderName?.split(' ').slice(1).join(' ') || 'User',
          email: 'noreply@example.com', // Required by API but not used for IBAN transfers
        },
        transferDetails: {
          amount: parseFloat(amount),
          currency: selectedAccount.currency,
          reference: recipientData.username 
            ? `Transfer to @${recipientData.username}` 
            : `Transfer to ${finalRecipientData.holderName}`,
        }
      };
      
      console.log('💸 Executing real bank transfer via OBP-API...');
      const response = await apiClient.obpPost('/obp/v5.1.0/transaction-requests', transferData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const recipientName = recipientData.username 
        ? `${finalRecipientData.holderName} (@${recipientData.username})`
        : finalRecipientData.holderName;
      
      console.log('Transfer response:', response);
      
      const transferResponse = response as { transfer?: { id: string }; message?: string };
      
      if (!transferResponse.transfer || !transferResponse.transfer.id) {
        throw new Error('Invalid response: transfer data missing');
      }
      
      const transfer = transferResponse.transfer;
      
      Alert.alert(
        'Transfer Initiated!',
        `Your transfer of €${amount} to ${recipientName} has been initiated successfully.`,
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
                  recipientName: recipientName,
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
              To {recipientData.type === 'internal' 
                  ? recipientData.name 
                  : recipientData.holderName}
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
                <Text style={[styles.detailValue, styles.freeLabel]}>
                  FREE
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total you pay</Text>
                <Text style={[styles.detailValue, styles.totalValue]}>
                  {formatCurrency(parseFloat(amount), selectedAccount?.currency || 'EUR')}
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
              <Text style={styles.recipientName}>
                {recipientData.type === 'internal' 
                  ? recipientData.name 
                  : recipientData.holderName}
              </Text>
              
              {recipientData.type === 'internal' ? (
                // Internal transfer (app user)
                <>
                  {recipientData.username && (
                    <Text style={styles.recipientIban}>
                      @{recipientData.username}
                    </Text>
                  )}
                  <Text style={styles.recipientBank}>App User Transfer</Text>
                </>
              ) : (
                // External bank transfer
                <>
                  <Text style={styles.recipientIban}>
                    {recipientData.iban?.replace(/(.{4})/g, '$1 ').trim()}
                  </Text>
                  <Text style={styles.recipientBank}>{recipientData.bankName}</Text>
                </>
              )}
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
  freeLabel: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 15,
  },
});