import { testPrisma } from './database';
import { hashPassword } from '../../utils/password';
import { generateToken } from '../../middleware/auth';

export interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  country?: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(userData: TestUser) {
  const hashedPassword = await hashPassword(userData.password);
  
  const user = await testPrisma.user.create({
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
 * Login a test user and return JWT token
 */
export async function loginTestUser(email: string, password: string): Promise<string> {
  // Find the user
  const user = await testPrisma.user.findUnique({
    where: { email },
  });
  
  if (!user) {
    throw new Error(`Test user with email ${email} not found`);
  }
  
  // Create session with temporary token
  const session = await testPrisma.session.create({
    data: {
      userId: user.id,
      token: 'temp-token', // Temporary token, will be updated below
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });
  
  // Generate JWT token
  const token = generateToken(user.id, user.email, session.id);
  
  // Update session with the real token
  await testPrisma.session.update({
    where: { id: session.id },
    data: { token },
  });
  
  return token;
}

/**
 * Clean up sessions for a user
 */
export async function cleanupUserSessions(userId: string) {
  await testPrisma.session.deleteMany({
    where: { userId },
  });
}