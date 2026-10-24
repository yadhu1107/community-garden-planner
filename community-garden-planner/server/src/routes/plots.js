import { Router } from 'express';
import mongoose from 'mongoose';
import Plot from '../models/Plot.js';
import GardenActivity from '../models/GardenActivity.js';

const router = Router();
const allowedStatuses = ['Planned', 'Growing', 'Ready to Harvest', 'Harvested'];
const allowedAvailability = ['Available', 'Reserved', 'In use'];
const editableFields = ['plotName', 'areaSqM', 'availability', 'gardener', 'crop', 'plantedOn', 'expectedHarvestOn', 'wateringSchedule', 'status', 'expectedHarvestKg'];

function validatePlotInput(input) {
  if (typeof input.plotName !== 'string' || !input.plotName.trim()) return 'Add a name for this plot.';
  if (!allowedAvailability.includes(input.availability)) return 'Choose a valid plot availability.';
  if (input.availability === 'In use' && (!String(input.gardener || '').trim() || !String(input.crop || '').trim())) {
    return 'Add a gardener and plant for a plot in use.';
  }
  if (input.status && !allowedStatuses.includes(input.status)) return 'Choose a valid growing stage.';
  const area = Number(input.areaSqM);
  if (!Number.isFinite(area) || area < 0.5 || area > 10000) return 'Plot size must be between 0.5 and 10,000 square metres.';
  const harvest = Number(input.expectedHarvestKg || 0);
  if (!Number.isFinite(harvest) || harvest < 0 || harvest > 10000) return 'Expected harvest must be between 0 and 10,000 kg.';
  for (const field of ['plantedOn', 'expectedHarvestOn']) {
    if (input[field] && Number.isNaN(Date.parse(input[field]))) return 'Enter a valid planting and harvest date.';
  }
  return '';
}

router.get('/', async (_req, res, next) => {
  try {
    const plots = await Plot.find().sort({ createdAt: -1 }).lean();
    res.json(plots);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const input = {
      plotName: req.body.plotName,
      areaSqM: req.body.areaSqM ?? 6,
      availability: req.body.availability ?? 'In use',
      gardener: req.body.gardener ?? '',
      crop: req.body.crop ?? '',
      plantedOn: req.body.plantedOn || null,
      expectedHarvestOn: req.body.expectedHarvestOn || null,
      wateringSchedule: req.body.wateringSchedule ?? 'Every 2–3 days',
      status: req.body.status ?? 'Planned',
      expectedHarvestKg: req.body.expectedHarvestKg ?? 0
    };
    const message = validatePlotInput(input);
    if (message) return res.status(400).json({ message });
    const plot = await Plot.create(input);
    await GardenActivity.create({ message: `Added ${plot.plotName} to the garden.`, kind: plot.crop ? 'plant' : 'plot' });
    res.status(201).json(plot);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid plot ID.' });
    const plot = await Plot.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found.' });
    const updates = Object.fromEntries(editableFields.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
    Object.assign(plot, updates);
    const message = validatePlotInput(plot);
    if (message) return res.status(400).json({ message });
    await plot.save();
    await GardenActivity.create({ message: `Updated ${plot.plotName}${updates.status ? ` to ${plot.status.toLowerCase()}` : ''}.`, kind: plot.crop ? 'plant' : 'plot' });
    res.json(plot);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid plot ID.' });
    const plot = await Plot.findByIdAndDelete(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found.' });
    await GardenActivity.create({ message: `Removed ${plot.plotName} from the garden register.`, kind: 'plot' });
    res.json({ message: 'Plot removed.' });
  } catch (err) { next(err); }
});

export default router;
