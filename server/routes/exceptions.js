const express = require('express');
const router = express.Router();
const { getExceptions, explainException, getExceptionSummary } = require('../engines/exceptionEngine');

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const exceptions = await getExceptions({ category });
    res.json(exceptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await getExceptionSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/explain/:id', async (req, res) => {
  try {
    const { lang } = req.query;
    const explanation = await explainException(req.params.id, lang);
    if (!explanation) return res.status(404).json({ error: 'Exception not found' });
    res.json(explanation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
