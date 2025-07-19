import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WiseAccount } from '../../types/wise';

interface ComprehensiveBankingDetailsProps {
  account: WiseAccount;
  style?: object;
}

interface CopyableFieldProps {
  label: string;
  value: string;
  icon: string;
  isIban?: boolean;
}

const CopyableField: React.FC<CopyableFieldProps> = ({ label, value, icon, isIban = false }) => {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // For IBAN, copy without spaces
      const copyValue = isIban ? value.replace(/\s/g, '') : value;
      await Clipboard.setString(copyValue);
      setJustCopied(true);
      
      setTimeout(() => {
        setJustCopied(false);
      }, 2000);
      
    } catch {
      Alert.alert('Error', `Failed to copy ${label.toLowerCase()}`);
    }
  };

  // Format IBAN with spaces for display
  const displayValue = isIban && value 
    ? value.replace(/(.{4})/g, '$1 ').trim() 
    : value;

  return (
    <TouchableOpacity 
      style={[styles.copyableField, justCopied && styles.copyableFieldCopied]}
      onPress={handleCopy}
      activeOpacity={0.8}
    >
      <View style={styles.fieldHeader}>
        <View style={styles.fieldIconContainer}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color="#6B7280" />
        </View>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[styles.copyIndicator, justCopied && styles.copyIndicatorSuccess]}>
          <Ionicons 
            name={justCopied ? "checkmark" : "copy"} 
            size={14} 
            color={justCopied ? "#10B981" : "#3B82F6"} 
          />
        </View>
      </View>
      <Text style={[styles.fieldValue, isIban && styles.ibanValue]}>
        {displayValue}
      </Text>
    </TouchableOpacity>
  );
};

export default function ComprehensiveBankingDetails({ account, style }: ComprehensiveBankingDetailsProps) {
  // Get account holder name (fallback to account name)
  const accountHolder = account.name || 'Account Holder';
  
  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.bankingIcon}>
            <Ionicons name="card" size={24} color="#3B82F6" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Banking Details</Text>
            <Text style={styles.subtitle}>Tap any field to copy</Text>
          </View>
        </View>
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
        </View>
      </View>

      {/* Banking Fields */}
      <View style={styles.fieldsContainer}>
        {/* Account Holder */}
        <CopyableField
          label="Account Holder"
          value={accountHolder}
          icon="person-outline"
        />

        {/* IBAN */}
        {account.iban && (
          <CopyableField
            label="IBAN"
            value={account.iban}
            icon="globe-outline"
            isIban={true}
          />
        )}

        {/* Swift/BIC */}
        {account.bic && (
          <CopyableField
            label="Swift/BIC Code"
            value={account.bic}
            icon="business-outline"
          />
        )}

        {/* Account Number */}
        {account.accountNumber && (
          <CopyableField
            label="Account Number"
            value={account.accountNumber}
            icon="card-outline"
          />
        )}

        {/* Routing Number */}
        {account.routingNumber && (
          <CopyableField
            label="Routing Number"
            value={account.routingNumber}
            icon="git-branch-outline"
          />
        )}

        {/* Sort Code */}
        {account.sortCode && (
          <CopyableField
            label="Sort Code"
            value={account.sortCode}
            icon="keypad-outline"
          />
        )}

        {/* Bank Name */}
        {account.bankName && (
          <CopyableField
            label="Bank Name"
            value={account.bankName}
            icon="business"
          />
        )}
      </View>

      {/* Footer Info */}
      <View style={styles.footerInfo}>
        <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
        <Text style={styles.footerText}>
          Share these details with trusted parties to receive transfers
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🎨 Main Container
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  // 🌟 Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bankingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  securityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },

  // 📋 Fields Container
  fieldsContainer: {
    gap: 16,
    marginBottom: 20,
  },

  // 🔐 Copyable Field
  copyableField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'solid',
  },
  copyableFieldCopied: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  fieldIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  copyIndicatorSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },
  fieldValue: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
    lineHeight: 22,
  },
  ibanValue: {
    fontFamily: 'monospace',
    fontSize: 16,
    letterSpacing: 1,
    fontWeight: '700',
  },

  // 💡 Footer Info
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 16,
  },
});