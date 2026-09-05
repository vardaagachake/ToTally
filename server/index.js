require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reconciliation', require('./routes/reconciliation'));
app.use('/api/exceptions', require('./routes/exceptions'));
app.use('/api/fx', require('./routes/fx'));
app.use('/api/self-audit', require('./routes/selfAudit'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/tax', require('./routes/tax'));
app.use('/api/forecast', require('./routes/forecast'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/report', require('./routes/report'));
app.use('/api/actions', require('./routes/actions'));
app.use('/api/seed', require('./routes/seed'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    razorpay: !!(process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_xxx')),
    llm: !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
    smtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER !== 'your-email@gmail.com'),
  });
});

// Connect to MongoDB and start server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/totally';
const USE_MEMORY_DB = process.env.USE_MEMORY_DB !== 'false'; // Default true for demo prototype

async function startServer() {
  let uriToConnect = MONGODB_URI;
  
  if (USE_MEMORY_DB) {
    console.log('🔄 Starting in-memory MongoDB for demo mode...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    uriToConnect = mongoServer.getUri();
  }

  mongoose.connect(uriToConnect)
    .then(async () => {
      console.log(`✅ Connected to MongoDB (${USE_MEMORY_DB ? 'In-Memory' : 'Live'})`);
      
      // Check if data exists, seed if empty
      const BankStatement = require('./models/BankStatement');
      const count = await BankStatement.countDocuments();
      if (count === 0) {
        console.log('📦 No data found — running seed script...');
        const seed = require('./seed/index');
        await seed();
      }
      
      app.listen(PORT, () => {
        console.log(`🚀 ToTally server running on http://localhost:${PORT}`);
        console.log(`📊 API available at http://localhost:${PORT}/api`);
      });
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      console.log('⚠️  Starting server without MongoDB (limited functionality)...');
      
      app.listen(PORT, () => {
        console.log(`🚀 ToTally server running on http://localhost:${PORT} (no DB)`);
      });
    });
}

startServer();
