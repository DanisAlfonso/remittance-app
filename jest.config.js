module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  projects: [
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/backend/**/*.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/backend/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/src/$1',
      },
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/frontend/**/*.test.{ts,tsx}'],
      preset: 'jest-expo',
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/src/$1',
      },
    },
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/shared/**/*.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/shared/src/$1',
      },
    },
  ],
  collectCoverageFrom: [
    'backend/src/**/*.{ts,tsx}',
    'frontend/src/**/*.{ts,tsx}',
    'shared/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};