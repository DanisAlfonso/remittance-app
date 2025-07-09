import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, JWTPayload } from '../../middleware/auth';

// Mock environment before importing
jest.mock('../../config/environment', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
    JWT_EXPIRES_IN: '24h',
  }
}));

// Constants for testing
const mockJwtSecret = 'test-jwt-secret-key-for-testing-only';
const mockJwtExpiresIn = '24h';

describe('JWT Token Functions', () => {
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockSessionId = 'session-456';

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUserId, mockEmail, mockSessionId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload data', () => {
      const token = generateToken(mockUserId, mockEmail, mockSessionId);
      const decoded = jwt.verify(token, mockJwtSecret) as JWTPayload;
      
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.email).toBe(mockEmail);
      expect(decoded.sessionId).toBe(mockSessionId);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should generate different tokens for different inputs', () => {
      const token1 = generateToken(mockUserId, mockEmail, mockSessionId);
      const token2 = generateToken('user-789', mockEmail, mockSessionId);
      const token3 = generateToken(mockUserId, 'other@example.com', mockSessionId);
      const token4 = generateToken(mockUserId, mockEmail, 'session-789');
      
      expect(token1).not.toBe(token2);
      expect(token1).not.toBe(token3);
      expect(token1).not.toBe(token4);
    });

    it('should set proper expiration time', () => {
      const beforeGeneration = Date.now();
      const token = generateToken(mockUserId, mockEmail, mockSessionId);
      const afterGeneration = Date.now();
      
      const decoded = jwt.verify(token, mockJwtSecret) as JWTPayload;
      
      // Token should be issued within the last few seconds
      expect(decoded.iat * 1000).toBeGreaterThanOrEqual(beforeGeneration - 1000);
      expect(decoded.iat * 1000).toBeLessThanOrEqual(afterGeneration + 1000);
      
      // Token should expire in 24 hours (approximately)
      const expectedExpiration = decoded.iat + (24 * 60 * 60); // 24 hours in seconds
      expect(decoded.exp).toBeCloseTo(expectedExpiration, -2); // Allow 100 second variance
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockUserId, mockEmail, mockSessionId);
      const payload = verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.sessionId).toBe(mockSessionId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      // Generate token with very short expiration
      const shortLivedToken = jwt.sign(
        { userId: mockUserId, email: mockEmail, sessionId: mockSessionId },
        mockJwtSecret,
        { expiresIn: '1ms' }
      );
      
      // Wait a bit to ensure expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => verifyToken(shortLivedToken)).toThrow('Invalid token');
          resolve(undefined);
        }, 10);
      });
    });

    it('should throw error for token signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign(
        { userId: mockUserId, email: mockEmail, sessionId: mockSessionId },
        'wrong-secret',
        { expiresIn: mockJwtExpiresIn }
      );
      
      expect(() => verifyToken(wrongSecretToken)).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      const malformedTokens = [
        '',
        'just-a-string',
        'part1.part2', // Missing third part
        'not.jwt.token',
      ];
      
      malformedTokens.forEach(token => {
        expect(() => verifyToken(token)).toThrow('Invalid token');
      });
    });

    it('should handle token without required claims', () => {
      // Token missing required fields
      const incompleteToken = jwt.sign(
        { userId: mockUserId }, // Missing email and sessionId
        mockJwtSecret,
        { expiresIn: mockJwtExpiresIn }
      );
      
      const payload = verifyToken(incompleteToken);
      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBeUndefined();
      expect(payload.sessionId).toBeUndefined();
    });
  });

  describe('Token Lifecycle', () => {
    it('should create and verify token successfully', () => {
      // Full lifecycle test
      const originalData = {
        userId: 'user-lifecycle-test',
        email: 'lifecycle@test.com',
        sessionId: 'session-lifecycle-123'
      };
      
      // Generate token
      const token = generateToken(originalData.userId, originalData.email, originalData.sessionId);
      
      // Verify token
      const verifiedPayload = verifyToken(token);
      
      // Check all data matches
      expect(verifiedPayload.userId).toBe(originalData.userId);
      expect(verifiedPayload.email).toBe(originalData.email);
      expect(verifiedPayload.sessionId).toBe(originalData.sessionId);
    });

    it('should handle special characters in data', () => {
      const specialData = {
        userId: 'user-åäö-123',
        email: 'test+tag@domain.co.uk',
        sessionId: 'session-#$%-789'
      };
      
      const token = generateToken(specialData.userId, specialData.email, specialData.sessionId);
      const payload = verifyToken(token);
      
      expect(payload.userId).toBe(specialData.userId);
      expect(payload.email).toBe(specialData.email);
      expect(payload.sessionId).toBe(specialData.sessionId);
    });
  });

  describe('Security Considerations', () => {
    it('should generate tokens that cannot be tampered with', () => {
      const token = generateToken(mockUserId, mockEmail, mockSessionId);
      
      // Try to tamper with token by changing a character
      const tamperedToken = token.slice(0, -1) + 'X';
      
      expect(() => verifyToken(tamperedToken)).toThrow('Invalid token');
    });

    it('should not leak sensitive information in token payload', () => {
      const token = generateToken(mockUserId, mockEmail, mockSessionId);
      const [header, payload, signature] = token.split('.');
      
      // Decode payload (but don't verify signature)
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      // Should only contain expected non-sensitive fields
      const allowedFields = ['userId', 'email', 'sessionId', 'iat', 'exp'];
      const actualFields = Object.keys(decodedPayload);
      
      actualFields.forEach(field => {
        expect(allowedFields).toContain(field);
      });
    });
  });
});