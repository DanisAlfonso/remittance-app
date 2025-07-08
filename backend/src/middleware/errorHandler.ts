import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { isDevelopment } from '../config/environment';

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

export class CustomError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'CustomError';
  }
}

export function createError(message: string, statusCode: number = 500, details?: any): CustomError {
  return new CustomError(message, statusCode, details);
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  const response: any = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  if (isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
}

export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}