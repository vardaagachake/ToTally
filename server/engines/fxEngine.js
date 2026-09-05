const MatchResult = require('../models/MatchResult');
const FXRate = require('../models/FXRate');

const FX_TOLERANCE_PCT = 0.03; // 3% tolerance for FX-explained gaps

async function checkFXDrift() {
  // Get currency mismatch and potential FX-related records
  const candidates = await MatchResult.find({
    $or: [
      { confidence: 'Currency Mismatch' },
      { confidence: { $in: ['Fuzzy Match', 'Unmatched'] } },
    ],
  }).populate('bankStatementId').populate('ledgerId').lean();

  const results = [];

  for (const match of candidates) {
    const bank = match.bankStatementId;
    const ledger = match.ledgerId;

    if (!bank || !ledger) continue;

    // Check if currencies differ
    const hasCurrencyDiff = bank.currency !== ledger.currency;
    
    // Or same currency but suspicious value gap
    const hasValueGap = bank.currency === ledger.currency && 
      Math.abs(bank.amount - ledger.amount) > 100 &&
      Math.abs(bank.amount - ledger.amount) / Math.max(bank.amount, ledger.amount) > 0.01;

    if (!hasCurrencyDiff && !hasValueGap) continue;

    // Get FX rates for transaction date and settlement date
    const bankDate = new Date(bank.date);
    const ledgerDate = new Date(ledger.date);

    const fromCurrency = bank.currency === 'INR' ? ledger.currency : bank.currency;
    const toCurrency = 'INR';

    if (fromCurrency === toCurrency) continue;

    const bankDateRate = await FXRate.findOne({
      fromCurrency,
      toCurrency,
      date: { $gte: new Date(bankDate.setHours(0,0,0,0)), $lt: new Date(bankDate.setHours(23,59,59,999)) },
    }).lean();

    const ledgerDateRate = await FXRate.findOne({
      fromCurrency,
      toCurrency,
      date: { $gte: new Date(ledgerDate.setHours(0,0,0,0)), $lt: new Date(ledgerDate.setHours(23,59,59,999)) },
    }).lean();

    if (!bankDateRate || !ledgerDateRate) continue;

    const rateOnBankDate = bankDateRate.rate;
    const rateOnLedgerDate = ledgerDateRate.rate;

    // Compute expected INR values based on the Bank Date rate (the actual rate the bank used for conversion)
    const foreignAmount = bank.currency !== 'INR' ? bank.amount : ledger.amount;
    const expectedINR_bankDate = foreignAmount * rateOnBankDate;
    
    // The actual INR is what hit the ledger (or bank if bank is INR)
    const actualINR = bank.currency === 'INR' ? bank.amount : ledger.amount;

    const gapFromBankRate = Math.abs(actualINR - expectedINR_bankDate);
    const rateDiffPct = (rateOnLedgerDate - rateOnBankDate) / rateOnBankDate;

    // Determine if gap is explained by FX drift
    // Compare actual INR gap to the expected gap. Allow a tiny tolerance for rounding differences.
    const isExplainedByFX = gapFromBankRate / actualINR <= FX_TOLERANCE_PCT;

    const analysis = {
      isApplicable: true,
      foreignAmount,
      foreignCurrency: fromCurrency,
      expectedAmount_bankDate: Math.round(expectedINR_bankDate),
      actualAmount: Math.round(actualINR),
      rateOnBankDate,
      rateOnLedgerDate,
      rateDrift: Math.round(rateDiffPct * 10000) / 100, // percentage
      verdict: isExplainedByFX ? 'Explained by FX Drift' : 'Real Discrepancy',
    };

    // Update match result
    await MatchResult.findByIdAndUpdate(match._id, { fxAnalysis: analysis });

    results.push({
      matchId: match._id,
      bankRef: bank.referenceNo,
      ledgerInv: ledger.invoiceNo,
      bankDate: bank.date,
      ledgerDate: ledger.date,
      ...analysis,
    });
  }

  return results;
}

async function getFXRates(fromCurrency = 'USD', toCurrency = 'INR') {
  const rates = await FXRate.find({ fromCurrency, toCurrency })
    .sort({ date: 1 })
    .lean();
  
  // Get flagged FX transactions for markers matching the currency
  const fxResults = await MatchResult.find({
    'fxAnalysis.isApplicable': true,
    'fxAnalysis.foreignCurrency': fromCurrency,
  }).populate('bankStatementId').lean();

  const markers = fxResults.map(r => ({
    date: r.bankStatementId?.date,
    verdict: r.fxAnalysis?.verdict,
    amount: r.fxAnalysis?.foreignAmount,
    bankRef: r.bankStatementId?.referenceNo,
  }));

  return { rates, markers };
}

module.exports = { checkFXDrift, getFXRates };
