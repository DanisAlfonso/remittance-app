import { hashPassword, comparePassword, validatePassword } from '../../../utils/password';

describe('Password Utilities', () => {
  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'TestPassword123!',
        'MySecure@Pass1',
        'Complex#Password9',
        'Bank1ng$App2024',
        'Fin@nce123App',
      ];

      validPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject passwords shorter than 8 characters', () => {
      const shortPasswords = ['Test1!', 'Ab1@', 'Short7#'];

      shortPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });
    });

    it('should reject passwords without uppercase letters', () => {
      const noUppercasePasswords = ['testpassword123!', 'lowercase@123', 'no_upper1#'];

      noUppercasePasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });
    });

    it('should reject passwords without lowercase letters', () => {
      const noLowercasePasswords = ['TESTPASSWORD123!', 'UPPERCASE@123', 'NO_LOWER1#'];

      noLowercasePasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });
    });

    it('should reject passwords without numbers', () => {
      const noNumberPasswords = ['TestPassword!', 'NoNumbers@Here', 'Letters#Only'];

      noNumberPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });
    });

    it('should reject passwords without special characters', () => {
      const noSpecialPasswords = ['TestPassword123', 'NoSpecials123', 'Letters123Only'];

      noSpecialPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character');
      });
    });

    it('should reject passwords longer than 128 characters', () => {
      const longPassword = 'A'.repeat(120) + '1@' + 'b'.repeat(10); // 133 characters
      const result = validatePassword(longPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be no more than 128 characters long');
    });

    it('should return multiple errors for passwords with multiple issues', () => {
      const badPassword = 'bad'; // Too short, no uppercase, no numbers, no special chars
      const result = validatePassword(badPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle empty or null passwords', () => {
      const emptyResult = validatePassword('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.errors).toContain('Password is required');

      const nullResult = validatePassword(null as any);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('Password is required');
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty password (though not recommended)', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isMatch = await comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      
      const isMatch = await comparePassword(wrongPassword, hash);
      expect(isMatch).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isMatch = await comparePassword('', hash);
      expect(isMatch).toBe(false);
    });

    it('should handle invalid hash gracefully', async () => {
      const password = 'TestPassword123!';
      const invalidHash = 'invalid-hash';
      
      const result = await comparePassword(password, invalidHash);
      expect(result).toBe(false);
    });
  });

  describe('Password Security Requirements', () => {
    it('should enforce fintech-grade password requirements', () => {
      // Test various realistic fintech password scenarios
      const testCases = [
        { password: 'Banking123!', expected: true, desc: 'Standard banking password' },
        { password: 'Fintech@2024', expected: true, desc: 'Fintech app password' },
        { password: 'MyWallet$123', expected: true, desc: 'Wallet app password' },
        { password: 'password123', expected: false, desc: 'Common weak password' },
        { password: '12345678', expected: false, desc: 'Numeric only' },
        { password: 'PASSWORD', expected: false, desc: 'Uppercase only' },
      ];

      testCases.forEach(({ password, expected, desc }) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(expected);
      });
    });
  });
});