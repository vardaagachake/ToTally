const MatchResult = require('../models/MatchResult');
const { chat, MULTILINGUAL_SYSTEM_PROMPT } = require('../integrations/llm');

const EXCEPTION_CATEGORIES = [
  'Bank Fee Not in Ledger',
  'Timing Difference',
  'Duplicate Entry',
  'Currency Gap',
  'Unknown',
];

async function getExceptions(filters = {}) {
  let query = {
    confidence: { $in: ['Unmatched', 'Currency Mismatch', 'Probable Duplicate'] },
  };
  if (filters.category) query.exceptionCategory = filters.category;

  const exceptions = await MatchResult.find(query)
    .populate('bankStatementId')
    .populate('ledgerId')
    .populate('settlementId')
    .sort({ 'matchDetails.amountDiff': -1 })
    .lean();

  return exceptions;
}

async function explainException(exceptionId, language = 'en') {
  const exception = await MatchResult.findById(exceptionId)
    .populate('bankStatementId')
    .populate('ledgerId')
    .populate('settlementId')
    .lean();

  if (!exception) return null;

  const bank = exception.bankStatementId;
  const ledger = exception.ledgerId;
  const settlement = exception.settlementId;

  // Build context for LLM
  const context = `
Exception Category: ${exception.exceptionCategory || 'Unknown'}
Confidence: ${exception.confidence}
${bank ? `Bank Statement: Date ${new Date(bank.date).toLocaleDateString()}, Amount ${bank.currency} ${bank.amount}, Ref: ${bank.referenceNo}, Description: "${bank.description}"` : 'No bank statement record'}
${ledger ? `Ledger Entry: Date ${new Date(ledger.date).toLocaleDateString()}, Amount ${ledger.currency} ${ledger.amount}, Vendor: ${ledger.vendorName}, Invoice: ${ledger.invoiceNo}, Category: ${ledger.category}` : 'No ledger record'}
${settlement ? `Settlement: Date ${new Date(settlement.date).toLocaleDateString()}, Amount ${settlement.amount}, Fees: ${settlement.fees}, Tax: ${settlement.tax}` : 'No settlement record'}
Amount Difference: ₹${exception.matchDetails?.amountDiff || 'N/A'}
Date Gap: ${exception.matchDetails?.dateDiffDays || 'N/A'} days
  `.trim();

  const systemPrompt = `${MULTILINGUAL_SYSTEM_PROMPT}

You are explaining a financial reconciliation exception. Provide a concise, 1-2 sentence hypothesis about why this transaction is unmatched or flagged. Be specific — reference exact amounts, dates, and entities. If category is "Bank Fee Not in Ledger", explain that the bank likely charged a fee that wasn't recorded. If "Timing Difference", explain the date gap. If "Currency Gap", mention the exchange rate angle.`;

  const userMsg = language !== 'en'
    ? `Explain this exception in the user's preferred language (detect from context):\n${context}`
    : `Explain this reconciliation exception in one clear sentence:\n${context}`;

  const explanation = await chat(systemPrompt, userMsg);

  // Update the match result with explanation
  await MatchResult.findByIdAndUpdate(exceptionId, { exceptionExplanation: explanation });

  return {
    id: exceptionId,
    category: exception.exceptionCategory,
    confidence: exception.confidence,
    explanation,
    bankStatement: bank,
    ledger,
    settlement,
    matchDetails: exception.matchDetails,
  };
}

async function getExceptionSummary() {
  const exceptions = await MatchResult.find({
    confidence: { $in: ['Unmatched', 'Currency Mismatch', 'Probable Duplicate'] },
  }).populate('bankStatementId').populate('ledgerId').lean();

  const byCategory = {};
  let totalAmount = 0;

  for (const ex of exceptions) {
    const cat = ex.exceptionCategory || 'Unknown';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, totalAmount: 0 };
    byCategory[cat].count++;
    const amt = ex.bankStatementId?.amount || ex.ledgerId?.amount || 0;
    byCategory[cat].totalAmount += amt;
    totalAmount += amt;
  }

  return {
    totalExceptions: exceptions.length,
    totalAmount: Math.round(totalAmount),
    byCategory,
    categories: EXCEPTION_CATEGORIES,
  };
}

module.exports = { getExceptions, explainException, getExceptionSummary };
