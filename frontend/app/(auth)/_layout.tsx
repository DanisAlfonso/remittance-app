import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../lib/auth';

export default function AuthLayout() {
  const { isAuthenticated, token } = useAuthStore();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated && token) {
    return <Redirect href="/(dashboard)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}