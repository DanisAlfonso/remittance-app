import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Button from '../../components/ui/Button';

interface Beneficiary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  country: string;
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    routingNumber?: string;
  };
  relationship: string;
  isActive: boolean;
  createdAt: string;
}

// Mock data for demo
const mockBeneficiaries: Beneficiary[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1234567890',
    country: 'United States',
    bankAccount: {
      accountNumber: '****1234',
      bankName: 'Chase Bank',
      routingNumber: '****5678',
    },
    relationship: 'Family',
    isActive: true,
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@email.com',
    country: 'Mexico',
    bankAccount: {
      accountNumber: '****5678',
      bankName: 'Banco Santander',
    },
    relationship: 'Friend',
    isActive: true,
    createdAt: '2024-01-08',
  },
  {
    id: '3',
    firstName: 'David',
    lastName: 'Wilson',
    phone: '+44987654321',
    country: 'United Kingdom',
    relationship: 'Business',
    isActive: false,
    createdAt: '2024-01-05',
  },
];

export default function BeneficiariesScreen() {
  const renderBeneficiary = ({ item }: { item: Beneficiary }) => (
    <View style={styles.beneficiaryCard}>
      <View style={styles.beneficiaryHeader}>
        <View style={styles.beneficiaryInfo}>
          <Text style={styles.beneficiaryName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.relationship}>{item.relationship}</Text>
          <Text style={styles.country}>{item.country}</Text>
        </View>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.isActive ? '#28a745' : '#dc3545' }
        ]} />
      </View>

      <View style={styles.contactInfo}>
        {item.email && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Email:</Text>
            <Text style={styles.contactValue}>{item.email}</Text>
          </View>
        )}
        {item.phone && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone:</Text>
            <Text style={styles.contactValue}>{item.phone}</Text>
          </View>
        )}
        {item.bankAccount && (
          <View style={styles.bankInfo}>
            <Text style={styles.bankLabel}>Bank Details:</Text>
            <Text style={styles.bankValue}>{item.bankAccount.bankName}</Text>
            <Text style={styles.accountNumber}>
              Account: {item.bankAccount.accountNumber}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.beneficiaryActions}>
        <Button
          title="Send Money"
          onPress={() => {
            console.log('Send money to:', item.firstName, item.lastName);
          }}
          style={styles.sendButton}
        />
        <Button
          title="Edit"
          onPress={() => {
            console.log('Edit beneficiary:', item.id);
          }}
          variant="secondary"
          style={styles.editButton}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Beneficiaries</Text>
        <Text style={styles.subtitle}>Manage your money recipients</Text>
      </View>

      <View style={styles.quickActions}>
        <Button
          title="Add New Beneficiary"
          onPress={() => {
            console.log('Add new beneficiary');
          }}
          style={styles.addButton}
        />
      </View>

      <View style={styles.beneficiariesContainer}>
        <Text style={styles.sectionTitle}>
          Your Beneficiaries ({mockBeneficiaries.length})
        </Text>
        
        {mockBeneficiaries.length > 0 ? (
          <FlatList
            data={mockBeneficiaries}
            renderItem={renderBeneficiary}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.beneficiariesList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No beneficiaries yet
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Add recipients to start sending money
            </Text>
            <Button
              title="Add Your First Beneficiary"
              onPress={() => {
                console.log('Add first beneficiary');
              }}
              style={styles.firstBeneficiaryButton}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 16,
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
  quickActions: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#28a745',
  },
  beneficiariesContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  beneficiariesList: {
    paddingBottom: 24,
  },
  beneficiaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  beneficiaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  beneficiaryInfo: {
    flex: 1,
  },
  beneficiaryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  relationship: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
    fontWeight: '500',
  },
  country: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  contactInfo: {
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  contactLabel: {
    fontSize: 14,
    color: '#6c757d',
    width: 60,
  },
  contactValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  bankInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bankLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
  },
  bankValue: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 2,
  },
  accountNumber: {
    fontSize: 12,
    color: '#6c757d',
  },
  beneficiaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sendButton: {
    flex: 1,
  },
  editButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  firstBeneficiaryButton: {
    backgroundColor: '#28a745',
  },
});