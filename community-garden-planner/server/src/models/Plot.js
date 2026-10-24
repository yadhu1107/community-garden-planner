import mongoose from 'mongoose';

const plotSchema = new mongoose.Schema({
  plotName: { type: String, required: true, trim: true, maxlength: 80 },
  areaSqM: { type: Number, min: 0.5, default: 6 },
  availability: { type: String, enum: ['Available', 'Reserved', 'In use'], default: 'In use' },
  gardener: { type: String, trim: true, maxlength: 80, default: '' },
  crop: { type: String, trim: true, maxlength: 80, default: '' },
  plantedOn: { type: Date, default: null },
  expectedHarvestOn: { type: Date, default: null },
  wateringSchedule: { type: String, trim: true, maxlength: 80, default: 'Every 2–3 days' },
  status: {
    type: String,
    enum: ['Planned', 'Growing', 'Ready to Harvest', 'Harvested'],
    default: 'Planned'
  },
  expectedHarvestKg: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

plotSchema.pre('validate', function validateAssignedPlant() {
  if (this.availability === 'In use' && !this.gardener.trim()) {
    this.invalidate('gardener', 'Add a gardener for an active plot.');
  }
  if (this.availability === 'In use' && !this.crop.trim()) {
    this.invalidate('crop', 'Add a plant for an active plot.');
  }
});

export default mongoose.model('Plot', plotSchema);
