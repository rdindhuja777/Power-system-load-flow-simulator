import express from 'express';
import cors from 'cors';
import { simulateRouter } from './routes/simulate.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'power-system-load-flow-backend' });
  });

  app.use('/', simulateRouter);
  app.use('/api', simulateRouter);

  app.use((err, _req, res, _next) => {
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
      error: err.name || 'ServerError',
      message: err.message || 'Unexpected server error'
    });
  });

  return app;
}

export const app = createApp();
