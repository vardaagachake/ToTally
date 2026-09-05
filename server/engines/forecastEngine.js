const Ledger = require('../models/Ledger');
const MatchResult = require('../models/MatchResult');

async function generateForecast(days = 90) {
  const now = new Date();
  
  // Get current cash position from ledger
  const allEntries = await Ledger.find({}).lean();
  
  let currentCash = 0;
  for (const entry of allEntries) {
    if (entry.type === 'receivable') currentCash += entry.amount;
    else currentCash -= entry.amount;
  }
  // Start with a positive base
  currentCash = Math.abs(currentCash) + 500000;

  // Get unresolved exception amount for uncertainty band
  const exceptions = await MatchResult.find({
    confidence: { $in: ['Unmatched', 'Currency Mismatch'] },
  }).populate('bankStatementId').populate('ledgerId').lean();

  let unresolvedAmount = 0;
  for (const ex of exceptions) {
    unresolvedAmount += ex.bankStatementId?.amount || ex.ledgerId?.amount || 0;
  }

  // Calculate expected receivables and payables per day
  const receivables = allEntries.filter(e => e.type === 'receivable');
  const payables = allEntries.filter(e => e.type === 'payable');
  
  const avgDailyReceivable = receivables.length > 0
    ? receivables.reduce((s, e) => s + e.amount, 0) / 30
    : 15000;
  const avgDailyPayable = payables.length > 0
    ? payables.reduce((s, e) => s + e.amount, 0) / 45
    : 12000;

  // Generate forecast data points
  const baseline = [];
  let cash = currentCash;

  for (let d = 0; d <= days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    
    // Add some variance
    const dailyIn = avgDailyReceivable * (0.7 + Math.random() * 0.6);
    const dailyOut = avgDailyPayable * (0.8 + Math.random() * 0.4);
    cash += dailyIn - dailyOut;

    // Uncertainty band grows with unresolved exceptions
    const bandWidth = unresolvedAmount * (0.5 + d / days * 0.5);

    baseline.push({
      date: date.toISOString().split('T')[0],
      day: d,
      cash: Math.round(cash),
      upper: Math.round(cash + bandWidth / 2),
      lower: Math.round(cash - bandWidth / 2),
    });
  }

  return {
    baseline,
    currentCash: Math.round(currentCash),
    unresolvedExceptionAmount: Math.round(unresolvedAmount),
    avgDailyReceivable: Math.round(avgDailyReceivable),
    avgDailyPayable: Math.round(avgDailyPayable),
    forecastDays: days,
  };
}

async function applyScenario(scenarioType, params = {}) {
  const forecast = await generateForecast(params.days || 90);
  const scenario = [...forecast.baseline];

  switch (scenarioType) {
    case 'late_payment': {
      // Customer pays X days late
      const delayDays = params.delayDays || 30;
      const amount = params.amount || forecast.avgDailyReceivable * delayDays;
      
      for (let i = 0; i < scenario.length; i++) {
        if (i < delayDays) {
          scenario[i].cash -= amount / delayDays * (delayDays - i);
        }
        scenario[i].scenarioCash = scenario[i].cash;
      }
      break;
    }

    case 'early_vendor_payment': {
      // Vendor payment pulled forward by X weeks
      const forwardDays = params.forwardDays || 14;
      const amount = params.amount || forecast.avgDailyPayable * 14;
      
      for (let i = 0; i < scenario.length; i++) {
        if (i < forwardDays) {
          scenario[i].cash -= amount * (1 - i / forwardDays);
        }
        scenario[i].scenarioCash = scenario[i].cash;
      }
      break;
    }

    case 'one_time_expense': {
      // One-time expense at day X
      const expenseDay = params.day || 15;
      const amount = params.amount || 100000;
      
      for (let i = 0; i < scenario.length; i++) {
        if (i >= expenseDay) {
          scenario[i].cash -= amount;
        }
        scenario[i].scenarioCash = scenario[i].cash;
      }
      break;
    }

    case 'custom': {
      const { amount = 0, delayDays = 0, direction = 'out' } = params;
      const startDay = params.startDay || 0;
      
      for (let i = 0; i < scenario.length; i++) {
        if (i >= startDay && i < startDay + (delayDays || 1)) {
          scenario[i].cash += direction === 'in' ? amount : -amount;
        }
        scenario[i].scenarioCash = scenario[i].cash;
      }
      break;
    }
  }

  return {
    scenario,
    scenarioType,
    params,
    baseline: forecast.baseline,
    unresolvedExceptionAmount: forecast.unresolvedExceptionAmount,
  };
}

module.exports = { generateForecast, applyScenario };
