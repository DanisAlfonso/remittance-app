import { connectDatabase, disconnectDatabase } from './config/database';

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    await connectDatabase();
    console.log('✅ Database connection test passed');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

testDatabaseConnection();