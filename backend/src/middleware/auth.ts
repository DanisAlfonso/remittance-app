import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    emailVerified: boolean;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export function generateToken(userId: string, email: string, sessionId: string): string {
  return jwt.sign(
    { userId, email, sessionId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const payload = verifyToken(token);

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            emailVerified: true,
          },
        },
      },
    });

    if (!session) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    if (!session.user.isActive) {
      res.status(401).json({ error: 'Account deactivated' });
      return;
    }

    req.user = session.user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const payload = verifyToken(token);

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            emailVerified: true,
          },
        },
      },
    });

    if (session && session.expiresAt > new Date() && session.user.isActive) {
      req.user = session.user;
    }

    next();
  } catch (error) {
    next();
  }
}