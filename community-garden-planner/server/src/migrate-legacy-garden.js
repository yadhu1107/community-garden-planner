import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Plot from './models/Plot.js';
import GardenTask from './models/GardenTask.js';
import GardenActivity from './models/GardenActivity.js';

async function migrate() {
  const email = typeof process.env.MIGRATION_OWNER_EMAIL === 'string' ? process.env.MIGRATION_OWNER_EMAIL.trim().toLowerCase() : '';
  if (!email) throw new Error('Set MIGRATION_OWNER_EMAIL to the account that should own the older garden records.');
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<cluster-host>')) throw new Error('Set a real MONGO_URI in server/.env.');
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (!user) throw new Error('No registered account has that email. Register the account before migrating.');

  const ownedCounts = await Promise.all([
    Plot.countDocuments({ userId: user._id }),
    GardenTask.countDocuments({ userId: user._id }),
    GardenActivity.countDocuments({ userId: user._id })
  ]);
  if (ownedCounts.some(Boolean)) throw new Error('That account already has garden records. Migration stopped without changing anything.');

  const legacyFilter = { $or: [{ userId: { $exists: false } }, { userId: null }] };
  const [plots, tasks, activity] = await Promise.all([
    Plot.updateMany(legacyFilter, { $set: { userId: user._id } }),
    GardenTask.updateMany(legacyFilter, { $set: { userId: user._id } }),
    GardenActivity.updateMany(legacyFilter, { $set: { userId: user._id } })
  ]);
  console.log(`Older garden records assigned to the selected account: ${plots.modifiedCount} plots, ${tasks.modifiedCount} tasks, ${activity.modifiedCount} activity notes.`);
}

migrate().catch(err => {
  console.error(`Garden migration stopped: ${err.message}`);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
