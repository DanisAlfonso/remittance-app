import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../lib/auth';
import { apiClient } from '../lib/api';
import ErrorBoundary from '../components/ErrorBoundary';

// Disable LogBox in development for cleaner console output
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

export default function RootLayout() {
  const { loadStoredAuth, token } = useAuthStore();

  useEffect(() => {
    // Load stored authentication on app start
    loadStoredAuth();
  }, []);

  useEffect(() => {
    // Set auth token for API client when it changes
    apiClient.setAuthToken(token);
  }, [token]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" translucent={true} />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}