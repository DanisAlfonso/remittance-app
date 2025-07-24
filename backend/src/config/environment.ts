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
  // Removed legacy service configuration - now using pure banking APIs
  // OBP-API configuration
  OBP_API_BASE_URL: string;
  OBP_CONSUMER_KEY: string;
  OBP_CONSUMER_SECRET: string;
  OBP_USERNAME: string;
  OBP_PASSWORD: string;
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
    // Legacy service configuration removed - using pure banking APIs
    // OBP-API defaults (using the values from our successful OBP-API setup)
    OBP_API_BASE_URL: process.env.OBP_API_BASE_URL || 'http://127.0.0.1:8080',
    OBP_CONSUMER_KEY: process.env.OBP_CONSUMER_KEY || 'vttcad5o5fas3tmuifj5stclbuei4letdtstk4zu',
    OBP_CONSUMER_SECRET: process.env.OBP_CONSUMER_SECRET || 'i1a1qsi0sy3lux4xjhmfg4n1y1besylzvvplkl0x',
    OBP_USERNAME: process.env.OBP_USERNAME || 'bootstrap',
    OBP_PASSWORD: process.env.OBP_PASSWORD || 'BootstrapPass123!',
  };
}

export const env = validateEnvironment();
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';