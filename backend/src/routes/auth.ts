import { Router, Request, Response, RequestHandler } from 'express';
import { prisma } from '../config/database';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { generateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().optional(),
  country: z.string().optional(),
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

// Register routes
router.post('/register', registerHandler);
router.post('/login', loginHandler);

export default router;