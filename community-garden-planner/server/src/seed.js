import 'dotenv/config';
import mongoose from 'mongoose';
import Plot from './models/Plot.js';
import GardenTask from './models/GardenTask.js';
import GardenActivity from './models/GardenActivity.js';

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

async function seedIfEmpty(Model, records) {
  const count = await Model.countDocuments();
  if (count) return { added: 0, preserved: count };
  await Model.insertMany(records);
  return { added: records.length, preserved: 0 };
}

async function main() {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<cluster-host>')) {
    throw new Error('Set a real MONGO_URI in server/.env before seeding.');
  }
  await mongoose.connect(process.env.MONGO_URI);

  const plotResult = await seedIfEmpty(Plot, plotsToPlant);
  const plots = plotResult.added ? await Plot.find().sort({ createdAt: 1 }).limit(plotsToPlant.length).select('_id').lean() : [];
  const tasks = taskTemplates.map(task => ({
    title: task.title,
    assignedTo: task.assignedTo,
    dueOn: daysFromToday(task.offset),
    plotId: plots[task.plotIndex]?._id ?? null
  }));
  const taskResult = plotResult.added ? await seedIfEmpty(GardenTask, tasks) : { added: 0, preserved: await GardenTask.countDocuments() };
  const activityResult = plotResult.added ? await seedIfEmpty(GardenActivity, [
    { message: 'The first tomato flowers opened in Oak Bed.', kind: 'plant', occurredAt: daysFromToday(-2) },
    { message: 'Fresh spinach leaves were gathered from North Row.', kind: 'harvest', occurredAt: daysFromToday(-1) },
    { message: 'Basil was pinched back for a fuller herb spiral.', kind: 'plant', occurredAt: daysFromToday(0) }
  ]) : { added: 0, preserved: await GardenActivity.countDocuments() };

  console.log(`Garden records added: ${plotResult.added}; existing plots preserved: ${plotResult.preserved}.`);
  console.log(`Tasks added: ${taskResult.added}; existing tasks preserved: ${taskResult.preserved}.`);
  console.log(`Activities added: ${activityResult.added}; existing activities preserved: ${activityResult.preserved}.`);
}

main().catch(err => {
  console.error(`Garden initialization failed: ${err.message}`);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
