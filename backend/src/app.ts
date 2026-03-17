import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routers/authRouter';
import userRouter from './routers/userRouter';
import storeRouter from './routers/storeRouter';
import productRouter from './routers/productRouter';
import productBatchRouter from './routers/productBatchRouter';
import inventoryRouter from './routers/inventoryRouter';
import supplyOrderRouter from './routers/supplyOrderRouter';
import kitchenProductionRouter from './routers/kitchenProductionRouter';
import auditLogRouter from './routers/auditLogRouter';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/audit-logs', auditLogRouter);
app.use('/api/users', userRouter);
app.use('/api/stores', storeRouter);
app.use('/api/products', productRouter);
app.use('/api/batches', productBatchRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/supply-orders', supplyOrderRouter);
app.use('/api/kitchen-production', kitchenProductionRouter);

app.get('/api/health', async (req, res) => {
  const mongoose = require('./config/database').default;
  const state = mongoose.connection.readyState; // 0 disconnected, 1 connected
  res.json({
    status: state === 1 ? 'OK' : 'ERROR',
    message: 'Central Kitchen Management API is running',
    database: state === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date()
  });
});

// Global error handler: avoid generic "Internal server error" without details
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const msg = err?.message && String(err.message).trim() ? String(err.message) : 'An unexpected error occurred. Please try again.';
  res.status(res.headersSent ? 500 : (res.statusCode || 500)).json({
    success: false,
    message: msg,
  });
});

const PORT = process.env.PORT || 3000;

// connect to DB then start server
import { connectDatabase } from './config/database';

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error('Failed to start application because DB connection failed', e);
  });

export default app;
   