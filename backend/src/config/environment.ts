import { config } from 'dotenv';

config();

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  WISE_BASE_URL: string;
  WISE_CLIENT_ID: string;
  WISE_CLIENT_SECRET: string;
  WISE_REDIRECT_URI: string;
}

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

function validateEnvironment(): EnvironmentConfig {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8081',
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    WISE_BASE_URL: process.env.WISE_BASE_URL || 'https://api.sandbox.transferwise.tech',
    WISE_CLIENT_ID: process.env.WISE_CLIENT_ID || 'sandbox-client-id',
    WISE_CLIENT_SECRET: process.env.WISE_CLIENT_SECRET || 'sandbox-client-secret',
    WISE_REDIRECT_URI: process.env.WISE_REDIRECT_URI || 'my-app://callback',
  };
}

export const env = validateEnvironment();
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';