import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../lib/auth';
import Button from '../../components/ui/Button';
import SimpleInput from '../../components/ui/SimpleInput';
import ProfileCircle from '../../components/ui/ProfileCircle';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    country: user?.country || '',
  });

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to update user profile
      // For now, update local state
      if (updateUser && user) {
        await updateUser({
          ...user,
          ...formData,
        });
      }
      
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
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
          <Text style={styles.title}>Edit Profile</Text>
          <Button
            title="Save"
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />
        </View>

        <View style={styles.avatarSection}>
          <ProfileCircle
            firstName={formData.firstName}
            lastName={formData.lastName}
            email={user.email}
            size={100}
            backgroundColor="#007AFF"
          />
          <Text style={styles.avatarText}>Profile Photo</Text>
          <Text style={styles.avatarSubtext}>Tap to change photo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.formGroup}>
            <SimpleInput
              label="First Name"
              value={formData.firstName}
              onChangeText={(text: string) => setFormData({ ...formData, firstName: text })}
              placeholder="Enter your first name"
            />
            
            <SimpleInput
              label="Last Name"
              value={formData.lastName}
              onChangeText={(text: string) => setFormData({ ...formData, lastName: text })}
              placeholder="Enter your last name"
            />
            
            <SimpleInput
              label="Email"
              value={user.email}
              onChangeText={() => {}} // Read-only field
              placeholder="Email address"
              style={styles.disabledInput}
            />
            
            <SimpleInput
              label="Phone"
              value={formData.phone}
              onChangeText={(text: string) => setFormData({ ...formData, phone: text })}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
            
            <SimpleInput
              label="Country"
              value={formData.country}
              onChangeText={(text: string) => setFormData({ ...formData, country: text })}
              placeholder="Enter your country"
            />
          </View>
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
  },
  avatarSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
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
    marginBottom: 20,
  },
  formGroup: {
    gap: 16,
  },
  disabledInput: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
  },
});