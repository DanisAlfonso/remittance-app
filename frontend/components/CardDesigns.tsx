import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export interface CardDesignProps {
  cardNumber: string;
  holderName: string;
  expiryMonth: number;
  expiryYear: number;
  brand: string;
  currency: string;
  isTestCard?: boolean;
}

// Card Design Templates
export const CardDesigns = {
  // Classic RemitPay Design - Professional Blue
  classic: (props: CardDesignProps) => (
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardContainer}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.brandName}>RemitPay</Text>
        {props.isTestCard && (
          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>TEST</Text>
          </View>
        )}
      </View>
      
      <View style={styles.chipContainer}>
        <View style={styles.chip} />
        <Text style={styles.tagline}>European IBANs for Everyone</Text>
      </View>
      
      <Text style={styles.cardNumber}>{props.cardNumber}</Text>
      
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.label}>CARDHOLDER</Text>
          <Text style={styles.holderName}>{props.holderName}</Text>
        </View>
        <View>
          <Text style={styles.label}>EXPIRES</Text>
          <Text style={styles.expiry}>
            {props.expiryMonth.toString().padStart(2, '0')}/{props.expiryYear.toString().slice(-2)}
          </Text>
        </View>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyText}>{props.currency}</Text>
        </View>
      </View>
      
      <View style={styles.networkLogo}>
        <Text style={styles.networkText}>{props.brand.toUpperCase()}</Text>
      </View>
    </LinearGradient>
  ),

  // Premium Gold Design
  premium: (props: CardDesignProps) => (
    <LinearGradient
      colors={['#92400E', '#D97706', '#F59E0B', '#FCD34D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardContainer}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.brandName, { color: '#FFF' }]}>RemitPay</Text>
        <Text style={[styles.premiumText, { color: '#FFF' }]}>PREMIUM</Text>
        {props.isTestCard && (
          <View style={[styles.testBadge, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Text style={styles.testBadgeText}>TEST</Text>
          </View>
        )}
      </View>
      
      <View style={styles.chipContainer}>
        <View style={[styles.chip, { backgroundColor: '#FFF' }]} />
        <Text style={[styles.tagline, { color: '#FFF' }]}>European IBANs for Everyone</Text>
      </View>
      
      <Text style={[styles.cardNumber, { color: '#FFF' }]}>{props.cardNumber}</Text>
      
      <View style={styles.cardFooter}>
        <View>
          <Text style={[styles.label, { color: 'rgba(255,255,255,0.8)' }]}>CARDHOLDER</Text>
          <Text style={[styles.holderName, { color: '#FFF' }]}>{props.holderName}</Text>
        </View>
        <View>
          <Text style={[styles.label, { color: 'rgba(255,255,255,0.8)' }]}>EXPIRES</Text>
          <Text style={[styles.expiry, { color: '#FFF' }]}>
            {props.expiryMonth.toString().padStart(2, '0')}/{props.expiryYear.toString().slice(-2)}
          </Text>
        </View>
        <View style={[styles.currencyBadge, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
          <Text style={styles.currencyText}>{props.currency}</Text>
        </View>
      </View>
      
      <View style={styles.networkLogo}>
        <Text style={styles.networkText}>{props.brand.toUpperCase()}</Text>
      </View>
    </LinearGradient>
  ),

  // Midnight Black Design
  midnight: (props: CardDesignProps) => (
    <LinearGradient
      colors={['#111827', '#374151', '#4B5563']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardContainer}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.brandName, { color: '#F9FAFB' }]}>RemitPay</Text>
        {props.isTestCard && (
          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>TEST</Text>
          </View>
        )}
      </View>
      
      <View style={styles.chipContainer}>
        <View style={[styles.chip, { backgroundColor: '#9CA3AF' }]} />
        <Text style={[styles.tagline, { color: '#D1D5DB' }]}>European IBANs for Everyone</Text>
      </View>
      
      <Text style={[styles.cardNumber, { color: '#F9FAFB' }]}>{props.cardNumber}</Text>
      
      <View style={styles.cardFooter}>
        <View>
          <Text style={[styles.label, { color: '#9CA3AF' }]}>CARDHOLDER</Text>
          <Text style={[styles.holderName, { color: '#F9FAFB' }]}>{props.holderName}</Text>
        </View>
        <View>
          <Text style={[styles.label, { color: '#9CA3AF' }]}>EXPIRES</Text>
          <Text style={[styles.expiry, { color: '#F9FAFB' }]}>
            {props.expiryMonth.toString().padStart(2, '0')}/{props.expiryYear.toString().slice(-2)}
          </Text>
        </View>
        <View style={[styles.currencyBadge, { backgroundColor: '#374151' }]}>
          <Text style={styles.currencyText}>{props.currency}</Text>
        </View>
      </View>
      
      <View style={styles.networkLogo}>
        <Text style={[styles.networkText, { color: '#D1D5DB' }]}>{props.brand.toUpperCase()}</Text>
      </View>
    </LinearGradient>
  ),

  // Ocean Green Design
  ocean: (props: CardDesignProps) => (
    <LinearGradient
      colors={['#047857', '#059669', '#10B981', '#34D399']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardContainer}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.brandName}>RemitPay</Text>
        {props.isTestCard && (
          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>TEST</Text>
          </View>
        )}
      </View>
      
      <View style={styles.chipContainer}>
        <View style={styles.chip} />
        <Text style={styles.tagline}>European IBANs for Everyone</Text>
      </View>
      
      <Text style={styles.cardNumber}>{props.cardNumber}</Text>
      
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.label}>CARDHOLDER</Text>
          <Text style={styles.holderName}>{props.holderName}</Text>
        </View>
        <View>
          <Text style={styles.label}>EXPIRES</Text>
          <Text style={styles.expiry}>
            {props.expiryMonth.toString().padStart(2, '0')}/{props.expiryYear.toString().slice(-2)}
          </Text>
        </View>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyText}>{props.currency}</Text>
        </View>
      </View>
      
      <View style={styles.networkLogo}>
        <Text style={styles.networkText}>{props.brand.toUpperCase()}</Text>
      </View>
    </LinearGradient>
  )
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 300,
    height: 190,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
  },
  testBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  testBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#92400E',
  },
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  chip: {
    width: 32,
    height: 24,
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
  },
  tagline: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flex: 1,
    paddingRight: 60, // Leave space for network logo
  },
  label: {
    fontSize: 8,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  holderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  expiry: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  currencyBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  networkLogo: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'center',
  },
  networkText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});