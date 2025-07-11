import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useWalletStore } from '../../lib/walletStore';
import { wiseService } from '../../lib/wise';
import Button from '../../components/ui/Button';
import SimpleInput from '../../components/ui/SimpleInput';
import type { CreateWiseAccountRequest } from '../../types/wise';

export default function CreateAccountScreen() {
  const [formData, setFormData] = useState({
    name: '',
    currency: 'USD',
    country: 'US',
    type: 'SAVINGS' as 'SAVINGS' | 'CHECKING',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { createAccount, isLoading, error, clearError } = useWalletStore();

  const currencies = wiseService.getSupportedCurrencies();
  const countries = wiseService.getSupportedCountries();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Account name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Account name must be less than 50 characters';
    }
    
    if (!wiseService.isValidCurrency(formData.currency)) {
      newErrors.currency = 'Please select a valid currency';
    }
    
    if (!wiseService.isValidCountry(formData.country)) {
      newErrors.country = 'Please select a valid country';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) {
      return;
    }
    
    clearError();
    
    try {
      const request: CreateWiseAccountRequest = {
        name: formData.name.trim(),
        currency: formData.currency,
        country: formData.country,
        type: formData.type,
      };

      await createAccount(request);
      
      Alert.alert(
        'Account Created',
        'Your digital account has been successfully created with a virtual IBAN.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Account creation error:', error);
      // Error is handled by the store
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Digital Account</Text>
          <Text style={styles.subtitle}>
            Set up a new digital account with virtual IBAN for international transfers
          </Text>
        </View>

        <View style={styles.form}>
          <SimpleInput
            label="Account Name"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="Enter account name (e.g., My USD Account)"
            autoCapitalize="words"
            error={errors.name}
            required
          />

          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>Currency *</Text>
            <View style={styles.currencyGrid}>
              {currencies.slice(0, 6).map((currency) => (
                <Button
                  key={currency.code}
                  title={`${currency.symbol} ${currency.code}`}
                  onPress={() => updateFormData('currency', currency.code)}
                  style={formData.currency === currency.code 
                    ? [styles.currencyButton, styles.selectedButton]
                    : styles.currencyButton}
                  variant={formData.currency === currency.code ? 'primary' : 'outline'}
                />
              ))}
            </View>
            {errors.currency && (
              <Text style={styles.errorText}>{errors.currency}</Text>
            )}
          </View>

          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>Country *</Text>
            <View style={styles.countryGrid}>
              {countries.slice(0, 6).map((country) => (
                <Button
                  key={country.code}
                  title={`${country.code} - ${country.name}`}
                  onPress={() => updateFormData('country', country.code)}
                  style={formData.country === country.code 
                    ? [styles.countryButton, styles.selectedButton]
                    : styles.countryButton}
                  variant={formData.country === country.code ? 'primary' : 'outline'}
                />
              ))}
            </View>
            {errors.country && (
              <Text style={styles.errorText}>{errors.country}</Text>
            )}
          </View>

          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>Account Type *</Text>
            <View style={styles.typeGrid}>
              <Button
                title="Savings Account"
                onPress={() => updateFormData('type', 'SAVINGS')}
                style={formData.type === 'SAVINGS' 
                  ? [styles.typeButton, styles.selectedButton]
                  : styles.typeButton}
                variant={formData.type === 'SAVINGS' ? 'primary' : 'outline'}
              />
              <Button
                title="Checking Account"
                onPress={() => updateFormData('type', 'CHECKING')}
                style={formData.type === 'CHECKING' 
                  ? [styles.typeButton, styles.selectedButton]
                  : styles.typeButton}
                variant={formData.type === 'CHECKING' ? 'primary' : 'outline'}
              />
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>What you'll get:</Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Virtual IBAN for international transfers</Text>
              <Text style={styles.featureItem}>• Multi-currency support</Text>
              <Text style={styles.featureItem}>• Real-time balance updates</Text>
              <Text style={styles.featureItem}>• Secure account management</Text>
            </View>
          </View>

          <Button
            title="Create Account"
            onPress={handleCreateAccount}
            loading={isLoading}
            style={styles.createButton}
          />

          {error && (
            <Text style={styles.globalErrorText}>{error}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 32,
  },
  pickerSection: {
    marginBottom: 24,
  },
  pickerLabel: {
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
  },
  countryGrid: {
    gap: 8,
  },
  countryButton: {
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
  },
  selectedButton: {
    backgroundColor: '#007AFF',
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  createButton: {
    marginBottom: 16,
  },
  globalErrorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
  },
  cancelButton: {
    width: '50%',
  },
});