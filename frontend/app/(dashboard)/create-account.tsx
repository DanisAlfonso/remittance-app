import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useWalletStore } from '../../lib/walletStore';
import { useAuthStore } from '../../lib/auth';
import Button from '../../components/ui/Button';
import type { CreateWiseAccountRequest } from '../../types/wise';

export default function CreateAccountScreen() {
  const { user } = useAuthStore();
  const formData = {
    currency: 'EUR',
    country: 'DE',
    type: 'SAVINGS' as const,
  };
  
  const { createAccount, isLoading, error, clearError } = useWalletStore();

  // Auto-generate account name based on user and currency
  const generateAccountName = () => {
    if (!user) {
      return 'EUR Account';
    }
    const userName = `${user.firstName} ${user.lastName}`.trim();
    return `${userName}'s EUR Account`;
  };


  const validateForm = (): boolean => {
    // Auto-generated name is always valid
    // Currency and country are fixed to EUR/DE, so always valid
    return formData.currency === 'EUR' && formData.country === 'DE';
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) {
      return;
    }
    
    clearError();
    
    try {
      const request: CreateWiseAccountRequest = {
        name: generateAccountName(),
        currency: formData.currency,
        country: formData.country,
        type: formData.type,
      };

      await createAccount(request);
      
      Alert.alert(
        'EUR Account Created',
        'Your Euro account has been successfully created with a Spanish IBAN.',
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

  // No longer needed since we auto-generate the name
  // Currency, country, and type are fixed

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create EUR Account</Text>
          <Text style={styles.subtitle}>
            Set up a Euro account with Spanish IBAN for European transfers
          </Text>
        </View>

        <View style={styles.form}>
          {/* Account Preview Card */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.iconContainer}>
                <Text style={styles.accountIcon}>🏦</Text>
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{generateAccountName()}</Text>
                <Text style={styles.previewSubtitle}>European Banking Account</Text>
              </View>
            </View>
          </View>

          {/* Account Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Text style={styles.detailEmoji}>💶</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Currency</Text>
                <Text style={styles.detailValue}>Euro (EUR)</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Text style={styles.detailEmoji}>🇪🇸</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>IBAN Region</Text>
                <Text style={styles.detailValue}>Spain</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Text style={styles.detailEmoji}>💰</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Account Type</Text>
                <Text style={styles.detailValue}>Savings Account</Text>
              </View>
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>What you&apos;ll get</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <Text style={styles.featureText}>Spanish IBAN for European transfers</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <Text style={styles.featureText}>Real-time balance updates</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <Text style={styles.featureText}>Secure account management</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <Text style={styles.featureText}>Low transfer fees across Europe</Text>
              </View>
            </View>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Create Account"
            onPress={handleCreateAccount}
            loading={isLoading}
            style={styles.createButton}
            textStyle={styles.createButtonText}
          />
          
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
            textStyle={styles.cancelButtonText}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
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
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    flex: 1,
    gap: 24,
  },
  
  // Preview Card Styles
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  accountIcon: {
    fontSize: 24,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 24,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  
  // Details Container Styles
  detailsContainer: {
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
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailEmoji: {
    fontSize: 18,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  
  // Features Card Styles
  featuresCard: {
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
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkIcon: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '700',
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  
  // Error Styles
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Action Buttons Styles
  actionButtons: {
    gap: 12,
    paddingTop: 8,
  },
  createButton: {
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
  createButtonText: {
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