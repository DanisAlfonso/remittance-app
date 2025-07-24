import { Router, RequestHandler } from 'express';
import { prisma } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { UserSearchService } from '../services/userSearch';

const router = Router();

// Validation schemas with pagination and performance controls
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

const updateProfileSchema = z.object({
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().min(1).max(100).optional(),
  isSearchable: z.boolean().optional(),
});

/**
 * Enterprise-grade user search with optimized performance
 * Features:
 * - O(log n) performance with database indexes
 * - Pagination for memory efficiency
 * - Relevance scoring for quality results  
 * - Multi-strategy search (exact → prefix → contains)
 * - Performance monitoring and query limits
 * 
 * Query parameters:
 * - ?query=@username or ?query=name (general search)
 * - ?email=user@example.com (exact email match)
 * - ?phone=+1234567890 (exact phone match)
 * - &limit=10&offset=0 (pagination)
 * - &sortBy=relevance|recent|alphabetical (sorting)
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
 * Get current user's profile information
 */
const getProfile: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        displayName: true,
        phone: true,
        country: true,
        isSearchable: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        kycStatus: true,
        createdAt: true,
      }
    });
    
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      user: {
        ...user,
        displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile'
    });
  }
};

/**
 * Update current user's profile information
 */
const updateProfile: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate input
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid profile data',
        details: validation.error.errors
      });
      return;
    }
    
    const updateData = validation.data;
    
    // Check if username is already taken (if provided)
    if (updateData.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: updateData.username }
      });
      
      if (existingUser && existingUser.id !== userId) {
        res.status(409).json({
          error: 'Username already taken',
          message: 'Please choose a different username'
        });
        return;
      }
    }
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        displayName: true,
        phone: true,
        country: true,
        isSearchable: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        updatedAt: true,
      }
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        ...updatedUser,
        displayName: updatedUser.displayName || `${updatedUser.firstName} ${updatedUser.lastName}`,
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile'
    });
  }
};

/**
 * Get user by ID for transfers (with IBAN information)
 * This endpoint returns user information including their primary account IBAN
 * for real bank transfers via banking API
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

router.get('/search', authenticateToken, searchUsers);
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);
router.get('/:id', authenticateToken, getUserById);

export default router;