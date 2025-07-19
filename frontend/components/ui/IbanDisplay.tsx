import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { wiseService } from '../../lib/wise';

interface IbanDisplayProps {
  iban: string;
  accountName: string;
  currency: string;
  style?: object;
}

export default function IbanDisplay({ iban, accountName, currency, style }: IbanDisplayProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  const handleRevealIban = () => {
    setIsRevealed(!isRevealed);
  };

  const handleCopyIban = async () => {
    try {
      // Copy IBAN without spaces for proper usage
      const cleanIban = iban.replace(/\s/g, '');
      await Clipboard.setString(cleanIban);
      setJustCopied(true);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setJustCopied(false);
      }, 2000);
      
    } catch {
      Alert.alert('Error', 'Failed to copy IBAN');
    }
  };

  const formatIbanForDisplay = (iban: string): string => {
    // Format IBAN with spaces for readability (groups of 4 characters)
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  const displayIban = isRevealed ? formatIbanForDisplay(iban) : wiseService.formatIban(iban);

  return (
    <View style={[styles.container, style]}>
      {/* Premium Header */}
      <View style={styles.premiumHeader}>
        <View style={styles.bankingIcon}>
          <Ionicons name="card" size={24} color="#3B82F6" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.accountNameModern}>{accountName}</Text>
          <Text style={styles.currencyLabel}>{currency} • Banking Details</Text>
        </View>
      </View>

      {/* IBAN Display Card */}
      <View style={styles.ibanDisplayCard}>
        <View style={styles.ibanHeaderRow}>
          <View style={styles.ibanLabelContainer}>
            <Ionicons name="globe" size={16} color="#6B7280" />
            <Text style={styles.ibanLabelModern}>International Bank Account Number</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={isRevealed ? handleCopyIban : handleRevealIban}
          style={[
            styles.ibanValueCard,
            isRevealed && styles.ibanValueCardRevealed,
            justCopied && styles.ibanValueCardCopied
          ]}
          activeOpacity={0.8}
        >
          <View style={styles.ibanValueContainer}>
            <Text style={[styles.ibanValue, !isRevealed && styles.ibanValueHidden]}>
              {displayIban}
            </Text>
            
            {isRevealed && (
              <View style={styles.copyActionContainer}>
                <View style={[styles.copyIndicator, justCopied && styles.copyIndicatorSuccess]}>
                  <Ionicons 
                    name={justCopied ? "checkmark" : "copy"} 
                    size={18} 
                    color={justCopied ? "#10B981" : "#3B82F6"} 
                  />
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {!isRevealed && (
          <View style={styles.hiddenStateInfo}>
            <Text style={styles.hiddenStateText}>
              Tap to reveal your complete IBAN for sharing with trusted parties
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity 
          onPress={handleRevealIban}
          style={[styles.quickActionButton, styles.showActionButton]}
        >
          <Ionicons 
            name={isRevealed ? "eye-off-outline" : "eye-outline"} 
            size={18} 
            color="#3B82F6" 
          />
          <Text style={styles.quickActionText}>
            {isRevealed ? 'Hide IBAN' : 'Show IBAN'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🎨 Modern Container
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginVertical: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  // 🌟 Premium Header
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  accountNameModern: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },

  // 💎 IBAN Display Card
  ibanDisplayCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ibanHeaderRow: {
    marginBottom: 16,
  },
  ibanLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ibanLabelModern: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: -0.2,
  },

  // 🔐 IBAN Value Display
  ibanValueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minHeight: 64,
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  ibanValueCardRevealed: {
    borderColor: '#3B82F6',
    borderStyle: 'solid',
    backgroundColor: '#FAFBFF',
  },
  ibanValueCardCopied: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  ibanValueContainer: {
    alignItems: 'center',
    gap: 12,
  },
  ibanValue: {
    fontSize: 18,
    fontFamily: 'monospace',
    color: '#1E3A8A',
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  ibanValueHidden: {
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 1,
  },
  copyActionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  hiddenStateInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  hiddenStateText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },

  // ⚡ Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  showActionButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});