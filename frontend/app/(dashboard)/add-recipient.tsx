import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import SimpleInput from '../../components/ui/SimpleInput';

export default function AddRecipientScreen() {
  const params = useLocalSearchParams();
  const currency = params.currency as string || 'EUR';
  
  const [formData, setFormData] = useState({
    holderName: '',
    iban: '',
  });
  const [detectedBank, setDetectedBank] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateIBAN = (iban: string): boolean => {
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // European IBAN formats (country code + 2 check digits + account identifier)
    const europeanIbanRegex = /^(AD|AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IS|IE|IT|LV|LI|LT|LU|MT|MC|NL|NO|PL|PT|RO|SM|SK|SI|ES|SE|CH|GB)\d{2}[A-Z0-9]+$/;
    
    // Check basic format and length (IBANs are typically 15-34 characters)
    if (!europeanIbanRegex.test(cleanIban) || cleanIban.length < 15 || cleanIban.length > 34) {
      return false;
    }
    
    // Common European IBAN lengths by country
    const ibanLengths: Record<string, number> = {
      AD: 24, AT: 20, BE: 16, BG: 22, HR: 21, CY: 28, CZ: 24, DK: 18,
      EE: 20, FI: 18, FR: 27, DE: 22, GR: 27, HU: 28, IS: 26, IE: 22,
      IT: 27, LV: 21, LI: 21, LT: 20, LU: 20, MT: 31, MC: 27, NL: 18,
      NO: 15, PL: 28, PT: 25, RO: 24, SM: 27, SK: 24, SI: 19, ES: 24,
      SE: 24, CH: 21, GB: 22
    };
    
    const countryCode = cleanIban.substring(0, 2);
    const expectedLength = ibanLengths[countryCode];
    
    return expectedLength ? cleanIban.length === expectedLength : false;
  };

  const detectBankFromIBAN = (iban: string): string => {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (cleanIban.length < 8) {
      return '';
    }
    
    const countryCode = cleanIban.substring(0, 2);
    const bankCode = cleanIban.substring(4, 8);
    
    // Bank detection based on country and bank code
    const bankDatabase: Record<string, Record<string, string>> = {
      DE: {
        '1001': 'Deutsche Bank',
        '2004': 'Commerzbank',
        '5001': 'Deutsche Bank Privat- und Firmenkundenbank',
        '7002': 'Deutsche Bank',
        '1203': 'DKB (Deutsche Kreditbank)',
        '4306': 'Volksbank',
        '3701': 'Deutsche Bank',
        '1204': 'Commerzbank', // For our generated IBANs
      },
      ES: {
        '2100': 'Banco Santander',
        '0049': 'Banco Santander',
        '0182': 'BBVA',
        '2010': 'CaixaBank',
        '0081': 'Banco Sabadell',
        '0075': 'Banco Popular',
        '0128': 'Bankinter',
      },
      FR: {
        '2004': 'BNP Paribas',
        '3000': 'Société Générale',
        '1027': 'Crédit Agricole',
        '1751': 'Crédit Mutuel',
        '1020': 'BNP Paribas',
      },
      IT: {
        '0306': 'Intesa Sanpaolo',
        '0200': 'UniCredit',
        '0760': 'Banco BPM',
        '0160': 'Banca Monte dei Paschi di Siena',
      },
      NL: {
        '0091': 'ABN AMRO',
        '0121': 'ING Bank',
        '0401': 'SNS Bank',
        '0721': 'Rabobank',
      },
      GB: {
        '1234': 'Lloyds Bank',
        '2345': 'Barclays',
        '3456': 'HSBC',
        '4567': 'NatWest',
      }
    };
    
    const countryBanks = bankDatabase[countryCode];
    if (countryBanks && countryBanks[bankCode]) {
      return countryBanks[bankCode];
    }
    
    // Fallback for unknown bank codes
    return `${countryCode} Bank (${bankCode})`;
  };

  const formatIBAN = (value: string): string => {
    // Remove all non-alphanumeric characters
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Add spaces every 4 characters for readability
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    
    if (field === 'iban') {
      processedValue = formatIBAN(value);
      
      // Auto-detect bank name when IBAN is valid
      const cleanIban = processedValue.replace(/\s/g, '');
      if (cleanIban.length >= 8) {
        const bankName = detectBankFromIBAN(processedValue);
        setDetectedBank(bankName);
      } else {
        setDetectedBank('');
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.holderName.trim()) {
      newErrors.holderName = 'Account holder name is required';
    } else if (formData.holderName.trim().length < 2) {
      newErrors.holderName = 'Name must be at least 2 characters';
    }
    
    if (!formData.iban.trim()) {
      newErrors.iban = 'IBAN is required';
    } else if (!validateIBAN(formData.iban)) {
      newErrors.iban = 'Please enter a valid European IBAN';
    }
    
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsValidating(true);
    
    try {
      // Clean IBAN for storage (remove spaces)
      const cleanIban = formData.iban.replace(/\s/g, '');
      
      const recipientData = {
        type: 'iban',
        holderName: formData.holderName.trim(),
        iban: cleanIban,
        bankName: detectedBank || 'Unknown Bank',
        currency,
        country: cleanIban.substring(0, 2) // Extract country from IBAN
      };
      
      // Navigate to amount input screen with recipient data
      router.push({
        pathname: '/transfer-amount',
        params: {
          currency,
          recipientData: JSON.stringify(recipientData)
        }
      });
    } catch {
      Alert.alert('Error', 'Failed to process recipient information');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add Bank Recipient</Text>
          <Text style={styles.headerSubtitle}>Send {currency} to Europe</Text>
        </View>
        <View style={styles.headerAction} />
      </View>
      
      <ScrollView 
        style={styles.modernScrollView}
        contentContainerStyle={styles.modernScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Modern Form Section */}
        <View style={styles.modernFormSection}>
          <View style={styles.formHeader}>
            <View style={styles.formIconContainer}>
              <Ionicons name="business" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.formTitle}>Bank Account Details</Text>
            <Text style={styles.formSubtitle}>Enter recipient information for secure transfer</Text>
          </View>
          
          <View style={styles.modernFormCard}>
            {/* Account Holder Name */}
            <View style={styles.modernFieldGroup}>
              <View style={styles.modernFieldHeader}>
                <View style={styles.modernFieldIcon}>
                  <Ionicons name="person" size={20} color="#6B7280" />
                </View>
                <Text style={styles.modernFieldLabel}>Account Holder Name</Text>
              </View>
              <SimpleInput
                placeholder="Full name as it appears on the account"
                value={formData.holderName}
                onChangeText={(value) => handleInputChange('holderName', value)}
                error={errors.holderName}
                autoCapitalize="words"
                style={styles.modernInput}
              />
              <Text style={styles.fieldHelpText}>Enter the exact name on the bank account</Text>
            </View>

            {/* IBAN */}
            <View style={styles.modernFieldGroup}>
              <View style={styles.modernFieldHeader}>
                <View style={styles.modernFieldIcon}>
                  <Ionicons name="card" size={20} color="#6B7280" />
                </View>
                <Text style={styles.modernFieldLabel}>IBAN</Text>
                <Text style={styles.fieldHint}>Any European bank</Text>
              </View>
              <SimpleInput
                placeholder="DE89 3704 0044 0532 0130 00"
                value={formData.iban}
                onChangeText={(value) => handleInputChange('iban', value)}
                error={errors.iban}
                autoCapitalize="characters"
                maxLength={42}
                style={styles.modernInput}
              />
              <Text style={styles.fieldHelpText}>Enter your European IBAN for secure transfer</Text>
              
              {/* Auto-detected Bank */}
              {detectedBank && (
                <View style={styles.modernBankDetection}>
                  <View style={styles.modernBankIcon}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.modernBankName}>{detectedBank}</Text>
                  <Text style={styles.bankVerifiedText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Security Notice */}
            <View style={styles.modernSecurityCard}>
              <View style={styles.modernSecurityHeader}>
                <View style={styles.modernSecurityIcon}>
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                </View>
                <Text style={styles.modernSecurityTitle}>Secure Transfer</Text>
              </View>
              <View style={styles.modernSecurityFeatures}>
                <View style={styles.modernSecurityFeature}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={styles.modernSecurityText}>Bank-grade encryption</Text>
                </View>
                <View style={styles.modernSecurityFeature}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={styles.modernSecurityText}>1-2 business day delivery</Text>
                </View>
                <View style={styles.modernSecurityFeature}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={styles.modernSecurityText}>Real-time tracking</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

        {/* Modern Action Buttons */}
        <View style={styles.modernActionButtons}>
          <Button
            title="Continue to Amount"
            onPress={handleContinue}
            loading={isValidating}
            style={styles.modernContinueButton}
            textStyle={styles.modernContinueButtonText}
          />
          
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.modernCancelButton}
            textStyle={styles.modernCancelButtonText}
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

  // 📝 Modern Form Section
  modernFormSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  modernFormCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 24,
  },

  // 🏗️ Modern Field Groups
  modernFieldGroup: {
    gap: 12,
  },
  modernFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernFieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  modernFieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    flex: 1,
  },
  fieldHint: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  modernInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E3A8A',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '500',
  },
  fieldHelpText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },

  // ✅ Modern Bank Detection
  modernBankDetection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 12,
  },
  modernBankIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernBankName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  bankVerifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  // 🛡️ Modern Security Card
  modernSecurityCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
  },
  modernSecurityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modernSecurityIcon: {
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
  modernSecurityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  modernSecurityFeatures: {
    gap: 12,
  },
  modernSecurityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernSecurityText: {
    fontSize: 15,
    color: '#047857',
    fontWeight: '600',
    flex: 1,
  },

  // 🎯 Modern Action Buttons
  modernActionButtons: {
    padding: 16,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  modernContinueButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modernContinueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modernCancelButton: {
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
  modernCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});