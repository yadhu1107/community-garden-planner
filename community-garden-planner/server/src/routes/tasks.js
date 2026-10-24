import { Router } from 'express';
import mongoose from 'mongoose';
import GardenTask from '../models/GardenTask.js';
import GardenActivity from '../models/GardenActivity.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const tasks = await GardenTask.find().populate('plotId', 'plotName').sort({ completed: 1, dueOn: 1 }).lean();
    res.json(tasks);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, assignedTo = '', dueOn, plotId = null } = req.body;
    if (typeof title !== 'string' || !title.trim() || !dueOn || Number.isNaN(Date.parse(dueOn))) {
      return res.status(400).json({ message: 'Add a task name and a valid due date.' });
    }
    if (plotId && !mongoose.isValidObjectId(plotId)) return res.status(400).json({ message: 'Choose a valid garden plot.' });
    const task = await GardenTask.create({ title, assignedTo, dueOn, plotId: plotId || null });
    await GardenActivity.create({ message: `Added “${task.title}” to the garden list.`, kind: 'task' });
    res.status(201).json(await task.populate('plotId', 'plotName'));
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid task ID.' });
    if (typeof req.body.completed !== 'boolean') return res.status(400).json({ message: 'Task completion must be true or false.' });
    const task = await GardenTask.findByIdAndUpdate(req.params.id, { completed: req.body.completed }, { new: true, runValidators: true }).populate('plotId', 'plotName');
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    await GardenActivity.create({ message: `${task.completed ? 'Completed' : 'Reopened'} “${task.title}”.`, kind: 'task' });
    res.json(task);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid task ID.' });
    const task = await GardenTask.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    await GardenActivity.create({ message: `Removed “${task.title}” from the task list.`, kind: 'task' });
    res.json({ message: 'Task removed.' });
  } catch (err) { next(err); }
});

export default router;
