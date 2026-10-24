import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import plotsRouter from './routes/plots.js';
import tasksRouter from './routes/tasks.js';
import activityRouter from './routes/activity.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'community-garden-planner-api' }));
app.use('/api/plots', plotsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/activity', activityRouter);
app.use((err, _req, res, _next) => {
  console.error(err.message);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Check the form values and try again.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid value supplied.' });
  res.status(500).json({ message: 'Server error. Check the server terminal for details.' });
});

async function start() {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<cluster-host>')) {
    console.error('MONGO_URI is missing or still contains the example <cluster-host>. Set your real URI in server/.env.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Community Garden API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

start();
