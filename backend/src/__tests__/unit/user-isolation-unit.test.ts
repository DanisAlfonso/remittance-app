import request from 'supertest';
import express from 'express';

// Create mock modules BEFORE importing the modules that use them
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  session: {
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  wiseAccount: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  wiseTransaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockHashPassword = jest.fn().mockResolvedValue('hashed-password');
const mockComparePassword = jest.fn().mockResolvedValue(true);
const mockValidatePassword = jest.fn().mockReturnValue({ isValid: true, errors: [] });
const mockGenerateToken = jest.fn().mockReturnValue('mock-jwt-token');

// Mock database
jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

// Mock password utilities
jest.mock('../../utils/password', () => ({
  hashPassword: mockHashPassword,
  comparePassword: mockComparePassword,
  validatePassword: mockValidatePassword,
}));

// Mock JWT
jest.mock('../../middleware/auth', () => ({
  generateToken: mockGenerateToken,
  verifyToken: jest.fn().mockReturnValue({
    userId: 'test-user-id',
    email: 'test@example.com',
    sessionId: 'test-session',
  }),
  authenticateToken: jest.fn((req, res, next) => {
    req.user = {
      id: req.headers['x-user-id'] || 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
    };
    next();
  }),
}));

// Now import the routers
import authRouter from '../../routes/auth';
import wiseRouter from '../../routes/wise';

describe('User Data Isolation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/wise', wiseRouter);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should isolate account data between different users', async () => {
    // Mock different accounts for different users
    const userAId = 'user-a-123';
    const userBId = 'user-b-456';
    
    const accountA = {
      id: 'account-a-123',
      userId: userAId,
      currency: 'EUR',
      name: 'User A Account',
      lastBalance: 1234.56,
      status: 'ACTIVE',
    };
    
    const accountB = {
      id: 'account-b-456', 
      userId: userBId,
      currency: 'EUR',
      name: 'User B Account',
      lastBalance: 7890.12,
      status: 'ACTIVE',
    };

    // Mock findMany to return user-specific accounts
    mockPrisma.wiseAccount.findMany.mockImplementation(({ where }) => {
      if (where?.userId === userAId) {
        return Promise.resolve([accountA]);
      } else if (where?.userId === userBId) {
        return Promise.resolve([accountB]);
      }
      return Promise.resolve([]);
    });

    // Mock findFirst for user isolation
    mockPrisma.wiseAccount.findFirst.mockImplementation(({ where }) => {
      if (where?.userId === userAId && where?.id === accountA.id) {
        return Promise.resolve(accountA);
      } else if (where?.userId === userBId && where?.id === accountB.id) {
        return Promise.resolve(accountB);
      }
      // Critical: Return null if user tries to access another user's account
      return Promise.resolve(null);
    });

    // User A requests their accounts
    const userAAccountsResponse = await request(app)
      .get('/api/v1/wise/accounts')
      .set('x-user-id', userAId)
      .expect(200);

    expect(userAAccountsResponse.body.accounts).toHaveLength(1);
    expect(userAAccountsResponse.body.accounts[0].id).toBe(accountA.id);
    expect(userAAccountsResponse.body.accounts[0].lastBalance).toBe(accountA.lastBalance);

    // User B requests their accounts
    const userBAccountsResponse = await request(app)
      .get('/api/v1/wise/accounts')
      .set('x-user-id', userBId)
      .expect(200);

    expect(userBAccountsResponse.body.accounts).toHaveLength(1);
    expect(userBAccountsResponse.body.accounts[0].id).toBe(accountB.id);
    expect(userBAccountsResponse.body.accounts[0].lastBalance).toBe(accountB.lastBalance);

    // Critical security test: User A cannot access User B's account balance
    await request(app)
      .get(`/api/v1/wise/accounts/${accountB.id}/balance`)
      .set('x-user-id', userAId)
      .expect(404); // Should not find account

    // Critical security test: User B cannot access User A's account balance
    await request(app)
      .get(`/api/v1/wise/accounts/${accountA.id}/balance`)
      .set('x-user-id', userBId)
      .expect(404); // Should not find account
  });

  it('should prevent balance leakage between user sessions', async () => {
    // This test simulates the exact bug described by the user
    const userAId = 'user-a-789';
    const userBId = 'user-b-101';
    
    const accountA = {
      id: 'account-a-789',
      userId: userAId,
      currency: 'EUR',
      name: 'Account A',
      lastBalance: 434.27, // The exact balance from user's bug report
      status: 'ACTIVE',
    };
    
    const accountB = {
      id: 'account-b-101',
      userId: userBId,
      currency: 'EUR', 
      name: 'Account B',
      lastBalance: 1246.25, // The exact balance from user's bug report
      status: 'ACTIVE',
    };

    // Mock strict user isolation
    mockPrisma.wiseAccount.findMany.mockImplementation(({ where }) => {
      if (where?.userId === userAId) {
        return Promise.resolve([accountA]);
      } else if (where?.userId === userBId) {
        return Promise.resolve([accountB]);
      }
      return Promise.resolve([]);
    });

    // User A session - should always see 434.27
    const userASession1 = await request(app)
      .get('/api/v1/wise/accounts')
      .set('x-user-id', userAId)
      .expect(200);

    expect(userASession1.body.accounts[0].lastBalance).toBe(434.27);

    // User B session - should always see 1246.25
    const userBSession = await request(app)
      .get('/api/v1/wise/accounts')
      .set('x-user-id', userBId)
      .expect(200);

    expect(userBSession.body.accounts[0].lastBalance).toBe(1246.25);

    // User A logs back in - should still see 434.27, NOT 1246.25
    const userASession2 = await request(app)
      .get('/api/v1/wise/accounts')
      .set('x-user-id', userAId)
      .expect(200);

    expect(userASession2.body.accounts[0].lastBalance).toBe(434.27);
    expect(userASession2.body.accounts[0].lastBalance).not.toBe(1246.25);
    
    // Verify the critical issue: balances should never mix
    expect(userASession1.body.accounts[0].lastBalance).toBe(userASession2.body.accounts[0].lastBalance);
  });
});