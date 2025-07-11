import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWalletStore } from '../../lib/walletStore';
import { transferService } from '../../lib/transfer';
import { wiseService } from '../../lib/wise';
import Button from '../../components/ui/Button';
import SimpleInput from '../../components/ui/SimpleInput';
import TransferProcessing from '../../components/ui/TransferProcessing';
import type { TransferQuote } from '../../types/transfer';

export default function SendMoneyScreen() {
  const { accounts, selectedAccount, balance } = useWalletStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'amount' | 'recipient' | 'quote' | 'confirm' | 'processing'>('amount');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [amount, setAmount] = useState('');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [targetCountry, setTargetCountry] = useState('DE');
  const [recipientIban, setRecipientIban] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');

  // Quote data
  const [quote, setQuote] = useState<TransferQuote | null>(null);

  const currencies = wiseService.getSupportedCurrencies();
  const countries = wiseService.getSupportedCountries();

  useEffect(() => {
    if (!selectedAccount) {
      Alert.alert('No Account Selected', 'Please select an account first', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [selectedAccount]);

  const validateAmount = (): boolean => {
    const numAmount = parseFloat(amount);
    const currentBalance = balance?.amount || 0;
    
    const validation = transferService.validateAmount(numAmount, currentBalance);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid amount');
      return false;
    }
    
    setError(null);
    return true;
  };

  const validateRecipient = (): boolean => {
    if (!recipientName.trim()) {
      setError('Recipient name is required');
      return false;
    }
    
    if (!recipientIban.trim()) {
      setError('IBAN is required');
      return false;
    }
    
    const ibanValidation = transferService.validateIban(recipientIban);
    if (!ibanValidation.isValid) {
      setError(ibanValidation.error || 'Invalid IBAN');
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleGetQuote = async () => {
    if (!validateAmount() || !selectedAccount) {return;}

    setIsLoading(true);
    setError(null);

    try {
      const quoteResponse = await transferService.getQuote(
        selectedAccount.id,
        targetCurrency,
        targetCountry,
        parseFloat(amount),
        selectedAccount.currency
      );

      setQuote(quoteResponse.quote);
      setStep('recipient');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to get quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowQuote = () => {
    if (!validateRecipient()) {return;}
    setStep('quote');
  };

  const handleConfirmTransfer = async () => {
    if (!selectedAccount) {return;}

    setIsLoading(true);
    setError(null);

    try {
      // Start the elegant processing animation
      setStep('processing');

      // Create transfer with actual amount
      const transferResponse = await transferService.createSimpleTransfer({
        recipientAccount: {
          accountNumber: recipientIban.trim(),
          currency: targetCurrency,
          country: targetCountry,
        },
        recipientDetails: {
          firstName: recipientName.trim().split(' ')[0] || 'Recipient',
          lastName: recipientName.trim().split(' ').slice(1).join(' ') || 'User',
          email: `${recipientName.trim().toLowerCase().replace(/\s+/g, '.').replace(/^\.+|\.+$/g, '')}@example.com`, // Temporary
        },
        transferDetails: {
          amount: parseFloat(amount),
          currency: selectedAccount.currency,
          reference: reference.trim() || undefined,
        },
      });

      // The processing animation will handle the success state
      console.log('Transfer created:', transferResponse.transfer);
    } catch (error: unknown) {
      console.error('Transfer creation error:', error);
      let errorMessage = 'Failed to create transfer';
      
      // Handle API errors properly
      if (error && typeof error === 'object' && 'message' in error) {
        const apiError = error as { message: string; error?: string; details?: { message: string }[] };
        
        // Check if it's a validation error from the backend
        if (apiError.error === 'Validation error' || apiError.message.includes('required')) {
          errorMessage = 'Please check all required fields are filled correctly';
          if (apiError.details && Array.isArray(apiError.details)) {
            // Show specific validation errors
            const validationErrors = apiError.details.map((detail) => detail.message).join(', ');
            errorMessage = `Validation error: ${validationErrors}`;
          }
        } else if (apiError.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance for this transfer';
        } else {
          errorMessage = apiError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setStep('quote'); // Go back to quote step on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferComplete = () => {
    // Refresh wallet data
    useWalletStore.getState().fetchWalletData();
    
    Alert.alert(
      'Transfer Complete!',
      `Your transfer of ${transferService.formatAmount(parseFloat(amount), selectedAccount?.currency || 'EUR')} has been completed successfully.`,
      [
        {
          text: 'View Transactions',
          onPress: () => router.push('/(dashboard)/transactions'),
        },
        {
          text: 'Send Another',
          onPress: () => {
            // Reset form
            setStep('amount');
            setAmount('');
            setRecipientName('');
            setRecipientIban('');
            setReference('');
            setDescription('');
            setQuote(null);
            setError(null);
          },
        },
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const renderAmountStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Send Money</Text>
      <Text style={styles.stepSubtitle}>How much would you like to send?</Text>

      {selectedAccount && (
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{selectedAccount.name}</Text>
          <Text style={styles.accountBalance}>
            Available: {wiseService.formatAmount(balance?.amount || 0, selectedAccount.currency)}
          </Text>
        </View>
      )}

      <SimpleInput
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="numeric"
        required
        error={error || undefined}
      />

      <View style={styles.currencySection}>
        <Text style={styles.sectionTitle}>To Currency</Text>
        <View style={styles.currencyGrid}>
          {currencies.slice(0, 6).map((currency) => (
            <Button
              key={currency.code}
              title={`${currency.symbol} ${currency.code}`}
              onPress={() => setTargetCurrency(currency.code)}
              style={targetCurrency === currency.code 
                ? [styles.currencyButton, styles.selectedButton]
                : styles.currencyButton}
              variant={targetCurrency === currency.code ? 'primary' : 'outline'}
            />
          ))}
        </View>
      </View>

      <View style={styles.currencySection}>
        <Text style={styles.sectionTitle}>To Country</Text>
        <View style={styles.countryGrid}>
          {countries.slice(0, 4).map((country) => (
            <Button
              key={country.code}
              title={`${country.code} - ${country.name}`}
              onPress={() => setTargetCountry(country.code)}
              style={targetCountry === country.code 
                ? [styles.countryButton, styles.selectedButton]
                : styles.countryButton}
              variant={targetCountry === country.code ? 'primary' : 'outline'}
            />
          ))}
        </View>
      </View>

      <Button
        title="Get Quote"
        onPress={handleGetQuote}
        loading={isLoading}
        style={styles.actionButton}
      />
    </View>
  );

  const renderRecipientStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Recipient Details</Text>
      <Text style={styles.stepSubtitle}>Who are you sending money to?</Text>

      <SimpleInput
        label="Recipient Name"
        value={recipientName}
        onChangeText={setRecipientName}
        placeholder="Enter recipient's full name"
        autoCapitalize="words"
        required
      />

      <SimpleInput
        label="IBAN"
        value={recipientIban}
        onChangeText={setRecipientIban}
        placeholder="DE89 3704 0044 0532 0130 00"
        autoCapitalize="characters"
        required
      />

      <SimpleInput
        label="Reference (Optional)"
        value={reference}
        onChangeText={setReference}
        placeholder="Payment reference"
        maxLength={100}
      />

      <SimpleInput
        label="Description (Optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What's this transfer for?"
        maxLength={500}
        multiline
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonRow}>
        <Button
          title="Back"
          onPress={() => setStep('amount')}
          variant="outline"
          style={styles.halfButton}
        />
        <Button
          title="Continue"
          onPress={handleShowQuote}
          style={styles.halfButton}
        />
      </View>
    </View>
  );

  const renderQuoteStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Transfer Summary</Text>
      <Text style={styles.stepSubtitle}>Review your transfer details</Text>

      {quote && (
        <View style={styles.quoteContainer}>
          <View style={styles.quoteRow}>
            <Text style={styles.quoteLabel}>You send</Text>
            <Text style={styles.quoteValue}>
              {transferService.formatAmount(quote.sourceAmount, quote.sourceCurrency)}
            </Text>
          </View>

          <View style={styles.quoteRow}>
            <Text style={styles.quoteLabel}>Fee</Text>
            <Text style={styles.quoteValue}>
              {transferService.formatAmount(quote.fee, quote.feeCurrency)}
            </Text>
          </View>

          <View style={styles.quoteDivider} />

          <View style={styles.quoteRow}>
            <Text style={styles.quoteLabelBold}>Total cost</Text>
            <Text style={styles.quoteValueBold}>
              {transferService.formatAmount(quote.totalCost, quote.sourceCurrency)}
            </Text>
          </View>

          <View style={styles.quoteRow}>
            <Text style={styles.quoteLabel}>Exchange rate</Text>
            <Text style={styles.quoteValue}>
              {transferService.formatExchangeRate(quote.exchangeRate, quote.sourceCurrency, quote.targetCurrency)}
            </Text>
          </View>

          <View style={styles.quoteRow}>
            <Text style={styles.quoteLabelBold}>Recipient gets</Text>
            <Text style={styles.quoteValueBold}>
              {transferService.formatAmount(quote.targetAmount, quote.targetCurrency)}
            </Text>
          </View>

          <View style={styles.quoteRow}>
            <Text style={styles.quoteLabel}>Delivery time</Text>
            <Text style={styles.quoteValue}>{quote.processingTime}</Text>
          </View>
        </View>
      )}

      <View style={styles.recipientSummary}>
        <Text style={styles.summaryTitle}>Sending to:</Text>
        <Text style={styles.summaryValue}>{recipientName}</Text>
        <Text style={styles.summaryValue}>{recipientIban}</Text>
        {reference && <Text style={styles.summaryValue}>Ref: {reference}</Text>}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonRow}>
        <Button
          title="Back"
          onPress={() => setStep('recipient')}
          variant="outline"
          style={styles.halfButton}
        />
        <Button
          title="Confirm Transfer"
          onPress={handleConfirmTransfer}
          loading={isLoading}
          style={styles.halfButton}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step === 'processing' ? (
        <TransferProcessing
          amount={transferService.formatAmount(parseFloat(amount), selectedAccount?.currency || 'EUR')}
          currency={selectedAccount?.currency || 'EUR'}
          recipientName={recipientName}
          onComplete={handleTransferComplete}
        />
      ) : (
        <>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'amount' && renderAmountStep()}
            {step === 'recipient' && renderRecipientStep()}
            {step === 'quote' && renderQuoteStep()}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 4) }]}>
            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="outline"
              style={styles.cancelButton}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 32,
  },
  accountInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 14,
    color: '#6c757d',
  },
  currencySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    minWidth: '30%',
    marginBottom: 8,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  countryGrid: {
    gap: 8,
  },
  countryButton: {
    marginBottom: 8,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  selectedButton: {
    backgroundColor: '#007AFF',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  actionButton: {
    marginTop: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  halfButton: {
    flex: 1,
  },
  quoteContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  quoteLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  quoteLabelBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  quoteValue: {
    fontSize: 14,
    color: '#333333',
  },
  quoteValueBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  quoteDivider: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginVertical: 8,
  },
  recipientSummary: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 6,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelButton: {
    width: '45%',
    height: 48,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
});