import Constants from 'expo-constants';

interface EnvironmentConfig {
  API_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  IS_DEV: boolean;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';
  const appName = process.env.EXPO_PUBLIC_APP_NAME || Constants.expoConfig?.extra?.appName || 'Remittance App';
  const appVersion = process.env.EXPO_PUBLIC_APP_VERSION || Constants.expoConfig?.extra?.appVersion || '1.0.0';
  const isDev = __DEV__;

  return {
    API_URL: apiUrl,
    APP_NAME: appName,
    APP_VERSION: appVersion,
    IS_DEV: isDev,
  };
};

export const env = getEnvironmentConfig();

export default env;