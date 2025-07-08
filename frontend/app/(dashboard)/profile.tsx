import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../../lib/auth';
import Button from '../../components/ui/Button';

export default function ProfileScreen() {
  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account information</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>
            
            {user?.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Phone</Text>
                <Text style={styles.value}>{user.phone}</Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Account Created</Text>
              <Text style={styles.value}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          
          <View style={styles.statusGroup}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Account Status</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: user?.isActive ? '#d4edda' : '#f8d7da' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: user?.isActive ? '#155724' : '#721c24' }
                ]}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Email Verification</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: user?.emailVerified ? '#d4edda' : '#fff3cd' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: user?.emailVerified ? '#155724' : '#856404' }
                ]}>
                  {user?.emailVerified ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Edit Profile"
            onPress={() => {
              // TODO: Navigate to edit profile screen
              console.log('Edit profile pressed');
            }}
            style={styles.editButton}
          />
          
          <Button
            title="Change Password"
            onPress={() => {
              // TODO: Navigate to change password screen
              console.log('Change password pressed');
            }}
            variant="secondary"
            style={styles.passwordButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
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
  infoGroup: {
    gap: 16,
  },
  infoRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
  },
  statusGroup: {
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: 16,
    marginTop: 16,
  },
  editButton: {
    marginBottom: 8,
  },
  passwordButton: {
    marginBottom: 8,
  },
});