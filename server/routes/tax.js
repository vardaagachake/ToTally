const express = require('express');
const router = express.Router();
const { classifyTransactions, overrideTaxClassification, getTaxSummary, getTaxRules } = require('../engines/taxEngine');

router.get('/classify', async (req, res) => {
  try {
    const results = await classifyTransactions();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await getTaxSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rules', async (req, res) => {
  try {
    const rules = await getTaxRules();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/override/:ledgerId', async (req, res) => {
  try {
    const { ruleId } = req.body;
    const result = await overrideTaxClassification(req.params.ledgerId, ruleId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
