const express = require('express');
const router = express.Router();
const { runSelfAudit } = require('../engines/selfAuditEngine');

router.get('/', async (req, res) => {
  try {
    const audit = await runSelfAudit();
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
