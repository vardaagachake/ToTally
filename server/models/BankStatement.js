const mongoose = require('mongoose');

const bankStatementSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  referenceNo: { type: String, required: true, unique: true },
  description: { type: String },
  type: { type: String, enum: ['credit', 'debit'], required: true },
}, { timestamps: true });

bankStatementSchema.index({ date: 1, amount: 1 });

module.exports = mongoose.model('BankStatement', bankStatementSchema);
