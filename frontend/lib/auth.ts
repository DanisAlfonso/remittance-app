import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState, LoginCredentials, RegisterData, AuthResponse, ApiError, User } from '../types';
import { apiClient } from './api';
import { validateBiometricUser } from './biometric';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Secure storage adapter for Zustand
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Failed to remove auth data:', error);
    }
  },
};

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  clearError: () => void;
  validateSession: () => Promise<boolean>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post<AuthResponse>('/users/current/logins/direct', credentials);
          
          // Check if this is a different user than previously stored
          const storedUserString = await SecureStore.getItemAsync(USER_KEY);
          if (storedUserString) {
            const storedUser = JSON.parse(storedUserString);
            if (storedUser.id !== response.user.id) {
              // Different user - clear wallet data
              await SecureStore.deleteItemAsync('wallet-storage');
            }
          }
          
          // Validate biometric data belongs to current user (clear if different user)
          await validateBiometricUser(response.user.email);
          
          await SecureStore.setItemAsync(TOKEN_KEY, response.token);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const apiError = error as ApiError;
          set({
            isLoading: false,
            error: apiError.message || 'Login failed',
          });
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post<AuthResponse>('/users', userData);

          // Clear any existing wallet data for new registration
          await SecureStore.deleteItemAsync('wallet-storage');
          
          await SecureStore.setItemAsync(TOKEN_KEY, response.token);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const apiError = error as ApiError;
          set({
            isLoading: false,
            error: apiError.message || 'Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_KEY);
          // Clear wallet data on logout
          await SecureStore.deleteItemAsync('wallet-storage');
          // NOTE: We do NOT clear biometric data on logout
          // Biometric settings should persist per user across sessions
        } catch (error) {
          console.error('Error clearing stored auth:', error);
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      loadStoredAuth: async () => {
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          const userString = await SecureStore.getItemAsync(USER_KEY);

          if (token && userString) {
            const user = JSON.parse(userString);
            
            // Check if wallet data belongs to a different user
            const walletStorageString = await SecureStore.getItemAsync('wallet-storage');
            if (walletStorageString) {
              try {
                const walletData = JSON.parse(walletStorageString);
                if (walletData.state && walletData.state.userId && walletData.state.userId !== user.id) {
                  // Different user - clear wallet data
                  console.log('Clearing wallet data for user change:', walletData.state.userId, '->', user.id);
                  await SecureStore.deleteItemAsync('wallet-storage');
                }
              } catch (walletError) {
                console.error('Error parsing wallet data:', walletError);
                // Clear corrupted wallet data
                await SecureStore.deleteItemAsync('wallet-storage');
              }
            }
            
            // Validate token is still valid
            const isValid = await get().validateSession();
            
            if (isValid) {
              set({
                user,
                token,
                isAuthenticated: true,
              });
            } else {
              await get().logout();
            }
          }
        } catch (error) {
          console.error('Error loading stored auth:', error);
          await get().logout();
        }
      },

      validateSession: async (): Promise<boolean> => {
        try {
          const token = get().token;
          if (!token) {
            return false;
          }

          // Call a protected endpoint to validate token
          await apiClient.get('/users/current', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          return true;
        } catch {
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      updateUser: async (userData: Partial<User>) => {
        set({ isLoading: true, error: null });
        
        try {
          // TODO: Implement API call to update user profile
          // const response = await apiClient.put('/auth/profile', userData);
          
          // Merge with current user data and update secure storage
          const currentUser = get().user;
          if (!currentUser) {
            throw new Error('No user logged in');
          }
          const updatedUser = { ...currentUser, ...userData };
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const apiError = error as ApiError;
          set({
            isLoading: false,
            error: apiError.message || 'Update failed',
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);