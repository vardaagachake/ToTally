const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  vendorName: { type: String },
  customerName: { type: String },
  invoiceNo: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  type: { type: String, enum: ['receivable', 'payable'], required: true },
  description: { type: String },
}, { timestamps: true });

ledgerSchema.index({ date: 1, amount: 1 });
ledgerSchema.index({ vendorName: 1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
