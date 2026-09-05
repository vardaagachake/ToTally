const mongoose = require('mongoose');

const fxRateSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  fromCurrency: { type: String, required: true },
  toCurrency: { type: String, required: true },
  rate: { type: Number, required: true },
}, { timestamps: true });

fxRateSchema.index({ date: 1, fromCurrency: 1, toCurrency: 1 }, { unique: true });

module.exports = mongoose.model('FXRate', fxRateSchema);
