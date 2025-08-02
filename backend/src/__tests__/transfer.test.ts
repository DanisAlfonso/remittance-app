import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '../config/environment';
import obpRoutes from '../routes/obp-v5';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { prisma } from '../config/database';
import { masterAccountBanking } from '../services/master-account-banking';
import { generateToken } from '../middleware/auth';
import bcrypt from 'bcryptjs';

// Mock external services
jest.mock('../services/master-account-banking');
jest.mock('../services/obp-api');

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Mount OBP routes
  app.use('/api/v1', obpRoutes);
  
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return app;
};

describe('Transfer Operations', () => {
  let app: express.Application;
  let authToken: string;
  let testUser: any;
  let eurAccount: any;
  let hnlAccount: any;
  let recipientUser: any;
  let recipientEurAccount: any;
  let recipientHnlAccount: any;

  beforeAll(async () => {
    // Create test app
    app = createTestApp();
    
    // Create test users
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    testUser = await prisma.user.create({
      data: {
        email: 'sender@test.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Sender',
        isActive: true,
        emailVerified: true,
      },
    });

    recipientUser = await prisma.user.create({
      data: {
        email: 'recipient@test.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Recipient',
        isActive: true,
        emailVerified: true,
        username: 'testrecipient',
      },
    });

    // Generate auth token
    authToken = generateToken(testUser.id, testUser.email, 'test-session');

    // Create test accounts for sender
    eurAccount = await prisma.bankAccount.create({
      data: {
        userId: testUser.id,
        bankAccountId: 1001,
        bankProfileId: 101,
        name: 'EUR Test Account',
        currency: 'EUR',
        country: 'ES',
        accountType: 'CHECKING',
        iban: 'ES7100302053091234567890',
        lastBalance: 1000.00,
        status: 'ACTIVE',
      },
    });

    hnlAccount = await prisma.bankAccount.create({
      data: {
        userId: testUser.id,
        bankAccountId: 1002,
        bankProfileId: 102,
        name: 'HNL Test Account',
        currency: 'HNL',
        country: 'HN',
        accountType: 'CHECKING',
        iban: 'HN1100302053091234567890',
        lastBalance: 25000.00,
        status: 'ACTIVE',
      },
    });

    // Create test accounts for recipient
    recipientEurAccount = await prisma.bankAccount.create({
      data: {
        userId: recipientUser.id,
        bankAccountId: 2001,
        bankProfileId: 201,
        name: 'Recipient EUR Account',
        currency: 'EUR',
        country: 'ES',
        accountType: 'CHECKING',
        iban: 'ES7100302053091234567891',
        lastBalance: 500.00,
        status: 'ACTIVE',
      },
    });

    recipientHnlAccount = await prisma.bankAccount.create({
      data: {
        userId: recipientUser.id,
        bankAccountId: 2002,
        bankProfileId: 202,
        name: 'Recipient HNL Account',
        currency: 'HNL',
        country: 'HN',
        accountType: 'CHECKING',
        iban: 'HN1100302053091234567891',
        lastBalance: 10000.00,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.bankTransaction.deleteMany({
      where: {
        bankAccountId: {
          in: [eurAccount.id, hnlAccount.id, recipientEurAccount.id, recipientHnlAccount.id],
        },
      },
    });

    await prisma.bankAccount.deleteMany({
      where: {
        id: {
          in: [eurAccount.id, hnlAccount.id, recipientEurAccount.id, recipientHnlAccount.id],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUser.id, recipientUser.id],
        },
      },
    });
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock successful master account operations
    (masterAccountBanking.createTransfer as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'test-transfer-id',
        fromAccountId: 'sender-account',
        toAccountId: 'recipient-account',
        amount: 100,
        currency: 'EUR',
        status: 'COMPLETED',
        referenceNumber: 'REF123456',
        exchangeRate: 1.0,
        fees: 0,
        description: 'Test transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    (masterAccountBanking.getTransactionHistory as jest.Mock).mockResolvedValue([]);
  });

  describe('EUR to EUR Transfers', () => {
    it('should successfully create EUR to EUR transfer between app users', async () => {
      const transferData = {
        recipientAccount: {
          accountNumber: recipientEurAccount.iban,
          currency: 'EUR',
          country: 'ES',
        },
        recipientDetails: {
          firstName: recipientUser.firstName,
          lastName: recipientUser.lastName,
          email: recipientUser.email,
        },
        transferDetails: {
          amount: 100,
          currency: 'EUR',
          reference: 'Test EUR transfer',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      expect(response.body).toHaveProperty('transfer');
      expect(response.body.transfer).toMatchObject({
        sourceAmount: -100, // Negative for outgoing transfer
        sourceCurrency: 'EUR',
        targetAmount: 100,
        targetCurrency: 'EUR',
        status: expect.objectContaining({
          status: 'COMPLETED',
        }),
      });

      expect(masterAccountBanking.createTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUserId: testUser.id,
          toUserId: recipientUser.id,
          amount: 100,
          currency: 'EUR',
          description: expect.stringContaining('EUR transfer'),
        })
      );
    });

    it('should validate EUR transfer amount limits', async () => {
      const transferData = {
        recipientAccount: {
          accountNumber: recipientEurAccount.iban,
          currency: 'EUR',
          country: 'ES',
        },
        recipientDetails: {
          firstName: recipientUser.firstName,
          lastName: recipientUser.lastName,
          email: recipientUser.email,
        },
        transferDetails: {
          amount: 10001, // Exceeds daily limit
          currency: 'EUR',
          reference: 'Large EUR transfer',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatchObject({
        error_code: expect.any(String),
        error_message: expect.stringMatching(/amount|limit/i),
      });
    });

    it('should prevent EUR transfer with insufficient balance', async () => {
      // Mock insufficient balance
      (masterAccountBanking.createTransfer as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          message: 'Insufficient balance',
          statusCode: 400,
        },
      });

      const transferData = {
        recipientAccount: {
          accountNumber: recipientEurAccount.iban,
          currency: 'EUR',
          country: 'ES',
        },
        recipientDetails: {
          firstName: recipientUser.firstName,
          lastName: recipientUser.lastName,
          email: recipientUser.email,
        },
        transferDetails: {
          amount: 2000, // More than balance
          currency: 'EUR',
          reference: 'Insufficient balance test',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.error_message).toMatch(/insufficient|balance/i);
    });

    it('should handle EUR transfer to external IBAN', async () => {
      const transferData = {
        recipientAccount: {
          accountNumber: 'ES9121000418450200051332', // Different external IBAN
          currency: 'EUR',
          country: 'ES',
        },
        recipientDetails: {
          firstName: 'External',
          lastName: 'Recipient',
          email: 'external@bank.com',
        },
        transferDetails: {
          amount: 250,
          currency: 'EUR',
          reference: 'External EUR transfer',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      expect(response.body.transfer).toMatchObject({
        sourceAmount: -250,
        sourceCurrency: 'EUR',
        targetAmount: 250,
        targetCurrency: 'EUR',
        recipient: expect.objectContaining({
          name: 'External Recipient',
          iban: 'ES9121000418450200051332',
        }),
      });
    });
  });

  describe('HNL to HNL Transfers', () => {
    it('should successfully create HNL to HNL transfer between app users', async () => {
      const transferData = {
        recipientAccount: {
          accountNumber: recipientHnlAccount.iban,
          currency: 'HNL',
          country: 'HN',
        },
        recipientDetails: {
          firstName: recipientUser.firstName,
          lastName: recipientUser.lastName,
          email: recipientUser.email,
        },
        transferDetails: {
          amount: 2500,
          currency: 'HNL',
          reference: 'Test HNL transfer',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      expect(response.body.transfer).toMatchObject({
        sourceAmount: -2500,
        sourceCurrency: 'HNL',
        targetAmount: 2500,
        targetCurrency: 'HNL',
        status: expect.objectContaining({
          status: 'COMPLETED',
        }),
      });

      expect(masterAccountBanking.createTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUserId: testUser.id,
          toUserId: recipientUser.id,
          amount: 2500,
          currency: 'HNL',
          description: expect.stringContaining('HNL transfer'),
        })
      );
    });

    it('should validate HNL transfer amount limits', async () => {
      const transferData = {
        recipientAccount: {
          accountNumber: recipientHnlAccount.iban,
          currency: 'HNL',
          country: 'HN',
        },
        recipientDetails: {
          firstName: recipientUser.firstName,
          lastName: recipientUser.lastName,
          email: recipientUser.email,
        },
        transferDetails: {
          amount: 250001, // Exceeds daily limit for HNL
          currency: 'HNL',
          reference: 'Large HNL transfer',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatchObject({
        error_code: expect.any(String),
        error_message: expect.stringMatching(/amount|limit/i),
      });
    });

    it('should prevent HNL transfer with insufficient balance', async () => {
      // Mock insufficient balance
      (masterAccountBanking.createTransfer as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          message: 'Insufficient balance',
          statusCode: 400,
        },
      });

      const transferData = {
        recipientAccount: {
          accountNumber: recipientHnlAccount.iban,
          currency: 'HNL',
          country: 'HN',
        },
        recipientDetails: {
          firstName: recipientUser.firstName,
          lastName: recipientUser.lastName,
          email: recipientUser.email,
        },
        transferDetails: {
          amount: 50000, // More than balance
          currency: 'HNL',
          reference: 'Insufficient balance test',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.error_message).toMatch(/insufficient|balance/i);
    });

    it('should handle HNL transfer to external bank account', async () => {
      const transferData = {
        recipientAccount: {
          accountNumber: '1234567890123456', // External bank account
          currency: 'HNL',
          country: 'HN',
        },
        recipientDetails: {
          firstName: 'External',
          lastName: 'HNL Recipient',
          email: 'external@bank.hn',
        },
        transferDetails: {
          amount: 5000,
          currency: 'HNL',
          reference: 'External HNL transfer',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      expect(response.body.transfer).toMatchObject({
        sourceAmount: -5000,
        sourceCurrency: 'HNL',
        targetAmount: 5000,
        targetCurrency: 'HNL',
        recipient: expect.objectContaining({
          name: 'External HNL Recipient',
          accountNumber: '1234567890123456',
        }),
      });
    });
  });

  describe('Transfer History', () => {
    it('should retrieve transfer history for user', async () => {
      // Mock transaction history
      const mockTransactions = [
        {
          id: 'tx1',
          amount: 100,
          currency: 'EUR',
          type: 'OUTBOUND_TRANSFER',
          description: 'Test EUR transfer to Test Recipient',
          referenceNumber: 'REF001',
          createdAt: new Date(),
          metadata: JSON.stringify({
            recipientName: 'Test Recipient',
            recipientIban: recipientEurAccount.iban,
            isInternalUser: true,
            transferAmount: 100,
          }),
        },
        {
          id: 'tx2',
          amount: 2500,
          currency: 'HNL',
          type: 'OUTBOUND_TRANSFER',
          description: 'Test HNL transfer to Test Recipient',
          referenceNumber: 'REF002',
          createdAt: new Date(),
          metadata: JSON.stringify({
            recipientName: 'Test Recipient',
            recipientIban: recipientHnlAccount.iban,
            isInternalUser: true,
            transferAmount: 2500,
          }),
        },
      ];

      (masterAccountBanking.getTransactionHistory as jest.Mock).mockResolvedValue(mockTransactions);

      const response = await request(app)
        .get('/api/v1/obp/v5.1.0/transaction-requests?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transfers');
      expect(response.body.transfers).toHaveLength(2);
      
      // Check EUR transfer
      expect(response.body.transfers[0]).toMatchObject({
        sourceAmount: -100,
        sourceCurrency: 'EUR',
        targetCurrency: 'EUR',
        recipient: expect.objectContaining({
          name: 'Test Recipient',
        }),
        description: expect.stringContaining('EUR transfer'),
      });

      // Check HNL transfer
      expect(response.body.transfers[1]).toMatchObject({
        sourceAmount: -2500,
        sourceCurrency: 'HNL',
        targetCurrency: 'HNL',
        recipient: expect.objectContaining({
          name: 'Test Recipient',
        }),
        description: expect.stringContaining('HNL transfer'),
      });

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({
        limit: 10,
        offset: 0,
        total: 2,
      });
    });

    it('should handle pagination for transfer history', async () => {
      const response = await request(app)
        .get('/api/v1/obp/v5.1.0/transaction-requests?limit=5&offset=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        limit: 5,
        offset: 10,
        total: 0,
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for transfer operations', async () => {
      const transferData = {
        recipientAccount: {
          accountNumber: recipientEurAccount.iban,
          currency: 'EUR',
          country: 'ES',
        },
        recipientDetails: {
          firstName: 'Test',
          lastName: 'Recipient',
          email: 'test@example.com',
        },
        transferDetails: {
          amount: 100,
          currency: 'EUR',
          reference: 'Unauthorized test',
        },
      };

      await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .send(transferData)
        .expect(401);
    });

    it('should reject invalid auth tokens', async () => {
      const transferData = {
        recipientAccount: {
          accountNumber: recipientEurAccount.iban,
          currency: 'EUR',
          country: 'ES',
        },
        recipientDetails: {
          firstName: 'Test',
          lastName: 'Recipient',
          email: 'test@example.com',
        },
        transferDetails: {
          amount: 100,
          currency: 'EUR',
          reference: 'Invalid token test',
        },
      };

      await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', 'Bearer invalid-token')
        .send(transferData)
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields for transfers', async () => {
      const incompleteData = {
        recipientAccount: {
          currency: 'EUR',
        },
        // Missing recipientDetails and transferDetails
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.error_message).toMatch(/invalid|required|missing/i);
    });

    it('should validate currency format', async () => {
      const invalidCurrencyData = {
        recipientAccount: {
          accountNumber: recipientEurAccount.iban,
          currency: 'INVALID',
          country: 'ES',
        },
        recipientDetails: {
          firstName: 'Test',
          lastName: 'Recipient',
          email: 'test@example.com',
        },
        transferDetails: {
          amount: 100,
          currency: 'INVALID',
          reference: 'Invalid currency test',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCurrencyData)
        .expect(400);

      expect(response.body.error.error_message).toMatch(/currency|invalid/i);
    });

    it('should validate transfer amounts', async () => {
      const invalidAmountData = {
        recipientAccount: {
          accountNumber: recipientEurAccount.iban,
          currency: 'EUR',
          country: 'ES',
        },
        recipientDetails: {
          firstName: 'Test',
          lastName: 'Recipient',
          email: 'test@example.com',
        },
        transferDetails: {
          amount: -50, // Negative amount
          currency: 'EUR',
          reference: 'Negative amount test',
        },
      };

      const response = await request(app)
        .post('/api/v1/obp/v5.1.0/transaction-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAmountData)
        .expect(400);

      expect(response.body.error.error_message).toMatch(/amount|positive|invalid/i);
    });
  });
});