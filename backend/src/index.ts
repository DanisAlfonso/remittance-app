import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/environment';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import bankingRoutes from './routes/banking';
import transferRoutes from './routes/transfer';
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

app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wise', bankingRoutes);
app.use('/api/v1/transfer', transferRoutes);
app.use('/api/v1/users', usersRoutes);

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