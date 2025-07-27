import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useWalletStore } from '../../lib/walletStore';
import { useAuthStore } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import type { CreateBankAccountRequest } from '../../types/banking';

type SupportedCurrency = 'EUR' | 'HNL';

interface CurrencyOption {
  code: SupportedCurrency;
  name: string;
  flag: string;
  country: string;
  countryCode: string;
  features: string[];
  icon: string;
  gradient: [string, string];
}

const CURRENCY_OPTIONS: CurrencyOption[] = [
  {
    code: 'EUR',
    name: 'Euro',
    flag: '€',
    country: 'Spain',
    countryCode: 'ES',
    features: [
      'Spanish IBAN for European transfers',
      'SEPA instant payments',
      'Low fees across Europe',
      'Real-time balance updates',
    ],
    icon: '€',
    gradient: ['#3B82F6', '#1E40AF'],
  },
  {
    code: 'HNL',
    name: 'Honduran Lempira',
    flag: 'L',
    country: 'Honduras',
    countryCode: 'HN',
    features: [
      'Honduran banking integration',
      'Local transfer support',
      'Competitive exchange rates',
      'Secure account management',
    ],
    icon: 'L',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
];

export default function CreateCurrencyAccountScreen() {
  const { user } = useAuthStore();
  const { createAccount, isLoading, error, clearError, accounts } = useWalletStore();
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency | null>(null);

  // Filter out currencies that already have accounts
  const existingCurrencies = accounts.map(account => account.currency);
  const availableCurrencies = CURRENCY_OPTIONS.filter(
    option => !existingCurrencies.includes(option.code)
  );

  const generateAccountName = (currency: SupportedCurrency) => {
    if (!user) {
      return `${currency} Account`;
    }
    const userName = `${user.firstName} ${user.lastName}`.trim();
    const currencyName = CURRENCY_OPTIONS.find(c => c.code === currency)?.name || currency;
    return `${userName}'s ${currencyName} Account`;
  };

  const handleCreateAccount = async () => {
    if (!selectedCurrency) {
      Alert.alert('Select Currency', 'Please select a currency for your new account.');
      return;
    }

    clearError();
    
    try {
      const currencyOption = CURRENCY_OPTIONS.find(c => c.code === selectedCurrency)!;
      
      const request: CreateBankAccountRequest = {
        accountLabel: generateAccountName(selectedCurrency),
        currency: selectedCurrency,
        country: currencyOption.countryCode,
        type: 'SAVINGS',
      };

      await createAccount(request);
      
      Alert.alert(
        'Account Created!',
        `Your ${currencyOption.name} account has been successfully created.`,
        [
          {
            text: 'View Account',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Account creation error:', error);
      // Error is handled by the store
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Add New Account</Text>
            <Text style={styles.subtitle}>
              Choose a currency for your new digital account
            </Text>
          </View>
        </View>

        {/* Currency Selection */}
        <View style={styles.currencySection}>
          <Text style={styles.sectionTitle}>Select Currency</Text>
          
          {availableCurrencies.length === 0 ? (
            <View style={styles.noOptionsContainer}>
              <View style={styles.noOptionsIcon}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              <Text style={styles.noOptionsTitle}>All Accounts Created</Text>
              <Text style={styles.noOptionsText}>
                You already have accounts for all supported currencies. You can manage your existing accounts from the home screen.
              </Text>
              <Button
                title="Go Back"
                onPress={() => router.back()}
                style={styles.goBackButton}
              />
            </View>
          ) : (
            <View style={styles.currencyGrid}>
              {availableCurrencies.map((currency) => (
                <Pressable
                  key={currency.code}
                  style={[
                    styles.currencyCard,
                    selectedCurrency === currency.code && styles.currencyCardSelected,
                    { borderColor: selectedCurrency === currency.code ? currency.gradient[0] : '#E5E7EB' }
                  ]}
                  onPress={() => setSelectedCurrency(currency.code)}
                >
                  {/* Selection Indicator */}
                  <View style={styles.selectionIndicator}>
                    {selectedCurrency === currency.code && (
                      <View style={[styles.selectedDot, { backgroundColor: currency.gradient[0] }]}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  {/* Currency Header */}
                  <View style={styles.currencyHeader}>
                    <View style={styles.currencyIconContainer}>
                      <Text style={styles.currencyIcon}>{currency.icon}</Text>
                    </View>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                      <Text style={styles.currencyName}>{currency.name}</Text>
                      <Text style={styles.currencyCountry}>{currency.country}</Text>
                    </View>
                  </View>

                  {/* Features List */}
                  <View style={styles.featuresList}>
                    {currency.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <View style={styles.featureCheck}>
                          <Ionicons name="checkmark" size={12} color="#10B981" />
                        </View>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Gradient Overlay for Selected */}
                  {selectedCurrency === currency.code && (
                    <View 
                      style={[
                        styles.selectedOverlay,
                        { backgroundColor: `${currency.gradient[0]}15` }
                      ]} 
                    />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Account Preview */}
        {selectedCurrency && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Account Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewIcon}>
                  <Text style={styles.previewEmoji}>
                    {CURRENCY_OPTIONS.find(c => c.code === selectedCurrency)?.icon}
                  </Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle}>
                    {generateAccountName(selectedCurrency)}
                  </Text>
                  <Text style={styles.previewSubtitle}>
                    {CURRENCY_OPTIONS.find(c => c.code === selectedCurrency)?.name} • Savings Account
                  </Text>
                </View>
              </View>
              
              <View style={styles.previewDetails}>
                <View style={styles.previewDetailItem}>
                  <Text style={styles.previewDetailLabel}>Initial Balance</Text>
                  <Text style={styles.previewDetailValue}>0.00 {selectedCurrency}</Text>
                </View>
                <View style={styles.previewDetailItem}>
                  <Text style={styles.previewDetailLabel}>Account Type</Text>
                  <Text style={styles.previewDetailValue}>Digital Savings Account</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {availableCurrencies.length > 0 && (
        <View style={styles.actionButtons}>
          <Button
            title={selectedCurrency ? `Create ${selectedCurrency} Account` : 'Select Currency First'}
            onPress={handleCreateAccount}
            loading={isLoading}
            disabled={!selectedCurrency}
            style={StyleSheet.flatten([
              styles.createButton,
              !selectedCurrency && styles.createButtonDisabled
            ])}
            textStyle={styles.createButtonText}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Space for action buttons
  },

  // Header Styles
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },

  // Currency Section
  currencySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  currencyGrid: {
    gap: 16,
  },
  currencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  currencyCardSelected: {
    shadowColor: '#3B82F6',
    shadowOpacity: 0.15,
    elevation: 12,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
  },
  selectedDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Currency Header
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  currencyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencyIcon: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3B82F6',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  currencyCountry: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Features List
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },

  // No Options State
  noOptionsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 20,
  },
  noOptionsIcon: {
    padding: 20,
    backgroundColor: '#DCFCE7',
    borderRadius: 24,
  },
  noOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  noOptionsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  goBackButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
  },

  // Preview Section
  previewSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  previewIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {
    fontSize: 24,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  previewDetails: {
    gap: 16,
  },
  previewDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  previewDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  previewDetailValue: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },

  // Error Styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Action Buttons
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  createButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});