const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  paymentTerms: { type: String, required: true }, // e.g. "Net 15", "Net 30"
  paymentTermDays: { type: Number, required: true }, // numeric: 15, 30, 45
  contactEmail: { type: String, required: true },
  category: { type: String },
  historicalInvoices: [{
    amount: Number,
    date: Date,
    invoiceNo: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
