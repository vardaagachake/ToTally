const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  settlementId: { type: String, required: true, unique: true },
  entityId: { type: String },
  type: { type: String, enum: ['payment', 'refund', 'adjustment'], default: 'payment' },
  amount: { type: Number, required: true },
  fees: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  utr: { type: String },
  date: { type: Date, required: true },
  status: { type: String, enum: ['created', 'processed', 'failed'], default: 'processed' },
  currency: { type: String, default: 'INR' },
}, { timestamps: true });

settlementSchema.index({ date: 1, amount: 1 });
settlementSchema.index({ utr: 1 });

module.exports = mongoose.model('Settlement', settlementSchema);
