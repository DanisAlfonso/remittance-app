import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../lib/auth';
import { validateEmail, sanitizeInput } from '../../utils/validation';
import SimpleInput from '../../components/ui/SimpleInput';
import Button from '../../components/ui/Button';
import type { ValidationError, ApiError } from '../../types';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
      await login({
        email: sanitizeInput(email.trim()),
        password: password,
      });
      
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <SimpleInput
            label="Email"
            value={email}
            onChangeText={updateEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            required
          />

          <SimpleInput
            label="Password"
            value={password}
            onChangeText={updatePassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={errors.password}
            required
            testID="password"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.loginButton}
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Link href="/(auth)/register" style={styles.linkText}>
              Sign up
            </Link>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  },
  form: {
    marginBottom: 32,
  },
  loginButton: {
    marginTop: 8,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#6c757d',
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});