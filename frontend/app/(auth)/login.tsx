import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../lib/auth';
import { validateEmail, sanitizeInput } from '../../utils/validation';
import { 
  checkBiometricCapabilities, 
  authenticateWithBiometrics, 
  isBiometricEnabled, 
  getBiometricTypeName, 
  getBiometricIconName,
  storeBiometricCredentials,
  getBiometricCredentials
} from '../../lib/biometric';
import { TextInput } from 'react-native';
import Button from '../../components/ui/Button';
import type { ValidationError, ApiError } from '../../types';
import type { BiometricCapabilities } from '../../lib/biometric';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  
  const updateEmail = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };
  
  const updatePassword = (value: string) => {
    setPassword(value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };
  
  const { login, isLoading, error, clearError } = useAuthStore();

  // Check biometric capabilities on component mount AND when component becomes visible
  useEffect(() => {
    const initBiometrics = async () => {
      const capabilities = await checkBiometricCapabilities();
      setBiometricCapabilities(capabilities);
      
      if (capabilities.canUseBiometrics) {
        const enabled = await isBiometricEnabled();
        setShowBiometricOption(enabled);
      } else {
        setShowBiometricOption(false);
      }
    };
    
    initBiometrics();
  }, []);

  // Check biometric status when screen comes into focus (user returns from profile)
  useFocusEffect(
    React.useCallback(() => {
      const recheckBiometrics = async () => {
        if (biometricCapabilities?.canUseBiometrics) {
          const enabled = await isBiometricEnabled();
          setShowBiometricOption(enabled);
        }
      };
      
      recheckBiometrics();
    }, [biometricCapabilities])
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.errors[0].message;
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }
    
    clearError();
    
    try {
      const credentials = {
        email: sanitizeInput(email.trim()),
        password: password,
      };
      
      await login(credentials);
      
      // Store credentials for biometric authentication if enabled
      await handleBiometricCredentialStorage(credentials.email, credentials.password);
      
      // Navigation is handled by the auth state change
      router.replace('/(dashboard)');
    } catch (error) {
      const apiError = error as ApiError;
      
      // Handle validation errors from server
      if (apiError.details && Array.isArray(apiError.details)) {
        const serverErrors: Record<string, string> = {};
        apiError.details.forEach((detail: ValidationError) => {
          serverErrors[detail.field] = detail.message;
        });
        setErrors(serverErrors);
      } else {
        Alert.alert('Login Failed', apiError.message || 'An error occurred');
      }
    }
  };

  const handleBiometricCredentialStorage = async (email: string, password: string) => {
    try {
      if (biometricCapabilities?.canUseBiometrics) {
        const enabled = await isBiometricEnabled();
        if (enabled) {
          await storeBiometricCredentials(email, password);
        }
      }
    } catch (error) {
      console.error('Error storing biometric credentials:', error);
      // Don't show error to user, just log it
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricCapabilities?.canUseBiometrics) {
      Alert.alert('Biometric Not Available', 'Biometric authentication is not available on this device.');
      return;
    }

    clearError();

    try {
      // First perform biometric authentication
      const authResult = await authenticateWithBiometrics(
        `Use ${getBiometricTypeName(biometricCapabilities.supportedTypes)} to sign in to RemitPay`
      );

      if (authResult.success) {
        // Get stored credentials
        const credentials = await getBiometricCredentials();
        
        if (credentials) {
          // Use stored credentials to login
          await login({
            email: credentials.email,
            password: credentials.password,
          });
          
          // Navigation is handled by the auth state change
          router.replace('/(dashboard)');
        } else {
          Alert.alert(
            'Credentials Not Found', 
            'No stored credentials found. Please sign in with your email and password first.'
          );
        }
      } else if (!authResult.cancelled) {
        Alert.alert(
          'Authentication Failed', 
          authResult.error || 'Biometric authentication failed. Please try again.'
        );
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'An error occurred during biometric authentication.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#EEF2FF', '#F8FAFC', '#FFFFFF']}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Modern Header with Branding */}
          <View style={styles.modernHeader}>
            <View style={styles.brandingContainer}>
              <View style={styles.logoContainer}>
                <Ionicons name="paper-plane" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.brandName}>RemitPay</Text>
              <Text style={styles.brandTagline}>Send money. Simply.</Text>
            </View>
            
            <View style={styles.welcomeContainer}>
              <Text style={styles.modernTitle}>Welcome Back</Text>
              <Text style={styles.modernSubtitle}>Sign in to continue your transfers</Text>
            </View>
          </View>

          {/* Modern Form Card */}
          <View style={styles.modernFormCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconContainer}>
                <Ionicons name="log-in" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.formTitle}>Sign In</Text>
            </View>
            
            <View style={styles.modernForm}>
              <View style={styles.modernInputGroup}>
                <Text style={styles.modernInputLabel}>
                  Email Address <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.modernInputContainer, errors.email && styles.modernInputContainerError]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="mail" size={20} color={errors.email ? "#EF4444" : "#6B7280"} />
                  </View>
                  <TextInput
                    style={styles.modernTextInput}
                    value={email}
                    onChangeText={updateEmail}
                    placeholder="Enter your email address"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                  />
                </View>
                {errors.email && (
                  <Text style={styles.modernInputError}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.modernInputGroup}>
                <Text style={styles.modernInputLabel}>
                  Password <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.modernInputContainer, errors.password && styles.modernInputContainerError]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="lock-closed" size={20} color={errors.password ? "#EF4444" : "#6B7280"} />
                  </View>
                  <TextInput
                    style={styles.modernTextInput}
                    value={password}
                    onChangeText={updatePassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    autoCorrect={false}
                    testID="password"
                  />
                </View>
                {errors.password && (
                  <Text style={styles.modernInputError}>{errors.password}</Text>
                )}
              </View>

              <TouchableOpacity style={styles.forgotPasswordLink}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                style={styles.modernSignInButton}
                textStyle={styles.modernSignInButtonText}
              />

              {/* Biometric Authentication Option */}
              {showBiometricOption && biometricCapabilities && (
                <>
                  <View style={styles.biometricDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.biometricDividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.biometricButton}
                    onPress={handleBiometricLogin}
                  >
                    <View style={styles.biometricIconContainer}>
                      <Ionicons 
                        name={getBiometricIconName(biometricCapabilities.supportedTypes)} 
                        size={24} 
                        color="#3B82F6" 
                      />
                    </View>
                    <Text style={styles.biometricButtonText}>
                      Sign in with {getBiometricTypeName(biometricCapabilities.supportedTypes)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                </>
              )}

              {error && (
                <View style={styles.modernErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.modernErrorText}>{error}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Modern Footer */}
          <View style={styles.modernFooter}>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>New to RemitPay?</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <TouchableOpacity 
              style={styles.modernSignUpButton}
              onPress={() => router.push('/(auth)/register')}
            >
              <Ionicons name="person-add" size={16} color="#3B82F6" />
              <Text style={styles.modernSignUpButtonText}>Create Account</Text>
              <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <View style={styles.securityIcon}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.securityText}>
              Your data is protected with bank-grade encryption
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🎨 Base Layout
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF2FF',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 60,
  },

  // 🏢 Modern Header & Branding
  modernHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  welcomeContainer: {
    alignItems: 'center',
  },
  modernTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 8,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  modernSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },

  // 📋 Modern Form Card
  modernFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  formIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  modernForm: {
    gap: 20,
  },
  modernInputGroup: {
    position: 'relative',
  },
  // 💎 Modern Input Components
  modernInputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  required: {
    color: '#EF4444',
    fontWeight: '700',
  },
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  modernInputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1E3A8A',
    padding: 0,
  },
  modernInputError: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPasswordLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modernSignInButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modernSignInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modernErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modernErrorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // 🔐 Biometric Authentication
  biometricDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  biometricDividerText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricButtonText: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
    flex: 1,
  },

  // 🔗 Modern Footer
  modernFooter: {
    alignItems: 'center',
    gap: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  modernSignUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modernSignUpButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  // 🛡️ Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  securityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
});