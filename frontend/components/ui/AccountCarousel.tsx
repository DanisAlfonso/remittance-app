import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { bankingService } from '../../lib/bankingService';
import type { BankAccount, AccountBalance } from '../../types/banking';

const { width: screenWidth } = Dimensions.get('window');
// Perfect edge-to-edge alignment: cards span full screen width with internal padding
const CARD_PADDING = 16; // Internal card padding for content spacing

interface AccountCarouselProps {
  accounts: BankAccount[];
  selectedAccount: BankAccount | null;
  balance: AccountBalance | null;
  onAccountSelect: (accountId: string) => void;
  onCreateAccount: () => void;
  lastRefreshTime?: Date | null;
}

interface AccountCardProps {
  account: BankAccount;
  balance: AccountBalance | null;
  isSelected: boolean;
  onPress: () => void;
  lastRefreshTime?: Date | null;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  balance,
  isSelected,
  onPress,
  lastRefreshTime,
}) => {
  const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case 'EUR':
        return '€';
      case 'HNL':
        return 'L';
      case 'USD':
        return '$';
      default:
        return '¤';
    }
  };

  const getGradientColors = (currency: string): [string, string] => {
    switch (currency) {
      case 'EUR':
        return ['#3B82F6', '#1E40AF']; // Blue gradient
      case 'HNL':
        return ['#8B5CF6', '#7C3AED']; // Purple gradient
      case 'USD':
        return ['#7C3AED', '#5B21B6']; // Purple gradient
      default:
        return ['#6B7280', '#4B5563']; // Gray gradient
    }
  };

  const [primaryColor, secondaryColor] = getGradientColors(account.currency);

  return (
    <Pressable
      style={[
        styles.accountCard,
        {
          backgroundColor: primaryColor,
          transform: [{ scale: isSelected ? 1 : 0.95 }],
          opacity: isSelected ? 1 : 0.85,
        },
      ]}
      onPress={onPress}
    >
      {/* Card Background Gradient Effect */}
      <View
        style={[
          styles.cardGradient,
          { backgroundColor: secondaryColor, opacity: 0.3 },
        ]}
      />

      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.currencyInfo}>
          <View style={styles.currencySymbolContainer}>
            <Text style={styles.currencySymbol}>{getCurrencySymbol(account.currency)}</Text>
          </View>
          <View style={styles.currencyDetails}>
            <Text style={styles.currencyName}>{account.currency}</Text>
            <Text style={styles.accountType}>
              {bankingService.getAccountTypeDisplayName(account.type)}
            </Text>
          </View>
        </View>
        {/* Removed three dots menu as requested */}
      </View>

      {/* Balance Section */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>
          {balance ? bankingService.formatAmount(balance.amount, account.currency) : '---'}
        </Text>
        
        {/* Last Updated */}
        <View style={styles.lastUpdated}>
          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.lastUpdatedText}>
            Updated {lastRefreshTime ? lastRefreshTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : balance?.updatedAt ? new Date(balance.updatedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : 'Never'}
          </Text>
        </View>
      </View>

      {/* Account Details */}
      <View style={styles.accountDetails}>
        <Text style={styles.accountName} numberOfLines={1}>
          {account.name}
        </Text>
        {account.iban && (
          <Text style={styles.accountIban} numberOfLines={1}>
            {bankingService.formatIban(account.iban)}
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => router.push('/(dashboard)/send-money')}
        >
          <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Send</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => router.push('/(dashboard)/transactions')}
        >
          <Ionicons name="receipt" size={16} color="#FFFFFF" />
          <Text style={styles.quickActionText}>History</Text>
        </Pressable>
      </View>

      {/* Decorative Currency Symbol - Repositioned */}
      <View style={styles.decorativeCurrency}>
        <Text style={styles.decorativeCurrencySymbol}>{getCurrencySymbol(account.currency)}</Text>
      </View>
    </Pressable>
  );
};

const AddAccountCard: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    style={styles.addAccountCard}
    onPress={onPress}
  >
    <View style={styles.addAccountContent}>
      <View style={styles.addIconContainer}>
        <Ionicons name="add" size={32} color="#3B82F6" />
      </View>
      <Text style={styles.addAccountTitle}>Add Account</Text>
      <Text style={styles.addAccountSubtitle}>
        Create a new account for another currency
      </Text>
    </View>
  </Pressable>
);

export default function AccountCarousel({
  accounts,
  selectedAccount,
  balance,
  onAccountSelect,
  onCreateAccount,
  lastRefreshTime,
}: AccountCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / screenWidth);
    setCurrentIndex(index);
    
    // Auto-select the account that's currently in view
    if (index < accounts.length && accounts[index]) {
      const accountInView = accounts[index];
      if (selectedAccount?.id !== accountInView.id) {
        onAccountSelect(accountInView.id);
      }
    }
  };

  const scrollToAccount = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
  };

  const allItems = [...accounts, null]; // null represents the "Add Account" card

  return (
    <View style={styles.container}>
      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={screenWidth} // Snap to exact screen width
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {allItems.map((account, index) => (
          <View key={account?.id || 'add-account'} style={styles.cardContainer}>
            {account ? (
              <AccountCard
                account={account}
                balance={selectedAccount?.id === account.id ? balance : null}
                isSelected={selectedAccount?.id === account.id}
                onPress={() => onAccountSelect(account.id)}
                lastRefreshTime={lastRefreshTime}
              />
            ) : (
              <AddAccountCard onPress={onCreateAccount} />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      {allItems.length > 1 && (
        <View style={styles.pageIndicators}>
          {allItems.map((_, index) => (
            <Pressable
              key={index}
              style={[
                styles.pageIndicator,
                {
                  backgroundColor: currentIndex === index ? '#3B82F6' : '#E5E7EB',
                  width: currentIndex === index ? 24 : 8,
                },
              ]}
              onPress={() => scrollToAccount(index)}
            />
          ))}
        </View>
      )}

      {/* Quick Navigation Buttons (if more than 2 accounts) */}
      {accounts.length > 1 && (
        <View style={styles.quickNav}>
          {accounts.map((account, index) => (
            <Pressable
              key={account.id}
              style={[
                styles.quickNavButton,
                {
                  backgroundColor: selectedAccount?.id === account.id ? '#3B82F6' : '#F3F4F6',
                },
              ]}
              onPress={() => {
                onAccountSelect(account.id);
                scrollToAccount(index);
              }}
            >
              <Text
                style={[
                  styles.quickNavText,
                  {
                    color: selectedAccount?.id === account.id ? '#FFFFFF' : '#6B7280',
                  },
                ]}
              >
                {account.currency}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
    marginHorizontal: -16, // Break out of parent container padding
  },
  scrollView: {
    width: screenWidth, // ScrollView must have exact screen width for paging
  },
  scrollContent: {
    paddingVertical: 8,
    // No flex - let content determine size
  },
  cardContainer: {
    width: screenWidth, // Exact screen width for perfect snapping
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Account Card Styles
  accountCard: {
    width: screenWidth - 32, // Screen width minus small margins (16px each side)
    height: 240, // Increased height for better button spacing
    borderRadius: 20, // Restore beautiful rounded corners
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    justifyContent: 'space-between',
    marginHorizontal: 16, // Restore small margins for visual spacing
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  currencySymbolContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  currencyDetails: {
    flex: 1,
  },
  currencyName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 2,
  },
  accountType: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Removed cardActions and actionButton styles

  // Balance Section
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lastUpdatedText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  // Account Details
  accountDetails: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  accountName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 2,
  },
  accountIban: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Decorative Elements - Back to original position
  decorativeCurrency: {
    position: 'absolute',
    top: 15, // Back to top-right position as requested
    right: 15,
    opacity: 0.08,
  },
  decorativeCurrencySymbol: {
    fontSize: 60,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Add Account Card
  addAccountCard: {
    width: screenWidth - 32, // Screen width minus small margins (16px each side)
    height: 240, // Match increased account card height
    borderRadius: 20, // Restore beautiful rounded corners
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    marginHorizontal: 16, // Restore small margins for visual spacing
  },
  addAccountContent: {
    alignItems: 'center',
    gap: 16,
  },
  addIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  addAccountSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },

  // Page Indicators
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  pageIndicator: {
    height: 8,
    borderRadius: 4,
    // Note: React Native doesn't support CSS transitions - animations handled by component logic
  },

  // Quick Navigation
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  quickNavButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickNavText: {
    fontSize: 14,
    fontWeight: '600',
  },
});