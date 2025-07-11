import { integrationTestDb } from './testDatabase';
import { hashPassword } from '../../../utils/password';
import { generateToken } from '../../../middleware/auth';

export interface IntegrationTestUser {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  country?: string;
}

/**
 * Create a real test user in the test database
 */
export async function createIntegrationTestUser(userData: IntegrationTestUser) {
  const hashedPassword = await hashPassword(userData.password);
  
  const user = await integrationTestDb.user.create({
    data: {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: hashedPassword,
      phone: userData.phone || '+1234567890',
      country: userData.country || 'US',
      isActive: true,
      emailVerified: true,
    },
  });
  
  return user;
}

/**
 * Login an integration test user and return real JWT token
 */
export async function loginIntegrationTestUser(email: string, password: string): Promise<string> {
  // Find the user in test database
  const user = await integrationTestDb.user.findUnique({
    where: { email },
  });
  
  if (!user) {
    throw new Error(`Integration test user with email ${email} not found`);
  }
  
  // Create real session in test database
  const session = await integrationTestDb.session.create({
    data: {
      userId: user.id,
      token: 'temp-token', // Will be updated below
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });
  
  // Generate real JWT token
  const token = generateToken(user.id, user.email, session.id);
  
  // Update session with the real token
  await integrationTestDb.session.update({
    where: { id: session.id },
    data: { token },
  });
  
  return token;
}

/**
 * Create a test account for integration testing
 */
export async function createIntegrationTestAccount(userId: string, currency = 'EUR') {
  return await integrationTestDb.wiseAccount.create({
    data: {
      userId,
      wiseAccountId: Math.floor(Math.random() * 1000000),
      wiseProfileId: Math.floor(Math.random() * 1000000),
      currency,
      country: currency === 'EUR' ? 'DE' : 'US',
      accountType: 'SAVINGS',
      name: `Test ${currency} Account`,
      status: 'ACTIVE',
      iban: currency === 'EUR' ? `DE${Math.floor(Math.random() * 10000000000000000).toString().padStart(16, '0')}` : undefined,
      lastBalance: Math.floor(Math.random() * 10000) + 1000, // Random balance between 1000-11000
      balanceUpdatedAt: new Date(),
    },
  });
}

/**
 * Clean up sessions for an integration test user
 */
export async function cleanupIntegrationUserSessions(userId: string) {
  await integrationTestDb.session.deleteMany({
    where: { userId },
  });
}