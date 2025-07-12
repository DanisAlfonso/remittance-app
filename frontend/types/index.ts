export * from './auth';

// Global app types
export type RootStackParamList = {
  '(auth)': undefined;
  '(dashboard)': undefined;
};

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  API_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  IS_DEV: boolean;
  ENVIRONMENT: Environment;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}