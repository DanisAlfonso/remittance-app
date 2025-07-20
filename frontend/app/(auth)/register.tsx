import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../lib/auth';
import { validateEmail, validatePassword, validateName, validatePhone, sanitizeInput } from '../../utils/validation';
import { 
  checkBiometricCapabilities, 
  setBiometricEnabled, 
  getBiometricTypeName,
  storeBiometricCredentials 
} from '../../lib/biometric';
import { TextInput } from 'react-native';
import Button from '../../components/ui/Button';
import type { RegisterData, ValidationError, ApiError } from '../../types';


type RegistrationStep = 1 | 2 | 3;

interface StepData {
  step1: {
    firstName: string;
    lastName: string;
  };
  step2: {
    email: string;
    phone: string;
  };
  step3: {
    password: string;
    confirmPassword: string;
  };
}

export default function RegisterScreen() {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [stepData, setStepData] = useState<StepData>({
    step1: { firstName: '', lastName: '' },
    step2: { email: '', phone: '' },
    step3: { password: '', confirmPassword: '' },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const progressAnim = useRef(new Animated.Value(1)).current;
  
  const { register, isLoading, error, clearError } = useAuthStore();

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (currentStep) {
      case 1:
        const firstNameValidation = validateName(stepData.step1.firstName, 'First name');
        if (!firstNameValidation.isValid) {
          newErrors.firstName = firstNameValidation.errors[0].message;
        }
        
        const lastNameValidation = validateName(stepData.step1.lastName, 'Last name');
        if (!lastNameValidation.isValid) {
          newErrors.lastName = lastNameValidation.errors[0].message;
        }
        break;
        
      case 2:
        const emailValidation = validateEmail(stepData.step2.email);
        if (!emailValidation.isValid) {
          newErrors.email = emailValidation.errors[0].message;
        }
        
        if (stepData.step2.phone) {
          const phoneValidation = validatePhone(stepData.step2.phone);
          if (!phoneValidation.isValid) {
            newErrors.phone = phoneValidation.errors[0].message;
          }
        }
        break;
        
      case 3:
        const passwordValidation = validatePassword(stepData.step3.password);
        if (!passwordValidation.isValid) {
          newErrors.password = passwordValidation.errors[0].message;
        }
        
        if (!stepData.step3.confirmPassword.trim()) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (stepData.step3.password !== stepData.step3.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }
    
    if (currentStep < 3) {
      const nextStep = (currentStep + 1) as RegistrationStep;
      animateToStep(nextStep);
    } else {
      handleRegister();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as RegistrationStep;
      animateToStep(prevStep);
    }
  };

  const animateToStep = (step: RegistrationStep) => {
    Animated.timing(progressAnim, {
      toValue: step,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setCurrentStep(step);
  };

  const offerBiometricSetup = async () => {
    try {
      const capabilities = await checkBiometricCapabilities();
      
      if (capabilities.canUseBiometrics) {
        const biometricType = getBiometricTypeName(capabilities.supportedTypes);
        const email = stepData.step2.email;
        const password = stepData.step3.password;
        
        Alert.alert(
          'Enable Biometric Sign In?',
          `Would you like to enable ${biometricType} for faster sign in to your RemitPay account?`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
            },
            {
              text: `Enable ${biometricType}`,
              onPress: async () => {
                try {
                  await setBiometricEnabled(true);
                  await storeBiometricCredentials(email, password);
                } catch (error) {
                  console.error('Error enabling biometric:', error);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error offering biometric setup:', error);
    }
  };

  const handleRegister = async () => {
    if (!validateCurrentStep()) {
      return;
    }
    
    clearError();
    
    try {
      const sanitizedData: RegisterData = {
        firstName: sanitizeInput(stepData.step1.firstName.trim()),
        lastName: sanitizeInput(stepData.step1.lastName.trim()),
        email: sanitizeInput(stepData.step2.email.trim()),
        password: stepData.step3.password,
        phone: stepData.step2.phone ? sanitizeInput(stepData.step2.phone.trim()) : undefined,
      };

      await register(sanitizedData);
      
      // Offer biometric setup after successful registration
      await offerBiometricSetup();
      
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
        Alert.alert('Registration Failed', apiError.message || 'An error occurred');
      }
    }
  };

  const updateStepData = (step: keyof StepData, field: string, value: string) => {
    setStepData(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value,
      },
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 1: return 'Personal Information';
      case 2: return 'Contact Details';
      case 3: return 'Create Password';
      default: return '';
    }
  };

  const getStepSubtitle = (): string => {
    switch (currentStep) {
      case 1: return 'Tell us your name';
      case 2: return 'How can we reach you?';
      case 3: return 'Secure your account';
      default: return '';
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 1: return 'person' as const;
      case 2: return 'mail' as const;
      case 3: return 'lock-closed' as const;
      default: return 'person' as const;
    }
  };

  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [1, 3],
                  outputRange: ['33%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
        <View style={styles.progressSteps}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={styles.progressStepContainer}>
              <View style={[
                styles.progressStep,
                currentStep >= step && styles.progressStepActive,
                currentStep > step && styles.progressStepCompleted,
              ]}>
                {currentStep > step ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.progressStepText,
                    currentStep >= step && styles.progressStepTextActive,
                  ]}>
                    {step}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.progressStepLabel,
                currentStep >= step && styles.progressStepLabelActive,
              ]}>
                {step === 1 ? 'Personal' : step === 2 ? 'Contact' : 'Security'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.modernInputGroup}>
        <Text style={styles.modernInputLabel}>
          First Name <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.modernInputContainer, errors.firstName && styles.modernInputContainerError]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="person" size={20} color={errors.firstName ? "#EF4444" : "#6B7280"} />
          </View>
          <TextInput
            style={styles.modernTextInput}
            value={stepData.step1.firstName}
            onChangeText={(value) => updateStepData('step1', 'firstName', value)}
            placeholder="Enter your first name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
          />
        </View>
        {errors.firstName && (
          <Text style={styles.modernInputError}>{errors.firstName}</Text>
        )}
      </View>

      <View style={styles.modernInputGroup}>
        <Text style={styles.modernInputLabel}>
          Last Name <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.modernInputContainer, errors.lastName && styles.modernInputContainerError]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="person" size={20} color={errors.lastName ? "#EF4444" : "#6B7280"} />
          </View>
          <TextInput
            style={styles.modernTextInput}
            value={stepData.step1.lastName}
            onChangeText={(value) => updateStepData('step1', 'lastName', value)}
            placeholder="Enter your last name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
        {errors.lastName && (
          <Text style={styles.modernInputError}>{errors.lastName}</Text>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
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
            value={stepData.step2.email}
            onChangeText={(value) => updateStepData('step2', 'email', value)}
            placeholder="Enter your email address"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            autoFocus
          />
        </View>
        {errors.email && (
          <Text style={styles.modernInputError}>{errors.email}</Text>
        )}
      </View>

      <View style={styles.modernInputGroup}>
        <Text style={styles.modernInputLabel}>
          Phone Number <Text style={styles.optionalText}>(Optional)</Text>
        </Text>
        <View style={[styles.modernInputContainer, errors.phone && styles.modernInputContainerError]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="call" size={20} color={errors.phone ? "#EF4444" : "#6B7280"} />
          </View>
          <TextInput
            style={styles.modernTextInput}
            value={stepData.step2.phone}
            onChangeText={(value) => updateStepData('step2', 'phone', value)}
            placeholder="Enter your phone number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            autoComplete="tel"
            autoCorrect={false}
          />
        </View>
        {errors.phone && (
          <Text style={styles.modernInputError}>{errors.phone}</Text>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
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
            value={stepData.step3.password}
            onChangeText={(value) => updateStepData('step3', 'password', value)}
            placeholder="Create a secure password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            testID="password"
          />
        </View>
        {errors.password && (
          <Text style={styles.modernInputError}>{errors.password}</Text>
        )}
      </View>

      <View style={styles.modernInputGroup}>
        <Text style={styles.modernInputLabel}>
          Confirm Password <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.modernInputContainer, errors.confirmPassword && styles.modernInputContainerError]}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="shield-checkmark" size={20} color={errors.confirmPassword ? "#EF4444" : "#6B7280"} />
          </View>
          <TextInput
            style={styles.modernTextInput}
            value={stepData.step3.confirmPassword}
            onChangeText={(value) => updateStepData('step3', 'confirmPassword', value)}
            placeholder="Confirm your password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            testID="confirmPassword"
          />
        </View>
        {errors.confirmPassword && (
          <Text style={styles.modernInputError}>{errors.confirmPassword}</Text>
        )}
      </View>

      {/* Password Requirements */}
      <View style={styles.passwordRequirements}>
        <Text style={styles.requirementsTitle}>Password must contain:</Text>
        <View style={styles.requirementsList}>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={stepData.step3.password.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={stepData.step3.password.length >= 8 ? "#10B981" : "#9CA3AF"} 
            />
            <Text style={[
              styles.requirementText,
              stepData.step3.password.length >= 8 && styles.requirementTextMet
            ]}>
              At least 8 characters
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={/[A-Z]/.test(stepData.step3.password) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/[A-Z]/.test(stepData.step3.password) ? "#10B981" : "#9CA3AF"} 
            />
            <Text style={[
              styles.requirementText,
              /[A-Z]/.test(stepData.step3.password) && styles.requirementTextMet
            ]}>
              One uppercase letter
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={/[0-9]/.test(stepData.step3.password) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/[0-9]/.test(stepData.step3.password) ? "#10B981" : "#9CA3AF"} 
            />
            <Text style={[
              styles.requirementText,
              /[0-9]/.test(stepData.step3.password) && styles.requirementTextMet
            ]}>
              One number
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[
          currentStep === 1 ? '#EEF2FF' : currentStep === 2 ? '#F0FDF4' : '#FEF2F2',
          '#F8FAFC',
          '#FFFFFF'
        ]}
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
              <Text style={styles.modernTitle}>Create Account</Text>
              <Text style={styles.modernSubtitle}>Join us to start sending money worldwide</Text>
            </View>
          </View>

          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Modern Form Card */}
          <View style={styles.modernFormCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconContainer}>
                <Ionicons name={getStepIcon()} size={24} color="#3B82F6" />
              </View>
              <View style={styles.stepTitleContainer}>
                <Text style={styles.formTitle}>{getStepTitle()}</Text>
                <Text style={styles.stepSubtitle}>{getStepSubtitle()}</Text>
              </View>
            </View>
            
            {/* Steps Container */}
            <View style={styles.stepsContainer}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </View>

            {/* Navigation Buttons */}
            <View style={styles.navigationContainer}>
              {currentStep > 1 && (
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={handleBack}
                >
                  <Ionicons name="chevron-back" size={20} color="#6B7280" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              
              <View style={{ flex: 1 }} />
              
              <Button
                title={currentStep === 3 ? 'Create Account' : 'Continue'}
                onPress={handleNext}
                loading={isLoading}
                style={currentStep === 3 
                  ? { ...styles.continueButton, ...styles.createAccountButton } 
                  : styles.continueButton
                }
                textStyle={styles.continueButtonText}
              />
            </View>

            {error && (
              <View style={styles.modernErrorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.modernErrorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Modern Footer */}
          <View style={styles.modernFooter}>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Already have an account?</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <TouchableOpacity 
              style={styles.modernSignInButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <Ionicons name="log-in" size={16} color="#3B82F6" />
              <Text style={styles.modernSignInButtonText}>Sign In</Text>
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
    paddingBottom: 24,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 24,
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

  // 📊 Progress Bar
  progressContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressStepActive: {
    backgroundColor: '#3B82F6',
  },
  progressStepCompleted: {
    backgroundColor: '#10B981',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  progressStepTextActive: {
    color: '#FFFFFF',
  },
  progressStepLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },
  progressStepLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
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
    minHeight: 400,
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
  stepTitleContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // 🎬 Steps Container
  stepsContainer: {
    minHeight: 280,
    marginBottom: 24,
  },
  stepContainer: {
    flex: 1,
  },
  modernInputGroup: {
    marginBottom: 20,
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
  optionalText: {
    color: '#9CA3AF',
    fontWeight: '400',
    fontSize: 13,
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

  // 🔐 Password Requirements
  passwordRequirements: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  requirementTextMet: {
    color: '#10B981',
    fontWeight: '600',
  },

  // 🎯 Navigation
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  continueButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 140,
  },
  createAccountButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  continueButtonText: {
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
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modernErrorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
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
  modernSignInButton: {
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
  modernSignInButtonText: {
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