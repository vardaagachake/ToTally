const express = require('express');
const router = express.Router();
const { generateForecast, applyScenario } = require('../engines/forecastEngine');

router.get('/', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const forecast = await generateForecast(days);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scenario', async (req, res) => {
  try {
    const { scenarioType, params } = req.body;
    const result = await applyScenario(scenarioType, params || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
