import mongoose from 'mongoose';

const gardenTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  assignedTo: { type: String, trim: true, maxlength: 80, default: '' },
  dueOn: { type: Date, required: true },
  plotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot', default: null },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('GardenTask', gardenTaskSchema);
