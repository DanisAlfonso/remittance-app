import { Router, Request, Response, RequestHandler } from 'express';
import { prisma } from '../config/database';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';
import { masterAccountBanking } from '../services/master-account-banking';
import { UserSearchService } from '../services/userSearch';
import { UsernameGenerator } from '../utils/usernameGenerator';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().optional(),
  country: z.string().optional(),
  preferredCurrencies: z.array(z.enum(['EUR', 'HNL'])).optional().default(['EUR']),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const searchQuerySchema = z.object({
  query: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).max(20).optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['relevance', 'recent', 'alphabetical']).default('relevance'),
}).refine(
  (data) => data.query || data.email || data.phone,
  {
    message: "At least one search parameter (query, email, or phone) must be provided",
  }
);

const registerHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    const passwordValidation = validatePassword(validatedData.password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors,
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists',
      });
      return;
    }

    const hashedPassword = await hashPassword(validatedData.password);

    // Generate unique username
    const username = await UsernameGenerator.generateUniqueUsername(
      validatedData.firstName,
      validatedData.lastName
    );
    console.log(`🏷️ Generated username: @${username} for ${validatedData.firstName} ${validatedData.lastName}`);

    // Create user first
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        country: validatedData.country,
        username,
        isSearchable: true, // Enable user to be found by others
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        username: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Create virtual accounts for preferred currencies
    const virtualAccounts = [];
    console.log(`🏦 Creating virtual accounts for user ${user.id} in currencies: ${validatedData.preferredCurrencies.join(', ')}`);
    
    for (const currency of validatedData.preferredCurrencies) {
      try {
        const accountLabel = `${user.firstName} ${user.lastName} ${currency} Account`;
        const virtualAccount = await masterAccountBanking.createVirtualAccount(
          user.id,
          currency as 'EUR' | 'HNL',
          accountLabel
        );
        virtualAccounts.push(virtualAccount);
        console.log(`✅ Created ${currency} virtual account with IBAN: ${virtualAccount.virtualIBAN}`);
      } catch (accountError) {
        console.error(`❌ Failed to create ${currency} virtual account for user ${user.id}:`, accountError);
        // Continue with other currencies even if one fails
      }
    }

    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 1);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: generateToken(user.id, user.email, ''),
        expiresAt: sessionExpiresAt,
      },
    });

    const token = generateToken(user.id, user.email, session.id);

    await prisma.session.update({
      where: { id: session.id },
      data: { token },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
      virtualAccounts: virtualAccounts.map(account => ({
        currency: account.currency,
        iban: account.virtualIBAN,
        balance: account.balance,
        status: account.status,
      })),
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during registration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

const loginHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated',
      });
      return;
    }

    const isPasswordValid = await comparePassword(validatedData.password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
      return;
    }

    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    });

    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 1);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: generateToken(user.id, user.email, ''),
        expiresAt: sessionExpiresAt,
      },
    });

    const token = generateToken(user.id, user.email, session.id);

    await prisma.session.update({
      where: { id: session.id },
      data: { token },
    });

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      username: user.username,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during login',
    });
  }
};

/**
 * Search users for transfers - accessible at /obp/v5.1.0/users/search
 */
const searchUsers: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user!.id;
    
    // Validate and sanitize query parameters
    const validation = searchQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid search parameters',
        details: validation.error.errors,
        message: 'Please check your search parameters and try again'
      });
      return;
    }
    
    const { query, email, phone, limit, offset, sortBy } = validation.data;
    
    // Use optimized search service
    const searchResult = await UserSearchService.searchUsers(currentUserId, {
      query,
      email, 
      phone,
      limit,
      offset,
      sortBy
    });
    
    // Get account information for search results (for transfer availability)
    const userIds = searchResult.results.map(user => user.id);
    const usersWithAccounts = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        bankAccounts: {
          where: {
            status: 'ACTIVE',
          },
          take: 1,
          select: {
            currency: true,
            country: true,
          }
        }
      }
    });
    
    const accountMap = new Map(
      usersWithAccounts.map(user => [
        user.id, 
        user.bankAccounts[0] || null
      ])
    );

    // Format results for frontend compatibility
    const formattedResults = searchResult.results.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || undefined,
      phone: user.phone || undefined,
      memberSince: user.createdAt.toISOString(),
      // Account availability for transfers (without exposing IBAN)
      hasActiveAccount: !!accountMap.get(user.id),
      primaryCurrency: accountMap.get(user.id)?.currency || null,
      country: accountMap.get(user.id)?.country || null,
    }));
    
    res.json({
      success: true,
      results: formattedResults,
      count: formattedResults.length,
      totalCount: searchResult.totalCount,
      hasMore: searchResult.hasMore,
      pagination: {
        limit: searchResult.limit,
        offset: searchResult.offset,
        totalCount: searchResult.totalCount,
        hasNextPage: searchResult.hasMore,
        hasPreviousPage: searchResult.offset > 0,
      }
    });
    
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      error: 'Search service temporarily unavailable',
      message: 'Please try again in a moment'
    });
  }
};

/**
 * Get user by ID for transfers (with IBAN information)
 * This endpoint returns user information including their primary account IBAN
 * for real bank transfers via @username
 */
const getUserById: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    
    if (id === currentUserId) {
      res.status(400).json({
        error: 'Cannot send money to yourself'
      });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: {
        id,
        isSearchable: true,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        bankAccounts: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            createdAt: 'asc', // Primary account is usually the first created
          },
          take: 1, // Get primary account
          select: {
            id: true,
            currency: true,
            country: true,
            iban: true,
            accountNumber: true,
            name: true,
          }
        }
      }
    });
    
    if (!user) {
      res.status(404).json({
        error: 'User not found or not available for transfers'
      });
      return;
    }
    
    // Check if user has an active account with IBAN
    const primaryAccount = user.bankAccounts[0];
    if (!primaryAccount || !primaryAccount.iban) {
      res.status(404).json({
        error: 'User does not have an active account available for transfers'
      });
      return;
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        memberSince: user.createdAt.toISOString(),
        // Primary account information for transfers
        primaryAccount: {
          id: primaryAccount.id,
          currency: primaryAccount.currency,
          country: primaryAccount.country,
          iban: primaryAccount.iban,
          accountNumber: primaryAccount.accountNumber,
          name: primaryAccount.name,
        }
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user details'
    });
  }
};

// OBP-API v5.1.0 User routes
router.post('/', registerHandler); // POST /obp/v5.1.0/users (create user)
router.post('/current/logins/direct', loginHandler); // POST /obp/v5.1.0/users/current/logins/direct
router.get('/search', authenticateToken, searchUsers); // GET /obp/v5.1.0/users/search
router.get('/:id', authenticateToken, getUserById); // GET /obp/v5.1.0/users/{userId}

export default router;