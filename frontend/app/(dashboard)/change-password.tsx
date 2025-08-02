import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../lib/auth';
import Button from '../../components/ui/Button';
import SimpleInput from '../../components/ui/SimpleInput';

export default function ChangePasswordScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    return errors;
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword.trim()) {
      Alert.alert('Error', 'Current password is required');
      return;
    }

    if (!formData.newPassword.trim()) {
      Alert.alert('Error', 'New password is required');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      Alert.alert('Invalid Password', passwordErrors.join('\n'));
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to change password
      // This would typically make a request to /obp/v5.1.0/users/current/change-password
      
      Alert.alert(
        'Success', 
        'Password changed successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Change Password</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
            style={styles.cancelButton}
          />
          <Text style={styles.title}>Change Password</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Requirements</Text>
          <View style={styles.requirementsList}>
            <Text style={styles.requirement}>• At least 8 characters long</Text>
            <Text style={styles.requirement}>• Contains uppercase and lowercase letters</Text>
            <Text style={styles.requirement}>• Contains at least one number</Text>
            <Text style={styles.requirement}>• Contains at least one special character (@$!%*?&)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          
          <View style={styles.formGroup}>
            <SimpleInput
              label="Current Password"
              value={formData.currentPassword}
              onChangeText={(text: string) => setFormData({ ...formData, currentPassword: text })}
              placeholder="Enter your current password"
              secureTextEntry
            />
            
            <SimpleInput
              label="New Password"
              value={formData.newPassword}
              onChangeText={(text: string) => setFormData({ ...formData, newPassword: text })}
              placeholder="Enter your new password"
              secureTextEntry
            />
            
            <SimpleInput
              label="Confirm New Password"
              value={formData.confirmPassword}
              onChangeText={(text: string) => setFormData({ ...formData, confirmPassword: text })}
              placeholder="Confirm your new password"
              secureTextEntry
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Change Password"
              onPress={handleChangePassword}
              loading={loading}
              disabled={!formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              style={styles.changeButton}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Security Tips</Text>
          <Text style={styles.infoText}>
            • Use a unique password that you don&apos;t use for other accounts{'\n'}
            • Consider using a password manager{'\n'}
            • Never share your password with anyone{'\n'}
            • Change your password regularly
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  placeholder: {
    width: 60,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  requirementsList: {
    gap: 8,
  },
  requirement: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  formGroup: {
    gap: 16,
  },
  actions: {
    marginTop: 24,
  },
  changeButton: {
    marginBottom: 8,
  },
  infoSection: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});