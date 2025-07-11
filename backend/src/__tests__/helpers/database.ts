import { PrismaClient } from '../../generated/prisma';

// Test database instance - uses dedicated test database instance
// This is completely isolated from development database
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

/**
 * Setup test database - ensure clean state
 */
export async function setupTestDatabase() {
  // WARNING: This deletes ALL data in the database
  // In production, this should only run against a dedicated test database
  
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('setupTestDatabase should only run in test environment');
  }
  
  // Clean up all data in reverse order of dependencies
  await testPrisma.transaction.deleteMany({});
  await testPrisma.wiseAccount.deleteMany({});
  await testPrisma.session.deleteMany({});
  await testPrisma.user.deleteMany({});
  
  console.log('⚠️  Test database cleaned - all data deleted');
}

/**
 * Cleanup test database - remove all test data
 */
export async function cleanupTestDatabase() {
  try {
    // Clean up all data in reverse order of dependencies
    await testPrisma.transaction.deleteMany({});
    await testPrisma.wiseAccount.deleteMany({});
    await testPrisma.session.deleteMany({});
    await testPrisma.user.deleteMany({});
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
}

/**
 * Close database connection
 */
export async function closeTestDatabase() {
  await testPrisma.$disconnect();
}