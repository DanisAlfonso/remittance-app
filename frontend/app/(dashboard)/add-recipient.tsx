import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroEmoji}>🏦</Text>
            </View>
            <Text style={styles.heroTitle}>Add Bank Recipient</Text>
            <Text style={styles.heroSubtitle}>
              Send {currency} to any European bank account
            </Text>
          </View>

          {/* Main Form Card */}
          <View style={styles.mainCard}>
            {/* Account Holder Name */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldIcon}>
                  <Text style={styles.fieldEmoji}>👤</Text>
                </View>
                <Text style={styles.fieldLabel}>Account Holder</Text>
              </View>
              <SimpleInput
                placeholder="Full name as it appears on the account"
                value={formData.holderName}
                onChangeText={(value) => handleInputChange('holderName', value)}
                error={errors.holderName}
                autoCapitalize="words"
              />
            </View>

            {/* IBAN */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldIcon}>
                  <Text style={styles.fieldEmoji}>🔢</Text>
                </View>
                <Text style={styles.fieldLabel}>IBAN</Text>
                <Text style={styles.fieldHint}>Any European bank</Text>
              </View>
              <SimpleInput
                placeholder="DE89 3704 0044 0532 0130 00"
                value={formData.iban}
                onChangeText={(value) => handleInputChange('iban', value)}
                error={errors.iban}
                autoCapitalize="characters"
                maxLength={42}
              />
              
              {/* Auto-detected Bank */}
              {detectedBank && (
                <View style={styles.bankDetection}>
                  <View style={styles.bankIcon}>
                    <Text style={styles.bankEmoji}>✓</Text>
                  </View>
                  <Text style={styles.bankName}>{detectedBank}</Text>
                </View>
              )}
            </View>

            {/* Security Notice */}
            <View style={styles.securityCard}>
              <View style={styles.securityHeader}>
                <View style={styles.securityIcon}>
                  <Text style={styles.securityEmoji}>🔒</Text>
                </View>
                <Text style={styles.securityTitle}>Secure Transfer</Text>
              </View>
              <View style={styles.securityFeatures}>
                <View style={styles.securityFeature}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.securityText}>Bank-grade encryption</Text>
                </View>
                <View style={styles.securityFeature}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.securityText}>1-2 business day delivery</Text>
                </View>
                <View style={styles.securityFeature}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.securityText}>Real-time tracking</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Continue to Amount"
            onPress={handleContinue}
            loading={isValidating}
            style={styles.continueButton}
            textStyle={styles.continueButtonText}
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
    backgroundColor: '#fafbfc',
  },
  container: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  heroEmoji: {
    fontSize: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Main Card
  mainCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  
  // Field Groups
  fieldGroup: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fieldEmoji: {
    fontSize: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  fieldHint: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  
  // Bank Detection
  bankDetection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  bankIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bankEmoji: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  bankName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#15803d',
    flex: 1,
  },
  
  // Security Card
  securityCard: {
    backgroundColor: '#fefcf3',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 8,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  securityEmoji: {
    fontSize: 14,
    color: '#ffffff',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b45309',
  },
  securityFeatures: {
    gap: 10,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '700',
    marginRight: 10,
    width: 16,
  },
  securityText: {
    fontSize: 14,
    color: '#b45309',
    fontWeight: '500',
    flex: 1,
  },
  
  // Action Buttons
  actionButtons: {
    padding: 20,
    gap: 16,
    backgroundColor: '#fafbfc',
  },
  continueButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});