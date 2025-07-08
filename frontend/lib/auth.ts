import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState, LoginCredentials, RegisterData, AuthResponse, ApiError } from '../types';
import { apiClient } from './api';

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
          const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
          
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
          const response = await apiClient.post<AuthResponse>('/auth/register', userData);

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
          if (!token) return false;

          // Call a protected endpoint to validate token
          await apiClient.get('/auth/validate', {
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