const express = require('express');
const router = express.Router();
const { getMatchStats } = require('../engines/matchEngine');
const { getExceptionSummary } = require('../engines/exceptionEngine');
const { getVendorAnomalies } = require('../engines/vendorEngine');
const { generateForecast } = require('../engines/forecastEngine');

router.get('/', async (req, res) => {
  try {
    const [matchStats, exceptionSummary, vendorAnomalies, forecast] = await Promise.all([
      getMatchStats(),
      getExceptionSummary(),
      getVendorAnomalies(),
      generateForecast(30),
    ]);

    res.json({
      matchRate: matchStats.matchRate,
      totalTransactions: matchStats.total,
      matched: matchStats.matched,
      byConfidence: matchStats.byConfidence,
      exceptionsTotal: exceptionSummary.totalExceptions,
      exceptionsAmount: exceptionSummary.totalAmount,
      vendorAnomaliesCount: vendorAnomalies.length,
      forecastSnapshot: {
        currentCash: forecast.currentCash,
        day30: forecast.baseline[30]?.cash || 0,
        unresolvedRisk: forecast.unresolvedExceptionAmount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
