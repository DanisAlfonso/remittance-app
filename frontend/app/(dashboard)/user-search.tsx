import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.navigationHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find App User</Text>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Send {currency || 'EUR'}</Text>
            <Text style={styles.subtitle}>Search for another app user to send money to</Text>
          </View>

          {/* Search Input */}
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <Feather name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                >
                  <Feather name="x" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            
            {searchQuery.length > 0 && (
              <Text style={styles.searchHelp}>
                {getSearchHelpText()}
              </Text>
            )}
          </View>

          {/* Search Results */}
          {isSearching && (
            <View style={styles.loadingSection}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {hasSearched && !isSearching && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>
                {searchResults.length > 0 
                  ? `${searchResults.length} user${searchResults.length > 1 ? 's' : ''} found`
                  : 'No users found'
                }
              </Text>
              
              {searchResults.length > 0 ? (
                <View style={styles.resultsList}>
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userCard}
                      onPress={() => handleSelectUser(user)}
                    >
                      <View style={styles.userAvatar}>
                        <Text style={styles.userInitials}>
                          {user.firstName[0]}{user.lastName[0]}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.displayName}</Text>
                        {user.username && (
                          <Text style={styles.userUsername}>@{user.username}</Text>
                        )}
                        <Text style={styles.userMemberSince}>
                          Member since {formatMemberSince(user.memberSince)}
                        </Text>
                      </View>
                      <Feather name="arrow-right" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="user-x" size={48} color="#9ca3af" style={styles.emptyIcon} />
                  <Text style={styles.emptyTitle}>No users found</Text>
                  <Text style={styles.emptyText}>
                    Try searching with a different username, email, or phone number
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Search Tips */}
          {!hasSearched && searchQuery.length === 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.sectionTitle}>Search tips</Text>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <Feather name="at-sign" size={16} color="#6366f1" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Use @username for exact username search</Text>
                </View>
                <View style={styles.tipItem}>
                  <Feather name="mail" size={16} color="#6366f1" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Enter email address for email search</Text>
                </View>
                <View style={styles.tipItem}>
                  <Feather name="phone" size={16} color="#6366f1" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Use phone number for phone search</Text>
                </View>
                <View style={styles.tipItem}>
                  <Feather name="user" size={16} color="#6366f1" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Search by first or last name</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafb',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1d29',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1d29',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchHelp: {
    fontSize: 14,
    color: '#6366f1',
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  resultsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    paddingHorizontal: 4,
    letterSpacing: -0.3,
  },
  resultsList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3730a3',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 4,
  },
  userMemberSince: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  tipsList: {
    gap: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  tipIcon: {
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
});