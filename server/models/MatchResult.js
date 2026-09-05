const mongoose = require('mongoose');

const matchResultSchema = new mongoose.Schema({
  bankStatementId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankStatement' },
  ledgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' },
  settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement' },
  confidence: {
    type: String,
    enum: ['Exact Match', 'Fuzzy Match', 'Probable Duplicate', 'Currency Mismatch', 'Unmatched'],
    required: true,
  },
  confidenceScore: { type: Number, default: 0 }, // 0-100
  matchDetails: {
    amountDiff: Number,
    dateDiffDays: Number,
    referenceSimilarity: Number, // 0-1
    matchedFields: [String],
  },
  status: { type: String, enum: ['auto', 'confirmed', 'rejected'], default: 'auto' },
  manualOverride: { type: Boolean, default: false },
  overrideBy: { type: String },
  overrideAt: { type: Date },
  auditFlags: [{
    flag: String,
    reason: String,
  }],
  exceptionCategory: { type: String },
  exceptionExplanation: { type: String },
  fxAnalysis: {
    isApplicable: Boolean,
    expectedAmount: Number,
    actualAmount: Number,
    rateUsed: Number,
    verdict: String, // 'Explained by FX Drift' or 'Real Discrepancy'
  },
  taxClassification: {
    gstRate: Number,
    ruleId: String,
    ruleDescription: String,
    isAmbiguous: Boolean,
    candidateRules: [{
      ruleId: String,
      gstRate: Number,
      description: String,
    }],
    userChoice: String, // ruleId chosen by user
  },
}, { timestamps: true });

matchResultSchema.index({ confidence: 1 });
matchResultSchema.index({ status: 1 });

module.exports = mongoose.model('MatchResult', matchResultSchema);
