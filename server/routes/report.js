const express = require('express');
const router = express.Router();
const { generateReport, generatePDF } = require('../engines/reportEngine');

router.get('/generate', async (req, res) => {
  try {
    const { lang } = req.query;
    const report = await generateReport(lang || 'en');
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pdf', async (req, res) => {
  try {
    const report = await generateReport('en');
    const pdf = await generatePDF(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=ToTally_Closing_Report.pdf');
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
