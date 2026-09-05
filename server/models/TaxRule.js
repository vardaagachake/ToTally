const mongoose = require('mongoose');

const taxRuleSchema = new mongoose.Schema({
  ruleId: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  gstRate: { type: Number, required: true }, // e.g. 0, 5, 12, 18, 28
  condition: {
    categories: [String],        // applicable categories
    amountMin: Number,           // minimum amount threshold
    amountMax: Number,           // maximum amount threshold
    invoiceType: String,         // 'service', 'goods', 'mixed'
    exemptCategories: [String],  // categories excluded from this rule
  },
  priority: { type: Number, default: 0 }, // higher = checked first
}, { timestamps: true });

module.exports = mongoose.model('TaxRule', taxRuleSchema);
