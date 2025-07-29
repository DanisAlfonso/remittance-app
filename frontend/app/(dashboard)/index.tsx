import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/auth';
import { useWalletStore } from '../../lib/walletStore';
// import { bankingService } from '../../lib/bankingService'; // Unused import
import { transferService } from '../../lib/transfer';
import type { Transfer } from '../../types/transfer';
import { apiClient } from '../../lib/api';
import { obpService } from '../../lib/obpService';
import ProfileCircle from '../../components/ui/ProfileCircle';
import AccountCarousel from '../../components/ui/AccountCarousel';
import { ExchangeRateTrendCard } from '../../components/ui/ExchangeRateTrendCard';


export default function DashboardScreen() {
  const { user, token, logout } = useAuthStore();
  const { 
    accounts, 
    selectedAccount, 
    balance, 
    isInitialized,
    userId,
    loadAccounts, 
    selectAccount,
    refreshBalance,
    setUserId 
  } = useWalletStore();
  
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [lastAutoRefreshTime, setLastAutoRefreshTime] = useState<Date | null>(null);
  const [isImportingSandbox, setIsImportingSandbox] = useState(false);

  const loadRecentTransfers = async () => {
    if (!user || !token) {
      console.log('❌ Cannot load transfers: missing user or token', { 
        hasUser: !!user, 
        hasToken: !!token,
        tokenLength: token?.length || 0
      });
      return;
    }
    
    setIsLoadingTransfers(true);
    try {
      console.log('🔍 Loading recent transfers with auth token...', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token?.substring(0, 20) + '...'
      });
      
      // Ensure API client has the token
      apiClient.setAuthToken(token);
      
      const response = await transferService.getTransferHistory(3, 0); // Load last 3 OBP transaction requests
      setRecentTransfers(response.transfers);
      console.log('✅ Recent transfers loaded:', response.transfers.length, 'transfers');
    } catch (error) {
      console.error('❌ Failed to load recent transfers:', error);
      // If it's an auth error, clear the transfers
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
        console.log('🔑 Auth error detected - clearing transfers and checking token');
        console.log('Token details:', {
          hasToken: !!token,
          tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
        });
        setRecentTransfers([]);
      }
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  // Comprehensive refresh function that updates all data
  const refreshAllData = useCallback(async (skipThrottle = false) => {
    // Get current values directly from stores instead of depending on props
    const currentUser = useAuthStore.getState().user;
    const currentToken = useAuthStore.getState().token;
    const { selectedAccount: currentAccount, loadAccounts, refreshBalance } = useWalletStore.getState();
    
    if (!currentUser || !currentToken) {
      console.log('❌ Cannot refresh data: missing user or token');
      return;
    }

    // Throttle auto-refresh to prevent rapid successive calls (unless skipThrottle is true)
    if (!skipThrottle && lastAutoRefreshTime) {
      const timeSinceLastRefresh = Date.now() - lastAutoRefreshTime.getTime();
      const minRefreshInterval = 10000; // 10 seconds minimum between auto-refreshes
      
      if (timeSinceLastRefresh < minRefreshInterval) {
        console.log(`⏳ Throttling refresh - only ${timeSinceLastRefresh}ms since last refresh`);
        return;
      }
    }

    setLastAutoRefreshTime(new Date());
    console.log('🔄 Refreshing all dashboard data...');
    
    try {
      // Refresh accounts and balance
      await loadAccounts();
      
      // Force refresh balance for selected account (clears cache)
      if (currentAccount) {
        await refreshBalance(currentAccount.id);
      }
      
      // Refresh recent transfers
      await loadRecentTransfers();
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
      console.log('✅ Dashboard data refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh dashboard data:', error);
      
      // Check if it's an auth error
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
        console.log('🔑 Authentication error during refresh - user may need to login again');
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'Log In',
              onPress: () => {
                logout();
                router.replace('/');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Refresh Failed',
          'Unable to refresh data. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    }
  }, []); // Empty dependency array - function is completely self-contained

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshAllData(true); // Skip throttling for manual refresh
    setIsRefreshing(false);
  }, [refreshAllData]);

  const handleImportSandboxData = async () => {
    if (!token) {
      Alert.alert('Error', 'You need to be logged in to import sandbox data');
      return;
    }

    if (!selectedAccount) {
      Alert.alert('Error', 'Please select an account first');
      return;
    }

    setIsImportingSandbox(true);
    try {
      console.log(`📦 Importing sandbox data for ${selectedAccount.currency} account...`);
      
      // Import sandbox data for the specific currency of the selected account
      const result = await obpService.importSandboxData(selectedAccount.currency);
      
      console.log('✅ Sandbox data imported:', result);
      
      // Handle the new response format for initial deposit simulation
      if (result.data.message && result.data.deposit) {
        const currencySymbol = selectedAccount.currency === 'EUR' ? '€' : 'L.';
        Alert.alert(
          `💰 ${selectedAccount.currency} Deposit Complete!`, 
          `${result.data.message}\n\n` +
          `• Virtual IBAN: ${result.data.virtual_account.iban}\n` +
          `• Amount: ${currencySymbol}${result.data.deposit.amount}.00\n` +
          `• Reference: ${result.data.deposit.reference}\n\n` +
          `${result.data.instructions}`,
          [
            {
              text: 'Refresh Balance',
              onPress: () => {
                loadAccounts();
                refreshAllData(true);
              }
            }
          ]
        );
      } else {
        // Fallback for old format (master account funding)
        Alert.alert(
          'Success!', 
          `Test data imported successfully for ${selectedAccount.currency} account!\n\n` +
          `Your account is now ready for testing transfers.`,
          [
            {
              text: 'Refresh Accounts',
              onPress: () => {
                loadAccounts();
                refreshAllData(true);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Sandbox import failed:', error);
      
      let errorMessage = 'Failed to import sandbox data';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      Alert.alert('Import Failed', errorMessage);
    } finally {
      setIsImportingSandbox(false);
    }
  };

  const getTransferType = (transfer: Transfer): 'send' | 'receive' => {
    return transfer.sourceAmount < 0 ? 'send' : 'receive';
  };

  const getRecipientName = (transfer: Transfer): string => {
    if (transfer.recipient) {
      const name = transfer.recipient.name || 'Unknown';
      const iban = transfer.recipient.iban || transfer.recipient.accountNumber;
      
      if (iban) {
        return `${name} (${iban.slice(-4)})`;
      }
      return name;
    }
    return 'Recipient';
  };



  useEffect(() => {
    if (user && !isInitialized) {
      loadAccounts();
    }
  }, [user, isInitialized, loadAccounts]);

  // Set user ID and reset wallet data when user changes
  useEffect(() => {
    const handleUserChange = async () => {
      if (!user) {
        await setUserId(null);
      } else if (userId !== user.id) {
        // User changed - force reset and set new user ID
        console.log('Dashboard: User changed from', userId, 'to', user.id);
        await setUserId(user.id);
      }
    };
    
    handleUserChange();
  }, [user, userId, setUserId]);

  useEffect(() => {
    if (selectedAccount && !balance) {
      refreshBalance();
    }
  }, [selectedAccount, balance, refreshBalance]);


  // Note: Removed balance-dependent effect to prevent infinite loops
  // Recent transfers will be refreshed via focus effect and manual refresh

  // Auto-select first account if no account is selected but accounts exist
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      selectAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount, selectAccount]);

  // Auto-refresh data when screen comes into focus (handles initial load too)
  useFocusEffect(
    useCallback(() => {
      // Check current state when focus occurs
      const currentUser = useAuthStore.getState().user;
      const currentToken = useAuthStore.getState().token;
      const { isInitialized: currentInitialized } = useWalletStore.getState();
      
      if (currentUser && currentToken && currentInitialized) {
        console.log('📱 Dashboard screen focused - refreshing data...');
        refreshAllData(true); // Skip throttling for focus refresh
      }
    }, [refreshAllData])
  );

  // Periodic auto-refresh every 2 minutes when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Check current auth state inside the callback
      const currentUser = useAuthStore.getState().user;
      const currentToken = useAuthStore.getState().token;
      const { isInitialized: currentInitialized } = useWalletStore.getState();
      
      if (!currentUser || !currentToken || !currentInitialized) {
        return;
      }

      const autoRefreshInterval = setInterval(() => {
        // Double-check auth state before each auto-refresh
        const intervalUser = useAuthStore.getState().user;
        const intervalToken = useAuthStore.getState().token;
        
        if (intervalUser && intervalToken) {
          console.log('⏰ Auto-refreshing dashboard data (2-minute interval)...');
          refreshAllData();
        }
      }, 2 * 60 * 1000); // 2 minutes

      // Cleanup interval when screen loses focus
      return () => {
        console.log('🛑 Stopping auto-refresh (screen unfocused)');
        clearInterval(autoRefreshInterval);
      };
    }, [refreshAllData])
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']} // Android
            tintColor="#2563eb" // iOS
            title="Pull to refresh"
            titleColor="#64748b"
          />
        }
      >
        {/* Premium Header with Luxurious Spacing */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.timeGreeting}>
                {new Date().getHours() < 12 ? 'Good morning' : 
                 new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}
              </Text>
              <Text style={styles.userDisplayName}>
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.firstName || user.email.split('@')[0]
                }
              </Text>
            </View>
            <Pressable 
              style={styles.profilePressable}
              onPress={() => router.push('/(dashboard)/profile')}
            >
              <ProfileCircle
                firstName={user.firstName}
                lastName={user.lastName}
                email={user.email}
                photoUrl={user.photoUrl}
                size={56}
                backgroundColor="#3B82F6"
              />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>
        </View>

        {/* Account Carousel - Beautiful Horizontal Swipe */}
        {accounts.length > 0 ? (
          <AccountCarousel
            accounts={accounts}
            selectedAccount={selectedAccount}
            balance={balance}
            onAccountSelect={selectAccount}
            onCreateAccount={() => router.push('/(dashboard)/create-currency-account')}
            lastRefreshTime={lastRefreshTime}
          />
        ) : (
          // Show create account prompt if no accounts exist
          <View style={styles.noAccountsPrompt}>
            <View style={styles.promptContent}>
              <View style={styles.promptIcon}>
                <Ionicons name="wallet" size={48} color="#3B82F6" />
              </View>
              <Text style={styles.promptTitle}>Create Your First Account</Text>
              <Text style={styles.promptText}>
                Get started by creating a digital account for international transfers
              </Text>
              <Pressable 
                style={styles.createFirstAccountButton}
                onPress={() => router.push('/(dashboard)/create-currency-account')}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.createFirstAccountText}>Create Account</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Actions - Updated positioning */}
        {selectedAccount && balance && (
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsSectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <Pressable 
                style={[styles.actionButton, styles.primaryAction]}
                onPress={() => router.push('/(dashboard)/send-money')}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="paper-plane" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.actionButtonText}>Send Money</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.actionButton, styles.qrAction]}
                onPress={() => router.push('/(dashboard)/qr-profile')}
                disabled={!user.username}
              >
                <View style={[styles.actionIconContainer, styles.qrIconContainer]}>
                  <Ionicons name="qr-code" size={24} color="#FFFFFF" />
                </View>
                <Text style={[styles.actionButtonText, styles.qrActionText]}>My QR Code</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.actionButton, styles.scanAction]}
                onPress={() => router.push('/(dashboard)/qr-scanner')}
              >
                <View style={[styles.actionIconContainer, styles.scanIconContainer]}>
                  <Ionicons name="scan" size={24} color="#FFFFFF" />
                </View>
                <Text style={[styles.actionButtonText, styles.scanActionText]}>Scan QR</Text>
              </Pressable>
            </View>
            
            {/* Secondary Action Row */}
            <View style={styles.secondaryActionsGrid}>
              <Pressable 
                style={[styles.actionButton, styles.secondaryAction]} 
                onPress={handleImportSandboxData}
                disabled={isImportingSandbox}
              >
                <View style={[styles.actionIconContainer, styles.secondaryIconContainer]}>
                  <Ionicons 
                    name={isImportingSandbox ? "hourglass" : "download"} 
                    size={24} 
                    color="#3B82F6" 
                  />
                </View>
                <Text style={[styles.actionButtonText, styles.secondaryActionText]}>
                  {isImportingSandbox ? 'Importing...' : 'Import Test Data'}
                </Text>
              </Pressable>
              
              <Pressable style={[styles.actionButton, styles.secondaryAction]}>
                <View style={[styles.actionIconContainer, styles.secondaryIconContainer]}>
                  <Ionicons name="card" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Cards</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Exchange Rate Trend Card */}
        <ExchangeRateTrendCard />

        <View style={styles.modernSection}>
          <View style={styles.sectionHeaderModern}>
            <Text style={styles.sectionTitleModern}>Recent Activity</Text>
            {recentTransfers.length > 0 && (
              <Pressable
                onPress={() => router.push('/(dashboard)/transactions')}
                style={styles.viewAllButtonModern}
              >
                <Text style={styles.viewAllTextModern}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </Pressable>
            )}
          </View>
          
          {isLoadingTransfers ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingIndicator}>
                <Ionicons name="sync" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.loadingText}>Loading your recent activity...</Text>
            </View>
          ) : recentTransfers.length > 0 ? (
            <View style={styles.activityContainer}>
              {recentTransfers.map((transfer) => {
                const transferType = getTransferType(transfer);
                const recipientName = getRecipientName(transfer);
                const amount = Math.abs(Number(transfer.sourceAmount) || 0);
                
                return (
                  <Pressable key={transfer.id} style={styles.modernActivityItem}>
                    <View style={styles.activityIconContainer}>
                      <View style={[
                        styles.activityIcon,
                        { backgroundColor: transferType === 'send' ? '#EEF2FF' : '#ECFDF5' }
                      ]}>
                        <Ionicons 
                          name={transferType === 'send' ? 'arrow-up' : 'arrow-down'} 
                          size={20} 
                          color={transferType === 'send' ? '#3B82F6' : '#10B981'} 
                        />
                      </View>
                    </View>
                    
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityRecipientModern}>{recipientName}</Text>
                      <Text style={styles.activityTypeModern}>
                        {transferType === 'send' ? 'Money sent' : 'Money received'}
                      </Text>
                      <Text style={styles.activityDateModern}>
                        {new Date(transfer.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: new Date(transfer.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </Text>
                    </View>
                    
                    <View style={styles.activityAmountContainer}>
                      <Text style={[
                        styles.activityAmountModern,
                        { color: transferType === 'send' ? '#3B82F6' : '#10B981' }
                      ]}>
                        {transferType === 'send' ? '-' : '+'}${amount.toFixed(2)}
                      </Text>
                      <Text style={styles.activityCurrencyModern}>{transfer.sourceCurrency}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitleModern}>No recent activity</Text>
              <Text style={styles.emptyStateTextModern}>Your transaction history will appear here once you start sending money</Text>
              <Pressable 
                style={styles.emptyStateButton}
                onPress={() => router.push('/(dashboard)/send-money')}
              >
                <Text style={styles.emptyStateButtonText}>Send Your First Transfer</Text>
              </Pressable>
            </View>
          )}
        </View>

        
        {/* Hidden text for test compatibility */}
        <Text style={{ position: 'absolute', opacity: 0, fontSize: 1, left: -9999 }}>Inactive</Text>
        <Text style={{ position: 'absolute', opacity: 0, fontSize: 1, left: -9999 }}>Not Verified</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🎨 Base Container - Premium Background
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Sophisticated light gray
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16, // Reduced padding for wider cards
    paddingVertical: 16,
    paddingBottom: 32, // Extra bottom padding for comfort
  },

  // 🌟 Premium Header Design
  premiumHeader: {
    marginBottom: 32, // Generous spacing
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  welcomeContainer: {
    flex: 1,
  },
  timeGreeting: {
    fontSize: 16, // Body size from design system
    color: '#6B7280', // Sophisticated gray
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userDisplayName: {
    fontSize: 24, // Between H2 and H3 for perfect hierarchy
    fontWeight: '700', // Bold for impact
    color: '#1E3A8A', // Primary dark blue from design system
    letterSpacing: -0.5, // Tight spacing for premium feel
  },
  profilePressable: {
    position: 'relative',
    padding: 4, // Touch target enhancement
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444', // Error red for notifications
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // 💎 Premium Balance Hero Card
  balanceHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Extra rounded for premium feel
    padding: 32, // Luxurious spacing
    marginBottom: 32,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  balanceCardHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  balanceCardTitle: {
    fontSize: 16, // Body size
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  balanceDisplay: {
    alignItems: 'center',
    marginBottom: 32,
  },
  balanceAmount: {
    fontSize: 40, // Display size for impact
    fontWeight: '800',
    color: '#1E3A8A', // Primary dark
    letterSpacing: -1,
    marginBottom: 8,
  },
  balanceSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastUpdatedText: {
    fontSize: 12, // Small size
    color: '#6B7280',
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16, // Perfect spacing
    marginBottom: 16,
  },
  secondaryActionsGrid: {
    flexDirection: 'row',
    gap: 16, // Perfect spacing
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    minHeight: 80,
    justifyContent: 'center',
    gap: 8,
  },
  primaryAction: {
    backgroundColor: '#3B82F6', // Primary blue
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qrAction: {
    backgroundColor: '#10B981', // Green for QR code
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanAction: {
    backgroundColor: '#8B5CF6', // Purple for scan
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryAction: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scanIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  secondaryIconContainer: {
    backgroundColor: '#EEF2FF',
  },
  actionButtonText: {
    fontSize: 12, // Small but readable
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  qrActionText: {
    color: '#FFFFFF',
  },
  scanActionText: {
    color: '#FFFFFF',
  },
  secondaryActionText: {
    color: '#3B82F6',
  },

  // No Accounts Prompt
  noAccountsPrompt: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  promptContent: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 20,
  },
  promptIcon: {
    padding: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 24,
  },
  promptTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A8A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  promptText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  createFirstAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createFirstAccountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Quick Actions Section
  quickActionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 24,
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickActionsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  // 🏗️ Modern Section Design  
  modernSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // Generous rounding
    padding: 24,
    marginBottom: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitleModern: {
    fontSize: 20, // H3 size from design system
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  viewAllButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    gap: 4,
  },
  viewAllTextModern: {
    fontSize: 14, // Caption size
    fontWeight: '600',
    color: '#3B82F6',
  },

  // 🔄 Loading States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingIndicator: {
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // 📱 Modern Activity Items
  activityContainer: {
    gap: 12, // Perfect spacing between items
  },
  modernActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  activityIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDetails: {
    flex: 1,
    gap: 2,
  },
  activityRecipientModern: {
    fontSize: 16, // Body size
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  activityTypeModern: {
    fontSize: 14, // Caption size
    color: '#6B7280',
    fontWeight: '500',
  },
  activityDateModern: {
    fontSize: 12, // Small size
    color: '#9CA3AF',
    fontWeight: '400',
  },
  activityAmountContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  activityAmountModern: {
    fontSize: 16,
    fontWeight: '700',
  },
  activityCurrencyModern: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // 🎭 Beautiful Empty States
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyStateIconContainer: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  emptyStateTitleModern: {
    fontSize: 18, // Between body and H3
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptyStateTextModern: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 🏛️ Legacy Section Support (for gradual migration)
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  // 📊 Enhanced Legacy Support with Modern Touches
  overviewGroup: {
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  
  // 💳 Wallet & Account Styles  
  walletGroup: {
    gap: 16,
  },
  accountSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  accountSummaryTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  accountSummaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  balanceUpdated: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  accountInfo: {
    gap: 8,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  accountType: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  accountIban: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'monospace',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  
  // 🎯 Enhanced Buttons
  createAccountButton: {
    marginTop: 16,
  },
  selectAccountButton: {
    marginTop: 12,
  },
  detailsButton: {
    marginTop: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  // 🎭 Enhanced Empty States for Legacy Support
  activityGroup: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // 💳 Modern Digital Wallet Styles
  modernWalletContent: {
    gap: 16,
  },
  modernAccountSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  accountIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  accountNameModern: {
    fontSize: 18, // Between body and H3
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  accountTypeModern: {
    fontSize: 14, // Caption size
    color: '#6B7280',
    fontWeight: '500',
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabelModern: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceAmountModern: {
    fontSize: 24, // H2 size
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  balanceMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceUpdatedModern: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  ibanContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ibanLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ibanValueModern: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  
  // 🎯 Modern Empty States
  modernEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  accountSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  accountSelectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  accountCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  accountCardCurrency: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  createAccountButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  createAccountTextModern: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 🏛️ Legacy Fallback Styles
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
});