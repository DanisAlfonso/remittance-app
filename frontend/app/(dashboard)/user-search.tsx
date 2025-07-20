import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/auth';
import { apiClient } from '../../lib/api';
import type { SearchResult, UserSearchResponse } from '../../types/users';

export default function UserSearchScreen() {
  const { currency } = useLocalSearchParams<{ currency: string }>();
  const { token } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search as user types (debounced)
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      
      // Determine search type based on query format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[\+]?[1-9][\d]{1,14}$/;
      
      if (emailRegex.test(searchQuery)) {
        // Valid email format
        params.append('email', searchQuery);
      } else if (phoneRegex.test(searchQuery) || searchQuery.startsWith('+')) {
        // Phone search
        params.append('phone', searchQuery);
      } else {
        // Username/name search (includes partial emails and @usernames)
        params.append('query', searchQuery);
      }

      const response = await apiClient.get(`/users/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response as UserSearchResponse;
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Unable to search for users. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: SearchResult) => {
    // Navigate to transfer amount screen with selected user (@username transfer)
    // This will trigger IBAN lookup and real bank transfer via Wise API
    router.push({
      pathname: '/(dashboard)/transfer-amount',
      params: {
        recipientId: user.id,
        recipientName: user.displayName,
        recipientUsername: user.username || '',
        transferType: 'user', // @username transfer (will lookup IBAN and use Wise API)
        currency: currency || 'EUR'
      }
    });
  };

  const formatMemberSince = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return 'New member';
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  const getSearchPlaceholder = (): string => {
    return 'Search by @username, email, or phone';
  };

  const getSearchHelpText = (): string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[1-9][\d]{1,14}$/;
    
    if (emailRegex.test(searchQuery)) {
      return 'Searching by email address...';
    } else if (phoneRegex.test(searchQuery) || searchQuery.startsWith('+')) {
      return 'Searching by phone number...';
    } else if (searchQuery.startsWith('@')) {
      return 'Searching by username...';
    } else if (searchQuery.length >= 2) {
      return 'Searching by name or username...';
    }
    return 'Enter at least 2 characters to search';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Find App User</Text>
          <Text style={styles.headerSubtitle}>Send {currency || 'EUR'}</Text>
        </View>
        <View style={styles.headerAction} />
      </View>
      
      <ScrollView 
        style={styles.modernScrollView}
        contentContainerStyle={styles.modernScrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Modern Search Section */}
        <View style={styles.modernSearchSection}>
          <Text style={styles.searchSectionTitle}>Search for App User</Text>
          <Text style={styles.searchSectionSubtitle}>Find another user to send money to</Text>
          
          <View style={styles.modernSearchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#6B7280" />
            </View>
            <TextInput
              style={styles.modernSearchInput}
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.modernClearButton}
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          
          {searchQuery.length > 0 && (
            <View style={styles.searchStatusContainer}>
              <Ionicons name="information-circle" size={16} color="#3B82F6" />
              <Text style={styles.modernSearchHelp}>
                {getSearchHelpText()}
              </Text>
            </View>
          )}
        </View>

        {/* Modern Search Results */}
        {isSearching && (
          <View style={styles.modernLoadingSection}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.modernLoadingText}>Searching users...</Text>
            </View>
          </View>
        )}

        {hasSearched && !isSearching && (
          <View style={styles.modernResultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.modernSectionTitle}>
                {searchResults.length > 0 
                  ? `Found ${searchResults.length} user${searchResults.length > 1 ? 's' : ''}`
                  : 'No Users Found'
                }
              </Text>
              {searchResults.length > 0 && (
                <View style={styles.resultsCount}>
                  <Ionicons name="people" size={16} color="#6B7280" />
                  <Text style={styles.resultsCountText}>{searchResults.length}</Text>
                </View>
              )}
            </View>
              
            {searchResults.length > 0 ? (
              <View style={styles.modernResultsList}>
                {searchResults.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.modernUserCard}
                    onPress={() => handleSelectUser(user)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modernUserAvatar}>
                      <Text style={styles.modernUserInitials}>
                        {user.firstName[0]}{user.lastName[0]}
                      </Text>
                    </View>
                    <View style={styles.modernUserInfo}>
                      <Text style={styles.modernUserName}>{user.displayName}</Text>
                      {user.username && (
                        <View style={styles.usernameContainer}>
                          <Ionicons name="at" size={12} color="#3B82F6" />
                          <Text style={styles.modernUserUsername}>{user.username}</Text>
                        </View>
                      )}
                      <View style={styles.memberSinceContainer}>
                        <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.modernUserMemberSince}>
                          Member since {formatMemberSince(user.memberSince)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.modernEmptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="person-remove" size={48} color="#D1D5DB" />
                </View>
                <Text style={styles.modernEmptyTitle}>No Users Found</Text>
                <Text style={styles.modernEmptyText}>
                  Try searching with a different username, email, or phone number
                </Text>
              </View>
            )}
            </View>
          )}

        {/* Modern Search Tips */}
        {!hasSearched && searchQuery.length === 0 && (
          <View style={styles.modernTipsSection}>
            <Text style={styles.modernSectionTitle}>Search Tips</Text>
            <Text style={styles.tipsSubtitle}>Here&apos;s how you can find users</Text>
            
            <View style={styles.modernTipsList}>
              <View style={styles.modernTipItem}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name="at" size={20} color="#3B82F6" />
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.modernTipTitle}>Username Search</Text>
                  <Text style={styles.modernTipText}>Use @username for exact username search</Text>
                </View>
              </View>
              
              <View style={styles.modernTipItem}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name="mail" size={20} color="#10B981" />
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.modernTipTitle}>Email Search</Text>
                  <Text style={styles.modernTipText}>Enter full email address to find users</Text>
                </View>
              </View>
              
              <View style={styles.modernTipItem}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name="call" size={20} color="#F59E0B" />
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.modernTipTitle}>Phone Search</Text>
                  <Text style={styles.modernTipText}>Use phone number with country code</Text>
                </View>
              </View>
              
              <View style={styles.modernTipItem}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name="person" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.modernTipTitle}>Name Search</Text>
                  <Text style={styles.modernTipText}>Search by first or last name</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🎨 Base Layout
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 🌟 Modern Header
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  headerAction: {
    width: 44,
    height: 44,
  },

  // 📱 Modern Scroll
  modernScrollView: {
    flex: 1,
  },
  modernScrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  // 🔍 Modern Search Section
  modernSearchSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  searchSectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 20,
  },
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  searchIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  modernClearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  modernSearchHelp: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    flex: 1,
  },
  // 🔄 Modern Loading Section
  modernLoadingSection: {
    padding: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  modernLoadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // 📊 Modern Results Section
  modernResultsSection: {
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  resultsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  resultsCountText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },

  // 👤 Modern User Cards
  modernResultsList: {
    gap: 12,
  },
  modernUserCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  modernUserAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernUserInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  modernUserInfo: {
    flex: 1,
  },
  modernUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  modernUserUsername: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  memberSinceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modernUserMemberSince: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // 🎭 Modern Empty State
  modernEmptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIconContainer: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  modernEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  modernEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // 💡 Modern Tips Section
  modernTipsSection: {
    padding: 16,
  },
  tipsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 20,
  },
  modernTipsList: {
    gap: 16,
  },
  modernTipItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  modernTipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  modernTipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 18,
  },
});