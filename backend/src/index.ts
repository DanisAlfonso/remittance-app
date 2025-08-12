import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/environment';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import accountsRoutes from './routes/accounts';
import obpRoutes from './routes/obp-v5';
import usersRoutes from './routes/users';
import remittanceRoutes from './routes/remittance';
import cardsRoutes from './routes/cards';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
// Only log important requests, skip health checks and assets
app.use(morgan('tiny', {
  skip: (req, res) => {
    // Skip health checks and frequent polling
    if (req.url === '/health') return true;
    if (req.url.startsWith('/media')) return true;
    if (req.url.includes('hot-update')) return true;
    return false;
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// OBP-API v5.1.0 Root endpoint
app.get('/obp/v5.1.0/root', (req, res) => {
  res.json({ 
    version: 'v5.1.0',
    status: 'STABLE',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    git_commit: 'remittance-app-v1.0.0',
    connectors: ['obp-api-adapter'],
  });
});

// OBP-API v5.1.0 compliant endpoints
app.use('/obp/v5.1.0/users', authRoutes); // User authentication and registration
app.use('/obp/v5.1.0/my/accounts', accountsRoutes); // Virtual IBAN accounts
app.use('/obp/v5.1.0/banks', obpRoutes); // Bank operations and transactions
app.use('/obp/v5.1.0/management/users', usersRoutes); // User management (admin)
app.use('/obp/v5.1.0', obpRoutes); // Additional OBP endpoints (users/current, transaction-requests)

// Remittance endpoints (OBP-API v5.1.0 compliant)
app.use('/obp/v5.1.0/remittance', remittanceRoutes); // EUR → HNL remittances

// Stripe Issuing Cards API
app.use('/api/v1/cards', cardsRoutes); // Card issuance and management

app.use((req, res, next) => {
  notFoundHandler(req, res);
});
app.use(errorHandler);

async function startServer() {
  try {
    await connectDatabase();
    
    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${env.PORT}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start the server if we're not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;