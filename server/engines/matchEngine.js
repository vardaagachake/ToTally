const Fuse = require('fuse.js');
const BankStatement = require('../models/BankStatement');
const Ledger = require('../models/Ledger');
const Settlement = require('../models/Settlement');
const MatchResult = require('../models/MatchResult');
const ActionLog = require('../models/ActionLog');

const AMOUNT_TOLERANCE_ABS = 50;   // ±₹50
const AMOUNT_TOLERANCE_PCT = 0.02; // ±2%
const DATE_TOLERANCE_DAYS = 2;

function dateDiffDays(d1, d2) {
  return Math.abs(Math.round((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24)));
}

function amountWithinTolerance(a, b) {
  const diff = Math.abs(a - b);
  const pctDiff = diff / Math.max(a, b);
  return diff <= AMOUNT_TOLERANCE_ABS || pctDiff <= AMOUNT_TOLERANCE_PCT;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  s1 = s1.toLowerCase().trim();
  s2 = s2.toLowerCase().trim();
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(s1, s2) / maxLen;
}

async function runMatching() {
  const bankRecords = await BankStatement.find({}).lean();
  const ledgerRecords = await Ledger.find({}).lean();
  const settlementRecords = await Settlement.find({}).lean();

  // Clear previous results
  await MatchResult.deleteMany({});

  const results = [];
  const usedBankIds = new Set();
  const usedLedgerIds = new Set();
  const usedSettlementIds = new Set();

  // ========== PASS 1: Exact 3-way match ==========
  for (const bank of bankRecords) {
    if (usedBankIds.has(bank._id.toString())) continue;

    for (const ledger of ledgerRecords) {
      if (usedLedgerIds.has(ledger._id.toString())) continue;
      if (bank.amount !== ledger.amount) continue;
      if (bank.currency !== ledger.currency) continue;
      if (dateDiffDays(bank.date, ledger.date) > 0) continue;

      // Check reference similarity
      const refSim = stringSimilarity(bank.referenceNo, ledger.invoiceNo);
      const descSim = stringSimilarity(bank.description, ledger.vendorName || ledger.description);

      if (refSim < 0.3 && descSim < 0.3) continue;

      // Look for settlement match
      let matchedSettlement = null;
      for (const sett of settlementRecords) {
        if (usedSettlementIds.has(sett._id.toString())) continue;
        // Settlement amount = amount - fees - tax, so check if close
        const netAmount = bank.amount - (sett.fees || 0) - (sett.tax || 0);
        if (Math.abs(sett.amount - netAmount) <= 1 && dateDiffDays(bank.date, sett.date) <= 3) {
          matchedSettlement = sett;
          break;
        }
      }

      const result = {
        bankStatementId: bank._id,
        ledgerId: ledger._id,
        settlementId: matchedSettlement?._id || null,
        confidence: 'Exact Match',
        confidenceScore: 95 + (matchedSettlement ? 5 : 0),
        matchDetails: {
          amountDiff: 0,
          dateDiffDays: 0,
          referenceSimilarity: Math.max(refSim, descSim),
          matchedFields: ['amount', 'date', 'reference'],
        },
        status: 'auto',
      };

      results.push(result);
      usedBankIds.add(bank._id.toString());
      usedLedgerIds.add(ledger._id.toString());
      if (matchedSettlement) usedSettlementIds.add(matchedSettlement._id.toString());
      break;
    }
  }

  // ========== PASS 2: Fuzzy match ==========
  for (const bank of bankRecords) {
    if (usedBankIds.has(bank._id.toString())) continue;

    let bestMatch = null;
    let bestScore = 0;

    for (const ledger of ledgerRecords) {
      if (usedLedgerIds.has(ledger._id.toString())) continue;

      const amtOk = amountWithinTolerance(bank.amount, ledger.amount);
      const dateOk = dateDiffDays(bank.date, ledger.date) <= DATE_TOLERANCE_DAYS;
      const descSim = stringSimilarity(bank.description, ledger.vendorName || ledger.description);

      if (!amtOk || !dateOk) continue;

      const score = (amtOk ? 40 : 0) + (dateOk ? 30 : 0) + (descSim * 30);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = ledger;
      }
    }

    if (bestMatch && bestScore >= 50) {
      // Find settlement
      let matchedSettlement = null;
      for (const sett of settlementRecords) {
        if (usedSettlementIds.has(sett._id.toString())) continue;
        const expectedNet = bestMatch.amount - (sett.fees || 0) - (sett.tax || 0);
        if (amountWithinTolerance(sett.amount, expectedNet) && dateDiffDays(bestMatch.date, sett.date) <= 5) {
          matchedSettlement = sett;
          break;
        }
      }

      results.push({
        bankStatementId: bank._id,
        ledgerId: bestMatch._id,
        settlementId: matchedSettlement?._id || null,
        confidence: 'Fuzzy Match',
        confidenceScore: Math.round(bestScore),
        matchDetails: {
          amountDiff: Math.abs(bank.amount - bestMatch.amount),
          dateDiffDays: dateDiffDays(bank.date, bestMatch.date),
          referenceSimilarity: stringSimilarity(bank.description, bestMatch.vendorName || ''),
          matchedFields: ['amount_fuzzy', 'date_fuzzy'],
        },
        status: 'auto',
      });

      usedBankIds.add(bank._id.toString());
      usedLedgerIds.add(bestMatch._id.toString());
      if (matchedSettlement) usedSettlementIds.add(matchedSettlement._id.toString());
    }
  }

  // ========== PASS 3: Probable duplicates ==========
  const unusedBank = bankRecords.filter(b => !usedBankIds.has(b._id.toString()));
  for (let i = 0; i < unusedBank.length; i++) {
    for (let j = i + 1; j < unusedBank.length; j++) {
      if (unusedBank[i].amount === unusedBank[j].amount &&
          dateDiffDays(unusedBank[i].date, unusedBank[j].date) <= 2 &&
          stringSimilarity(unusedBank[i].description, unusedBank[j].description) > 0.6) {
        results.push({
          bankStatementId: unusedBank[j]._id,
          confidence: 'Probable Duplicate',
          confidenceScore: 30,
          matchDetails: {
            amountDiff: 0,
            dateDiffDays: dateDiffDays(unusedBank[i].date, unusedBank[j].date),
            referenceSimilarity: stringSimilarity(unusedBank[i].description, unusedBank[j].description),
            matchedFields: ['duplicate_of_' + unusedBank[i].referenceNo],
          },
          status: 'auto',
          exceptionCategory: 'Duplicate Entry',
        });
        usedBankIds.add(unusedBank[j]._id.toString());
      }
    }
  }

  // ========== PASS 4: Currency mismatches ==========
  for (const bank of bankRecords) {
    if (usedBankIds.has(bank._id.toString())) continue;
    if (bank.currency === 'INR') continue;

    for (const ledger of ledgerRecords) {
      if (usedLedgerIds.has(ledger._id.toString())) continue;
      if (bank.currency === ledger.currency) continue;

      // Check if amounts could be related through FX
      const descSim = stringSimilarity(bank.description, ledger.vendorName || ledger.description);
      if (descSim > 0.3 || dateDiffDays(bank.date, ledger.date) <= 3) {
        results.push({
          bankStatementId: bank._id,
          ledgerId: ledger._id,
          confidence: 'Currency Mismatch',
          confidenceScore: 45,
          matchDetails: {
            amountDiff: Math.abs(bank.amount - ledger.amount),
            dateDiffDays: dateDiffDays(bank.date, ledger.date),
            referenceSimilarity: descSim,
            matchedFields: ['vendor_name', 'date_approximate'],
          },
          status: 'auto',
          exceptionCategory: 'Currency Gap',
        });
        usedBankIds.add(bank._id.toString());
        usedLedgerIds.add(ledger._id.toString());
        break;
      }
    }
  }

  // ========== PASS 5: Remaining unmatched ==========
  for (const bank of bankRecords) {
    if (usedBankIds.has(bank._id.toString())) continue;
    results.push({
      bankStatementId: bank._id,
      confidence: 'Unmatched',
      confidenceScore: 0,
      matchDetails: { matchedFields: [] },
      status: 'auto',
      exceptionCategory: bank.description?.toLowerCase().includes('fee') || bank.description?.toLowerCase().includes('charge')
        ? 'Bank Fee Not in Ledger'
        : 'Unknown',
    });
  }

  for (const ledger of ledgerRecords) {
    if (usedLedgerIds.has(ledger._id.toString())) continue;
    if (ledger.type === 'receivable') continue; // Receivables are expected to be unmatched
    results.push({
      ledgerId: ledger._id,
      confidence: 'Unmatched',
      confidenceScore: 0,
      matchDetails: { matchedFields: [] },
      status: 'auto',
      exceptionCategory: 'Timing Difference',
    });
  }

  // Save all results
  await MatchResult.insertMany(results);

  // Log the action
  await ActionLog.create({
    action: 'reconciliation_run',
    entityType: 'match',
    details: { totalResults: results.length, timestamp: new Date() },
  });

  return getMatchStats();
}

async function getMatchStats() {
  const results = await MatchResult.find({}).lean();
  const total = results.length;
  const byConfidence = {
    'Exact Match': results.filter(r => r.confidence === 'Exact Match').length,
    'Fuzzy Match': results.filter(r => r.confidence === 'Fuzzy Match').length,
    'Probable Duplicate': results.filter(r => r.confidence === 'Probable Duplicate').length,
    'Currency Mismatch': results.filter(r => r.confidence === 'Currency Mismatch').length,
    'Unmatched': results.filter(r => r.confidence === 'Unmatched').length,
  };
  const matched = byConfidence['Exact Match'] + byConfidence['Fuzzy Match'];
  const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;

  return { total, matched, matchRate, byConfidence };
}

async function getResults(filters = {}) {
  let query = {};
  if (filters.confidence) query.confidence = filters.confidence;
  if (filters.status) query.status = filters.status;

  const results = await MatchResult.find(query)
    .populate('bankStatementId')
    .populate('ledgerId')
    .populate('settlementId')
    .sort({ confidenceScore: -1 })
    .lean();

  return results;
}

async function overrideMatch(id, action, userId = 'user') {
  const update = {
    status: action, // 'confirmed' or 'rejected'
    manualOverride: true,
    overrideBy: userId,
    overrideAt: new Date(),
  };

  const result = await MatchResult.findByIdAndUpdate(id, update, { new: true });

  await ActionLog.create({
    action: `match_${action}`,
    entityType: 'match',
    entityId: id,
    details: { action, userId, timestamp: new Date() },
  });

  return result;
}

module.exports = { runMatching, getMatchStats, getResults, overrideMatch };
