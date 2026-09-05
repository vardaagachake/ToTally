const TaxRule = require('../models/TaxRule');
const MatchResult = require('../models/MatchResult');
const Ledger = require('../models/Ledger');
const ActionLog = require('../models/ActionLog');

async function classifyTransactions() {
  const rules = await TaxRule.find({}).sort({ priority: -1 }).lean();
  const ledgerEntries = await Ledger.find({ type: 'payable' }).lean();
  const results = [];

  for (const entry of ledgerEntries) {
    const matchingRules = [];

    for (const rule of rules) {
      const cond = rule.condition;
      
      // Check category match
      const categoryMatch = cond.categories.some(cat => 
        cat.toLowerCase() === entry.category.toLowerCase()
      );
      if (!categoryMatch) continue;

      // Check exempt categories
      if (cond.exemptCategories?.some(cat => 
        cat.toLowerCase() === entry.category.toLowerCase()
      )) continue;

      // Check amount range
      if (entry.amount < (cond.amountMin || 0)) continue;
      if (entry.amount > (cond.amountMax || Infinity)) continue;

      matchingRules.push({
        ruleId: rule.ruleId,
        gstRate: rule.gstRate,
        description: rule.description,
        priority: rule.priority,
      });
    }

    let classification;

    if (matchingRules.length === 0) {
      // Default: GST 18% for uncategorized
      classification = {
        gstRate: 18,
        ruleId: 'DEFAULT',
        ruleDescription: 'Default GST 18% — no specific rule matched this category',
        isAmbiguous: false,
        candidateRules: [],
      };
    } else if (matchingRules.length === 1) {
      classification = {
        gstRate: matchingRules[0].gstRate,
        ruleId: matchingRules[0].ruleId,
        ruleDescription: matchingRules[0].description,
        isAmbiguous: false,
        candidateRules: [],
      };
    } else {
      // Multiple rules match — check if they agree on rate
      const uniqueRates = [...new Set(matchingRules.map(r => r.gstRate))];
      if (uniqueRates.length === 1) {
        // Same rate, pick highest priority
        const best = matchingRules[0];
        classification = {
          gstRate: best.gstRate,
          ruleId: best.ruleId,
          ruleDescription: best.description,
          isAmbiguous: false,
          candidateRules: matchingRules,
        };
      } else {
        // Different rates → ambiguous, needs review
        classification = {
          gstRate: null,
          ruleId: null,
          ruleDescription: 'Ambiguous — multiple rules with different GST rates apply',
          isAmbiguous: true,
          candidateRules: matchingRules,
        };
      }
    }

    // Update match result if exists
    const matchResult = await MatchResult.findOne({ ledgerId: entry._id });
    
    // Check if user has already manually resolved this transaction
    if (matchResult && matchResult.taxClassification?.userChoice) {
      classification = matchResult.taxClassification;
    } else if (matchResult) {
      await MatchResult.findByIdAndUpdate(matchResult._id, { taxClassification: classification });
    }

    results.push({
      ledgerId: entry._id,
      invoiceNo: entry.invoiceNo,
      vendorName: entry.vendorName,
      amount: entry.amount,
      category: entry.category,
      ...classification,
      taxAmount: classification.gstRate != null ? Math.round(entry.amount * classification.gstRate / 100) : null,
    });
  }

  return results;
}

async function overrideTaxClassification(ledgerId, ruleId) {
  const mongoose = require('mongoose');
  const rule = await TaxRule.findOne({ ruleId }).lean();
  if (!rule) throw new Error(`Rule ${ruleId} not found`);

  // Explicitly cast to ObjectId
  const objectId = new mongoose.Types.ObjectId(ledgerId);

  const matchResult = await MatchResult.findOne({ ledgerId: objectId }).lean();
  
  await MatchResult.findOneAndUpdate(
    { ledgerId: objectId },
    {
      $set: {
        ledgerId: objectId,
        confidence: matchResult ? matchResult.confidence : 'Unmatched',
        taxClassification: {
          gstRate: rule.gstRate,
          ruleId: rule.ruleId,
          ruleDescription: rule.description,
          isAmbiguous: false,
          candidateRules: matchResult?.taxClassification?.candidateRules || [],
          userChoice: ruleId,
        },
      },
    },
    { upsert: true }
  );

  await ActionLog.create({
    action: 'tax_override',
    entityType: 'tax',
    entityId: ledgerId,
    details: { ruleId, gstRate: rule.gstRate, description: rule.description },
  });

  return { ledgerId, ruleId, gstRate: rule.gstRate };
}

async function getTaxSummary() {
  const results = await classifyTransactions();
  
  const bySlab = {};
  let totalTax = 0;
  let needsReview = 0;

  for (const r of results) {
    if (r.isAmbiguous) {
      needsReview++;
      continue;
    }
    const key = `${r.gstRate}%`;
    if (!bySlab[key]) bySlab[key] = { rate: r.gstRate, count: 0, baseAmount: 0, taxAmount: 0 };
    bySlab[key].count++;
    bySlab[key].baseAmount += r.amount;
    bySlab[key].taxAmount += r.taxAmount || 0;
    totalTax += r.taxAmount || 0;
  }

  return {
    totalTransactions: results.length,
    totalTaxLiability: Math.round(totalTax),
    needsReview,
    bySlab: Object.values(bySlab).sort((a, b) => a.rate - b.rate),
    details: results,
  };
}

async function getTaxRules() {
  return TaxRule.find({}).sort({ priority: -1 }).lean();
}

module.exports = { classifyTransactions, overrideTaxClassification, getTaxSummary, getTaxRules };
