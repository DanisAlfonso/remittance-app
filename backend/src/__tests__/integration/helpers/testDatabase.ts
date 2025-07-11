import { PrismaClient } from '../../../generated/prisma';

// Integration test database - uses real test database for realistic testing
export const integrationTestDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

/**
 * Setup integration test database - ensure clean state
 * This actually connects to and cleans a real database
 */
export async function setupIntegrationTestDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('setupIntegrationTestDatabase should only run in test environment');
  }

  try {
    // Connect to test database
    await integrationTestDb.$connect();
    
    // Clean up all data in reverse order of dependencies
    await integrationTestDb.wiseTransaction.deleteMany({});
    await integrationTestDb.wiseAccount.deleteMany({});
    await integrationTestDb.session.deleteMany({});
    await integrationTestDb.user.deleteMany({});
    
    console.log('🗃️  Integration test database cleaned');
  } catch (error) {
    console.error('Failed to setup integration test database:', error);
    throw error;
  }
}

/**
 * Cleanup integration test database - remove all test data
 */
export async function cleanupIntegrationTestDatabase() {
  try {
    // Clean up all data in reverse order of dependencies
    await integrationTestDb.wiseTransaction.deleteMany({});
    await integrationTestDb.wiseAccount.deleteMany({});
    await integrationTestDb.session.deleteMany({});
    await integrationTestDb.user.deleteMany({});
  } catch (error) {
    console.error('Error cleaning up integration test database:', error);
  }
}

/**
 * Close integration test database connection
 */
export async function closeIntegrationTestDatabase() {
  await integrationTestDb.$disconnect();
}