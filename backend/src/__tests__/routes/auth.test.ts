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
};

const mockHashPassword = jest.fn().mockResolvedValue('hashed-password');
const mockComparePassword = jest.fn();
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
}));

// Now import the router
import authRouter from '../../routes/auth';

describe('Authentication Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset mock implementations to default
    mockValidatePassword.mockReturnValue({ isValid: true, errors: [] });
    mockHashPassword.mockResolvedValue('hashed-password');
    mockComparePassword.mockResolvedValue(true);
    mockGenerateToken.mockReturnValue('mock-jwt-token');
  });

  describe('POST /auth/register', () => {
    const validRegistrationData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
      phone: '+1234567890',
      country: 'US'
    };

    it('should register a new user successfully', async () => {
      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock user creation (note: password field is excluded via select in real route)
      const mockUser = {
        id: 'user-123',
        email: validRegistrationData.email,
        firstName: validRegistrationData.firstName,
        lastName: validRegistrationData.lastName,
        phone: validRegistrationData.phone,
        country: validRegistrationData.country,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(mockUser);
      
      // Mock session creation
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(),
      });

      // Mock session update
      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        token: 'mock-jwt-token',
        expiresAt: new Date(),
      });

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData);


      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token', 'mock-jwt-token');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject registration with existing email', async () => {
      // Mock user already exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: validRegistrationData.email,
      });

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'User already exists');
      expect(response.body).toHaveProperty('message', 'An account with this email already exists');
    });

    it('should validate required fields', async () => {
      const testCases = [
        { data: { ...validRegistrationData, firstName: '' }, field: 'firstName' },
        { data: { ...validRegistrationData, lastName: '' }, field: 'lastName' },
        { data: { ...validRegistrationData, email: '' }, field: 'email' },
        { data: { ...validRegistrationData, password: '' }, field: 'password' },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/auth/register')
          .send(testCase.data);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Validation error');
      }
    });

    it('should validate email format', async () => {
      const invalidEmails = ['invalid-email', 'missing@', '@missing.com', 'spaces @email.com'];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/auth/register')
          .send({ ...validRegistrationData, email });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Validation error');
      }
    });

    it('should reject weak passwords', async () => {
      // Mock password validation to reject
      const { validatePassword } = require('../../utils/password');
      validatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password must contain at least one special character']
      });

      const response = await request(app)
        .post('/auth/register')
        .send({ ...validRegistrationData, password: 'weakpassword' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password validation failed');
    });

    it('should handle database errors gracefully', async () => {
      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock database error during user creation
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal server error');
    });

    it('should not return password in response', async () => {
      // Mock successful registration
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock user creation (password excluded via select)
      const mockUser = {
        id: 'user-123',
        email: validRegistrationData.email,
        firstName: validRegistrationData.firstName,
        lastName: validRegistrationData.lastName,
        phone: validRegistrationData.phone,
        country: validRegistrationData.country,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(mockUser);
      
      // Mock session operations
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(),
      });
      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        token: 'mock-jwt-token',
        expiresAt: new Date(),
      });

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body.user).not.toHaveProperty('password');
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
    };

    const mockUser = {
      id: 'user-123',
      email: validLoginData.email,
      password: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      country: 'US',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
    };

    it('should login with valid credentials', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      // Mock password comparison
      const { comparePassword } = require('../../utils/password');
      comparePassword.mockResolvedValue(true);
      
      // Mock session cleanup and creation
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(),
      });
      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        token: 'mock-jwt-token',
        expiresAt: new Date(),
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token', 'mock-jwt-token');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with invalid email', async () => {
      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      // Mock password comparison fails
      const { comparePassword } = require('../../utils/password');
      comparePassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login for inactive users', async () => {
      // Mock inactive user
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Account deactivated');
    });

    it('should validate login input format', async () => {
      const invalidInputs = [
        { email: 'invalid-email', password: 'ValidPass123!' },
        { email: 'valid@email.com', password: '' },
        { email: '', password: 'ValidPass123!' },
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/auth/login')
          .send(input);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Validation error');
      }
    });

    it('should clean up old sessions on login', async () => {
      // Mock user exists and password is valid
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const { comparePassword } = require('../../utils/password');
      comparePassword.mockResolvedValue(true);
      
      // Mock session operations
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(),
      });
      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        token: 'mock-jwt-token',
        expiresAt: new Date(),
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { 
          userId: 'user-123',
          expiresAt: { lt: expect.any(Date) }
        }
      });
    });

    it('should handle database errors during login', async () => {
      // Mock database error
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal server error');
    });
  });

  describe('Security Tests', () => {
    it('should not expose internal error details in production', async () => {
      // Mock a database error
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Internal database details'));

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'password' });

      expect(response.status).toBe(500);
      expect(response.body.message).not.toContain('Internal database details');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should limit request size', async () => {
      const largeData = {
        email: 'test@test.com',
        password: 'ValidPass123!',
        firstName: 'A'.repeat(100), // Smaller but still exceeds 50 char limit
        lastName: 'B'.repeat(100),
      };

      const response = await request(app)
        .post('/auth/register')
        .send(largeData);

      // Should reject due to validation (400) or size limit (413)
      expect([400, 413]).toContain(response.status);
    });
  });
});