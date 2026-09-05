const express = require('express');
const router = express.Router();
const seed = require('../seed/index');

router.post('/', async (req, res) => {
  try {
    await seed();
    res.json({ message: 'Database seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
