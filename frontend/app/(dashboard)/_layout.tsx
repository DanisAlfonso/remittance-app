import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../lib/auth';
import BottomNavigation from '../../components/ui/BottomNavigation';

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
    <View style={styles.container}>
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
        <Stack.Screen name="send-money" />
        <Stack.Screen name="add-recipient" />
        <Stack.Screen name="account-details" />
        <Stack.Screen name="create-account" />
        <Stack.Screen name="transfer-amount" />
        <Stack.Screen name="transfer-success" />
      </Stack>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});