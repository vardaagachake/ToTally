const BankStatement = require('../models/BankStatement');
const Ledger = require('../models/Ledger');
const Settlement = require('../models/Settlement');
const MatchResult = require('../models/MatchResult');
const Vendor = require('../models/Vendor');
const { chat, MULTILINGUAL_SYSTEM_PROMPT } = require('../integrations/llm');

async function handleQuestion(question, language = 'auto') {
  // Step 1: Determine what data to query based on the question
  const queryPlan = await planQuery(question);
  
  // Step 2: Execute the queries
  const sourceRows = await executeQueries(queryPlan);
  
  // Step 3: Generate answer grounded in data
  const answer = await generateAnswer(question, sourceRows, language);
  
  return {
    question,
    answer,
    sourceRows,
    queryPlan,
    language: language === 'auto' ? 'detected' : language,
  };
}

async function planQuery(question) {
  const lower = question.toLowerCase();
  const plans = [];

  // Amount-based queries
  const amountMatch = question.match(/₹?\s*(\d[\d,]*\.?\d*)/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    plans.push({ collection: 'bank', query: { amount: { $gte: amount - 50, $lte: amount + 50 } }, label: 'Bank statements around ₹' + amount });
    plans.push({ collection: 'ledger', query: { amount: { $gte: amount - 50, $lte: amount + 50 } }, label: 'Ledger entries around ₹' + amount });
  }

  // Vendor-based queries
  const vendors = await Vendor.find({}).lean();
  for (const v of vendors) {
    const firstName = v.name.split(' ')[0].toLowerCase();
    if (lower.includes(firstName)) {
      plans.push({ collection: 'ledger', query: { vendorName: v.name }, label: `Ledger entries for ${v.name}` });
      plans.push({ collection: 'vendor', query: { name: v.name }, label: `Vendor info for ${v.name}` });
    }
  }

  // Exception/mismatch queries
  if (lower.includes('exception') || lower.includes('mismatch') || lower.includes('unmatched') ||
      lower.includes('hisab') || lower.includes('galti') || lower.includes('problem')) {
    plans.push({ collection: 'matches', query: { confidence: { $in: ['Unmatched', 'Currency Mismatch'] } }, label: 'Unmatched/exception records' });
  }

  // Settlement queries
  if (lower.includes('settlement') || lower.includes('razorpay') || lower.includes('settle')) {
    plans.push({ collection: 'settlement', query: {}, label: 'Settlement records' });
  }

  // Tax queries
  if (lower.includes('tax') || lower.includes('gst') || lower.includes('slab')) {
    plans.push({ collection: 'matches', query: { 'taxClassification.gstRate': { $exists: true } }, label: 'Tax-classified records' });
  }

  // Default: get recent data
  if (plans.length === 0) {
    plans.push({ collection: 'bank', query: {}, limit: 10, label: 'Recent bank statements' });
    plans.push({ collection: 'matches', query: {}, limit: 10, label: 'Recent match results' });
  }

  return plans;
}

async function executeQueries(plans) {
  const results = {};

  for (const plan of plans) {
    const limit = plan.limit || 20;

    switch (plan.collection) {
      case 'bank':
        results[plan.label] = await BankStatement.find(plan.query).limit(limit).lean();
        break;
      case 'ledger':
        results[plan.label] = await Ledger.find(plan.query).limit(limit).lean();
        break;
      case 'settlement':
        results[plan.label] = await Settlement.find(plan.query).limit(limit).lean();
        break;
      case 'vendor':
        results[plan.label] = await Vendor.find(plan.query).limit(limit).lean();
        break;
      case 'matches':
        results[plan.label] = await MatchResult.find(plan.query)
          .populate('bankStatementId')
          .populate('ledgerId')
          .populate('settlementId')
          .limit(limit).lean();
        break;
    }
  }

  return results;
}

async function generateAnswer(question, sourceRows, language) {
  const dataContext = JSON.stringify(sourceRows, null, 2).substring(0, 4000);

  const systemPrompt = `${MULTILINGUAL_SYSTEM_PROMPT}

You are answering a question about financial reconciliation data. Ground your answer in the actual data provided below. Reference specific transaction IDs, amounts, dates, and vendors. Be concise and helpful.

ACTUAL DATA FROM DATABASE:
${dataContext}`;

  const answer = await chat(systemPrompt, question);
  return answer;
}

module.exports = { handleQuestion };
