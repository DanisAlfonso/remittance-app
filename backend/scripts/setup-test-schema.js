// Setup Test Database Schema
// This script initializes the test database with the required schema

const { PrismaClient } = require('../src/generated/prisma');

async function setupTestSchema() {
  const testDb = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });

  try {
    console.log('🔧 Connecting to test database...');
    await testDb.$connect();
    
    console.log('✅ Test database connected successfully');
    console.log('🗃️  Test database is ready for integration tests');
    
    // The schema should already be pushed via Prisma Dev
    // This script just verifies connectivity
    
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    process.exit(1);
  } finally {
    await testDb.$disconnect();
  }
}

// Load test environment
require('dotenv').config({ path: '.env.test' });

setupTestSchema();