import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import User from './models/User.js';
import RefreshSession from './models/RefreshSession.js';

async function start() {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<cluster-host>')) {
    throw new Error('Set MONGO_URI in the backend environment before starting the service.');
  }
  if (!process.env.JWT_ACCESS_SECRET || Buffer.byteLength(process.env.JWT_ACCESS_SECRET, 'utf8') < 32) {
    throw new Error('Set JWT_ACCESS_SECRET to a random value of at least 32 bytes.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.init(), RefreshSession.init()]);
  const app = createApp();
  const port = process.env.PORT || 5000;
  const server = app.listen(port, () => console.log(`Community Garden API listening on port ${port}.`));
  const shutdown = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(err => {
  console.error(`API startup failed (${err.name || 'Error'}). Check the server environment settings and database access.`);
  process.exit(1);
});
