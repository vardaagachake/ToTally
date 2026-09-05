const express = require('express');
const router = express.Router();
const { handleQuestion } = require('../engines/chatEngine');

router.post('/', async (req, res) => {
  try {
    const { question, language } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });
    const result = await handleQuestion(question, language || 'auto');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
