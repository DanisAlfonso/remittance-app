import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function CreateAccountScreen() {
  // Redirect to the new multi-currency account creation screen
  useEffect(() => {
    router.replace('/(dashboard)/create-currency-account');
  }, []);

  return null; // Component will redirect immediately
}