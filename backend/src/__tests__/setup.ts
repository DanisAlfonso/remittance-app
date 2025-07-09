import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'prisma+postgres://localhost:51213/?api_key=test-db-key';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Add a dummy test to prevent "no tests" error
describe('Test Setup', () => {
  it('should setup test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});