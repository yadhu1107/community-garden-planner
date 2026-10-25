import 'dotenv/config';
import mongoose from 'mongoose';
import Plot from './models/Plot.js';
import GardenTask from './models/GardenTask.js';
import GardenActivity from './models/GardenActivity.js';
import User from './models/User.js';

const daysFromToday = days => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const plotsToPlant = [
  { plotName: 'Oak Bed', areaSqM: 8, availability: 'In use', gardener: 'Asha Menon', crop: 'Tomatoes', plantedOn: daysFromToday(-35), expectedHarvestOn: daysFromToday(35), wateringSchedule: 'Monday, Wednesday, Saturday', status: 'Growing', expectedHarvestKg: 12 },
  { plotName: 'Herb Spiral', areaSqM: 3.5, availability: 'In use', gardener: 'Ravi Nair', crop: 'Basil', plantedOn: daysFromToday(-25), expectedHarvestOn: daysFromToday(18), wateringSchedule: 'Every 2 days', status: 'Growing', expectedHarvestKg: 2.5 },
  { plotName: 'North Row', areaSqM: 5.5, availability: 'In use', gardener: 'Laila Thomas', crop: 'Spinach', plantedOn: daysFromToday(-35), expectedHarvestOn: daysFromToday(0), wateringSchedule: 'Every morning', status: 'Ready to Harvest', expectedHarvestKg: 4 },
  { plotName: 'Root Patch', areaSqM: 7, availability: 'In use', gardener: 'Mei Joseph', crop: 'Carrots', plantedOn: daysFromToday(-30), expectedHarvestOn: daysFromToday(42), wateringSchedule: 'Tuesday and Friday', status: 'Growing', expectedHarvestKg: 6 },
  { plotName: 'Sunny Wall', areaSqM: 4.5, availability: 'In use', gardener: 'Arjun Das', crop: 'Chillies', plantedOn: daysFromToday(-55), expectedHarvestOn: daysFromToday(48), wateringSchedule: 'Every 3 days', status: 'Growing', expectedHarvestKg: 3 },
  { plotName: 'Pollinator Border', areaSqM: 6, availability: 'In use', gardener: 'Nia George', crop: 'Marigolds', plantedOn: daysFromToday(-20), expectedHarvestOn: daysFromToday(10), wateringSchedule: 'Every 3 days', status: 'Growing', expectedHarvestKg: 0 },
  { plotName: 'Willow Corner', areaSqM: 9, availability: 'Available', gardener: '', crop: '', plantedOn: null, expectedHarvestOn: null, wateringSchedule: 'Not planted', status: 'Planned', expectedHarvestKg: 0 },
  { plotName: 'Courtyard Bed', areaSqM: 5, availability: 'Reserved', gardener: 'Devika Rao', crop: '', plantedOn: null, expectedHarvestOn: null, wateringSchedule: 'Not planted', status: 'Planned', expectedHarvestKg: 0 }
];

const taskTemplates = [
  { title: 'Water the North Row before midday', assignedTo: 'Laila Thomas', offset: 0, plotIndex: 2 },
  { title: 'Tie tomato stems to the taller stakes', assignedTo: 'Asha Menon', offset: 1, plotIndex: 0 },
  { title: 'Thin the carrot seedlings', assignedTo: 'Mei Joseph', offset: 2, plotIndex: 3 },
  { title: 'Pinch basil flowers for fuller leaves', assignedTo: 'Ravi Nair', offset: 3, plotIndex: 1 },
  { title: 'Check chillies for ripe fruit', assignedTo: 'Arjun Das', offset: 4, plotIndex: 4 }
];

async function main() {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<cluster-host>')) {
    throw new Error('Set a real MONGO_URI in server/.env before seeding.');
  }
  const email = typeof process.env.SEED_EMAIL === 'string' ? process.env.SEED_EMAIL.trim().toLowerCase() : '';
  if (!email) throw new Error('Set SEED_EMAIL to the email of the account that should own these records.');
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email });
  if (!user) throw new Error('No account has that email yet. Register the account before initializing its garden.');
  const legacyPlotCount = await Plot.countDocuments({ $or: [{ userId: { $exists: false } }, { userId: null }] });
  if (legacyPlotCount) {
    console.log(`Garden initialization skipped: ${legacyPlotCount} older plot records need an owner. Review them and run the documented owner migration first.`);
    return;
  }
  const plotCount = await Plot.countDocuments({ userId: user._id });
  if (plotCount) {
    console.log(`Garden initialization skipped: ${plotCount} plots already belong to this account.`);
    return;
  }
  const plotResult = await seedIfEmptyForUser(Plot, plotsToPlant.map(plot => ({ ...plot, userId: user._id })), user._id);
  const plots = plotResult.added ? await Plot.find({ userId: user._id }).sort({ createdAt: 1 }).limit(plotsToPlant.length).select('_id').lean() : [];
  const tasks = taskTemplates.map(task => ({
    title: task.title,
    assignedTo: task.assignedTo,
    dueOn: daysFromToday(task.offset),
    plotId: plots[task.plotIndex]?._id ?? null,
    userId: user._id
  }));
  const taskResult = plotResult.added ? await seedIfEmptyForUser(GardenTask, tasks, user._id) : { added: 0, preserved: await GardenTask.countDocuments({ userId: user._id }) };
  const activityResult = plotResult.added ? await seedIfEmptyForUser(GardenActivity, [
    { userId: user._id, message: 'The first tomato flowers opened in Oak Bed.', kind: 'plant', occurredAt: daysFromToday(-2) },
    { userId: user._id, message: 'Fresh spinach leaves were gathered from North Row.', kind: 'harvest', occurredAt: daysFromToday(-1) },
    { userId: user._id, message: 'Basil was pinched back for a fuller herb spiral.', kind: 'plant', occurredAt: daysFromToday(0) }
  ]) : { added: 0, preserved: await GardenActivity.countDocuments({ userId: user._id }) };

  console.log(`Garden records added: ${plotResult.added}; existing plots preserved: ${plotResult.preserved}.`);
  console.log(`Tasks added: ${taskResult.added}; existing tasks preserved: ${taskResult.preserved}.`);
  console.log(`Activities added: ${activityResult.added}; existing activities preserved: ${activityResult.preserved}.`);
}

async function seedIfEmptyForUser(Model, records, userId) {
  const count = await Model.countDocuments({ userId });
  if (count) return { added: 0, preserved: count };
  await Model.insertMany(records);
  return { added: records.length, preserved: 0 };
}

main().catch(err => {
  console.error(`Garden initialization failed: ${err.message}`);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
