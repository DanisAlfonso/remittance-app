import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';

if (__DEV__) {
  // Completely disable LogBox and red screen in development
  LogBox.ignoreAllLogs(true);
  
  // Override console.error to prevent red screen
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Log to terminal but don't show red screen
    originalConsoleError.apply(console, args);
  };
  
  // Override the default error handler to log to console only
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('=== React Native Error (Console Only) ===');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    console.log('Fatal:', isFatal);
    console.log('=========================================');
    
    // Do NOT call the original handler to prevent red screen
    if (isFatal) {
      console.log('Fatal error occurred, but app continuing...');
    }
  });
}

export default function App() {
  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}
