import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { wiseService } from '../../lib/wise';

interface IbanDisplayProps {
  iban: string;
  accountName: string;
  currency: string;
  style?: any;
}

export default function IbanDisplay({ iban, accountName, currency, style }: IbanDisplayProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRevealIban = () => {
    setIsRevealed(!isRevealed);
  };

  const handleCopyIban = () => {
    try {
      setIsLoading(true);
      Clipboard.setString(iban);
      Alert.alert(
        'IBAN Copied',
        'The IBAN has been copied to your clipboard',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to copy IBAN');
    } finally {
      setIsLoading(false);
    }
  };

  const displayIban = isRevealed ? iban : wiseService.formatIban(iban);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.accountName}>{accountName}</Text>
        <Text style={styles.currency}>{currency} Account</Text>
      </View>

      <View style={styles.ibanContainer}>
        <View style={styles.ibanRow}>
          <Text style={styles.ibanLabel}>IBAN</Text>
          <TouchableOpacity 
            onPress={handleRevealIban}
            style={styles.revealButton}
          >
            <Text style={styles.revealText}>
              {isRevealed ? '👁️ Hide' : '👁️ Show'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={isRevealed ? handleCopyIban : handleRevealIban}
          style={styles.ibanValueContainer}
        >
          <Text style={styles.ibanValue}>
            {displayIban}
          </Text>
          {isRevealed && (
            <View style={styles.copyIcon}>
              <Text style={styles.copyText}>📋 Tap to copy</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isRevealed && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Share this IBAN with people you trust to receive transfers
          </Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          onPress={handleRevealIban}
          style={[styles.actionButton, styles.showButton]}
        >
          <Text style={styles.actionButtonText}>
            {isRevealed ? 'Hide IBAN' : 'Show Full IBAN'}
          </Text>
        </TouchableOpacity>

        {isRevealed && (
          <TouchableOpacity 
            onPress={handleCopyIban}
            style={[styles.actionButton, styles.copyButton]}
          >
            <Text style={styles.actionButtonTextWhite}>
              {isLoading ? 'Copying...' : 'Copy IBAN'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  header: {
    marginBottom: 16,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  currency: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  ibanContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ibanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ibanLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  revealButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  revealText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  ibanValueContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minHeight: 48,
    justifyContent: 'center',
  },
  ibanValue: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#333333',
    fontWeight: '500',
    letterSpacing: 1,
  },
  copyIcon: {
    marginTop: 8,
    alignItems: 'center',
  },
  copyText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  copyButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionButtonTextWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});