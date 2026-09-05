const express = require('express');
const router = express.Router();
const { checkFXDrift, getFXRates } = require('../engines/fxEngine');

router.get('/check', async (req, res) => {
  try {
    const results = await checkFXDrift();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rates', async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await getFXRates(from || 'USD', to || 'INR');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
