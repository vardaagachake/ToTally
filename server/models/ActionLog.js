const mongoose = require('mongoose');

const actionLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entityType: { type: String, required: true }, // 'match', 'reminder', 'tax_override', 'report', etc.
  entityId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

actionLogSchema.index({ timestamp: -1 });
actionLogSchema.index({ entityType: 1 });

module.exports = mongoose.model('ActionLog', actionLogSchema);
