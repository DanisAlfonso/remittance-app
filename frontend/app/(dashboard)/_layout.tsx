import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../lib/auth';

export default function DashboardLayout() {
  const { isAuthenticated, token, validateSession } = useAuthStore();

  useEffect(() => {
    // Validate session on dashboard access
    if (isAuthenticated && token) {
      validateSession();
    }
  }, [isAuthenticated, token]);

  // Redirect to login if not authenticated
  if (!isAuthenticated || !token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f8f9fa' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="beneficiaries" />
    </Stack>
  );
}