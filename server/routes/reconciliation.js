const express = require('express');
const router = express.Router();
const { runMatching, getResults, overrideMatch } = require('../engines/matchEngine');

router.post('/run', async (req, res) => {
  try {
    const stats = await runMatching();
    res.json({ message: 'Reconciliation complete', stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    const { confidence, status } = req.query;
    const results = await getResults({ confidence, status });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/override/:id', async (req, res) => {
  try {
    const { action } = req.body; // 'confirmed' or 'rejected'
    if (!['confirmed', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "confirmed" or "rejected"' });
    }
    const result = await overrideMatch(req.params.id, action);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
