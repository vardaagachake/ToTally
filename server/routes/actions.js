const express = require('express');
const router = express.Router();
const ActionLog = require('../models/ActionLog');

router.get('/', async (req, res) => {
  try {
    const { entityType, limit } = req.query;
    let query = {};
    if (entityType) query.entityType = entityType;
    
    const actions = await ActionLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit) || 100)
      .lean();
    
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
