import { Router } from 'express';
import GardenActivity from '../models/GardenActivity.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const activity = await GardenActivity.find({ userId: req.user.id }).sort({ occurredAt: -1 }).limit(8).lean();
    res.json(activity);
  } catch (err) { next(err); }
});

export default router;
