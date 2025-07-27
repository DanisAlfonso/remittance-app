import { prisma } from '../config/database';

/**
 * Enterprise-grade username generation service
 * Generates unique, user-friendly usernames during registration
 */
export class UsernameGenerator {
  
  /**
   * Generate a unique username based on first and last name
   * Strategy:
   * 1. firstname.lastname (preferred)
   * 2. firstname + numbers (fallback)
   * 3. firstnamelastname (compact fallback)
   * 4. Random alphanumeric (final fallback)
   */
  static async generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
    // Sanitize inputs
    const cleanFirst = this.sanitizeName(firstName);
    const cleanLast = this.sanitizeName(lastName);
    
    if (!cleanFirst || !cleanLast) {
      throw new Error('Invalid names provided for username generation');
    }
    
    // Strategy 1: firstname.lastname (most user-friendly)
    const preferredUsername = `${cleanFirst}.${cleanLast}`;
    if (await this.isUsernameAvailable(preferredUsername)) {
      return preferredUsername;
    }
    
    // Strategy 2: firstname + incremental numbers
    for (let i = 1; i <= 99; i++) {
      const numberedUsername = `${cleanFirst}${i}`;
      if (await this.isUsernameAvailable(numberedUsername)) {
        return numberedUsername;
      }
    }
    
    // Strategy 3: firstnamelastname (compact)
    const compactUsername = `${cleanFirst}${cleanLast}`;
    if (await this.isUsernameAvailable(compactUsername)) {
      return compactUsername;
    }
    
    // Strategy 4: firstnamelastname + numbers
    for (let i = 1; i <= 999; i++) {
      const compactNumbered = `${cleanFirst}${cleanLast}${i}`;
      if (await this.isUsernameAvailable(compactNumbered)) {
        return compactNumbered;
      }
    }
    
    // Strategy 5: Random fallback (highly unlikely to reach this)
    return await this.generateRandomUsername();
  }
  
  /**
   * Sanitize name for username use
   * - Convert to lowercase
   * - Remove special characters
   * - Limit length
   * - Handle international characters
   */
  private static sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remove accents and diacritics
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Keep only alphanumeric characters
      .replace(/[^a-z0-9]/g, '')
      // Limit length for usernames
      .slice(0, 15);
  }
  
  /**
   * Check if username is available (case-insensitive)
   */
  private static async isUsernameAvailable(username: string): Promise<boolean> {
    if (username.length < 2 || username.length > 30) {
      return false;
    }
    
    // Check against reserved usernames
    if (this.isReservedUsername(username)) {
      return false;
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    
    return !existingUser;
  }
  
  /**
   * Generate a random username as final fallback
   */
  private static async generateRandomUsername(): Promise<string> {
    const adjectives = ['swift', 'bright', 'quick', 'smart', 'cool', 'fast', 'wise', 'bold'];
    const nouns = ['user', 'sender', 'trader', 'expert', 'pro', 'star', 'ace', 'ninja'];
    
    for (let attempts = 0; attempts < 50; attempts++) {
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const number = Math.floor(Math.random() * 9999);
      
      const randomUsername = `${adjective}${noun}${number}`;
      
      if (await this.isUsernameAvailable(randomUsername)) {
        return randomUsername;
      }
    }
    
    // Ultimate fallback - timestamp-based
    const timestamp = Date.now().toString().slice(-8);
    return `user${timestamp}`;
  }
  
  /**
   * Reserved usernames that cannot be used
   */
  private static isReservedUsername(username: string): boolean {
    const reserved = [
      // System accounts
      'admin', 'root', 'system', 'api', 'support', 'help',
      'service', 'bot', 'test', 'demo', 'guest', 'anonymous',
      
      // Common web terms
      'www', 'mail', 'ftp', 'localhost', 'webmaster', 'postmaster',
      'hostmaster', 'abuse', 'noreply', 'no-reply', 'security',
      
      // Banking/Finance terms  
      'bank', 'banking', 'transfer', 'payment', 'finance', 'money',
      'wise', 'obp', 'euro', 'currency', 'exchange', 'remittance',
      
      // Offensive/inappropriate
      'null', 'undefined', 'delete', 'remove', 'ban', 'banned',
      
      // Technical terms
      'api', 'webhook', 'callback', 'endpoint', 'debug', 'error',
      'status', 'health', 'ping', 'test', 'staging', 'prod',
    ];
    
    return reserved.includes(username.toLowerCase());
  }
  
  /**
   * Validate username format (for manual username changes)
   */
  static isValidUsername(username: string): boolean {
    if (!username || typeof username !== 'string') {
      return false;
    }
    
    const trimmed = username.trim();
    
    // Length check
    if (trimmed.length < 2 || trimmed.length > 30) {
      return false;
    }
    
    // Format check: alphanumeric, dots, underscores only
    if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
      return false;
    }
    
    // Must start and end with alphanumeric
    if (!/^[a-zA-Z0-9].*[a-zA-Z0-9]$/.test(trimmed)) {
      return false;
    }
    
    // Cannot be reserved
    if (this.isReservedUsername(trimmed)) {
      return false;
    }
    
    return true;
  }
}