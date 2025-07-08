import Constants from 'expo-constants';
import type { AppConfig, Environment } from '../types';

export function getConfig(): AppConfig {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 
                 Constants.expoConfig?.extra?.apiUrl || 
                 'http://192.168.148.129:3000';
                 
  const appName = process.env.EXPO_PUBLIC_APP_NAME || 
                  Constants.expoConfig?.extra?.appName || 
                  'Remittance App';
                  
  const appVersion = process.env.EXPO_PUBLIC_APP_VERSION || 
                     Constants.expoConfig?.extra?.appVersion || 
                     '1.0.0';

  const environment: Environment = (process.env.NODE_ENV as Environment) || 'development';
  const isDev = __DEV__;

  return {
    API_URL: apiUrl,
    APP_NAME: appName,
    APP_VERSION: appVersion,
    IS_DEV: isDev,
    ENVIRONMENT: environment,
  };
}

export const config = getConfig();