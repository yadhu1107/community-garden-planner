import mongoose from 'mongoose';

const gardenActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true, trim: true, maxlength: 180 },
  kind: { type: String, enum: ['plot', 'plant', 'task', 'harvest'], default: 'plant' },
  occurredAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('GardenActivity', gardenActivitySchema);
