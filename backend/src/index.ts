import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/environment';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import accountsRoutes from './routes/accounts';
import bankingRoutes from './routes/banking-v2';
import obpRoutes from './routes/obp-v5';
import usersRoutes from './routes/users';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(morgan('combined'));
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

// Legacy endpoints (deprecated)
app.use('/api/v1/banking', bankingRoutes); // TODO: Remove after migration

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
      console.log(`🌐 Network access: http://192.168.148.129:${env.PORT}/health`);
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