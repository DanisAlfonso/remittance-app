import { Router, Request, Response, RequestHandler } from 'express';
import { prisma } from '../config/database';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { generateToken } from '../middleware/auth';
import { masterAccountBanking } from '../services/master-account-banking';
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

    // Create user first
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        country: validatedData.country,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
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

// OBP-API v5.1.0 User routes
router.post('/', registerHandler); // POST /obp/v5.1.0/users (create user)
router.post('/current/logins/direct', loginHandler); // POST /obp/v5.1.0/users/current/logins/direct

export default router;