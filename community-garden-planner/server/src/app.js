import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.js';
import plotsRouter from './routes/plots.js';
import tasksRouter from './routes/tasks.js';
import activityRouter from './routes/activity.js';
import { allowedOrigins } from './security.js';
import { requireAuth } from './middleware/auth.js';

export function createApp() {
  const app = express();
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(cors({
    origin(origin, callback) {
      callback(null, origin && allowedOrigins.has(origin) ? origin : false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 600
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'community-garden-planner-api' }));
  app.use('/api/auth', authRouter);
  app.use('/api/plots', requireAuth, plotsRouter);
  app.use('/api/tasks', requireAuth, tasksRouter);
  app.use('/api/activity', requireAuth, activityRouter);
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Check the form values and try again.' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid value supplied.' });
    if (err.code === 11000) return res.status(409).json({ message: 'That garden record already exists.' });
    console.error(`API request failed (${err.name || 'Error'}).`);
    return res.status(500).json({ message: 'The garden service could not complete that request. Please try again.' });
  });
  return app;
}
