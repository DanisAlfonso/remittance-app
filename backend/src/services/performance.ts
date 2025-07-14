import { performance } from 'perf_hooks';
import type { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Performance monitoring service for production systems
 * Tracks query performance, identifies slow operations, and logs alerts
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics in memory
  private static readonly SLOW_QUERY_THRESHOLD = 100; // 100ms

  /**
   * Start performance timer
   */
  static startTimer(): { end: (operation: string, userId?: string, metadata?: Record<string, unknown>) => void } {
    const startTime = performance.now();
    
    return {
      end: (operation: string, userId?: string, metadata?: Record<string, unknown>): void => {
        const duration = performance.now() - startTime;
        this.recordMetric(operation, duration, userId, metadata);
      }
    };
  }

  /**
   * Record performance metric
   */
  private static recordMetric(
    operation: string,
    duration: number,
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: new Date(),
      userId,
      metadata
    };

    // Add to metrics array
    this.metrics.push(metric);
    
    // Trim array if too large
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`🐌 Slow operation detected:`, {
        operation,
        duration: `${duration.toFixed(2)}ms`,
        userId,
        metadata
      });
    }

    // Log extremely slow queries
    if (duration > 1000) { // 1 second
      console.error(`🚨 CRITICAL: Very slow operation:`, {
        operation,
        duration: `${duration.toFixed(2)}ms`,
        userId,
        metadata
      });
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(operation?: string): {
    totalOperations: number;
    averageDuration: number;
    slowOperations: number;
    recentMetrics: PerformanceMetrics[];
  } {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    const totalOperations = filteredMetrics.length;
    const averageDuration = totalOperations > 0 
      ? filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations
      : 0;
    const slowOperations = filteredMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length;

    return {
      totalOperations,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowOperations,
      recentMetrics: filteredMetrics.slice(-10) // Last 10 metrics
    };
  }

  /**
   * Clear metrics (useful for testing)
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Middleware for Express routes
   */
  static middleware(operationName: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const timer = this.startTimer();
      
      // Hook into response finish event instead of overriding res.end
      res.on('finish', () => {
        timer.end(operationName, (req as { user?: { id: string } }).user?.id, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent')
        });
      });
      
      next();
    };
  }
}

/**
 * Simple wrapper for measuring function execution time
 */
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<T> {
  const timer = PerformanceMonitor.startTimer();
  
  return fn().finally(() => {
    timer.end(operation, userId, metadata);
  });
}