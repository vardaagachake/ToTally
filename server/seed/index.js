const mongoose = require('mongoose');
const BankStatement = require('../models/BankStatement');
const Ledger = require('../models/Ledger');
const Settlement = require('../models/Settlement');
const Vendor = require('../models/Vendor');
const TaxRule = require('../models/TaxRule');
const FXRate = require('../models/FXRate');
const MatchResult = require('../models/MatchResult');
const ActionLog = require('../models/ActionLog');

// Helper: generate date within last N days
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// 15 Vendors with mixed payment terms and some intentional anomalies
const vendors = [
  { name: 'TechServ Solutions', paymentTerms: 'Net 15', paymentTermDays: 15, contactEmail: 'billing@techserv.example.com', category: 'IT Services' },
  { name: 'CloudHost India', paymentTerms: 'Net 30', paymentTermDays: 30, contactEmail: 'accounts@cloudhost.example.com', category: 'Cloud Infrastructure' },
  { name: 'OfficeSupply Co', paymentTerms: 'Net 15', paymentTermDays: 15, contactEmail: 'payments@officesupply.example.com', category: 'Office Supplies' },
  { name: 'Digital Marketing Pro', paymentTerms: 'Net 30', paymentTermDays: 30, contactEmail: 'finance@digimktg.example.com', category: 'Marketing' },
  { name: 'SecureNet Systems', paymentTerms: 'Net 45', paymentTermDays: 45, contactEmail: 'ap@securenet.example.com', category: 'Security' },
  { name: 'PayWise Consulting', paymentTerms: 'Net 15', paymentTermDays: 15, contactEmail: 'invoices@paywise.example.com', category: 'Consulting' },
  { name: 'FastLogistics Ltd', paymentTerms: 'Net 30', paymentTermDays: 30, contactEmail: 'billing@fastlog.example.com', category: 'Logistics' },
  { name: 'Greenleaf Catering', paymentTerms: 'Net 15', paymentTermDays: 15, contactEmail: 'orders@greenleaf.example.com', category: 'Catering' },
  { name: 'Apex Software', paymentTerms: 'Net 30', paymentTermDays: 30, contactEmail: 'renewals@apex.example.com', category: 'Software License' },
  { name: 'TravelEase Corp', paymentTerms: 'Net 15', paymentTermDays: 15, contactEmail: 'bookings@travelease.example.com', category: 'Travel' },
  { name: 'DesignWorks Studio', paymentTerms: 'Net 30', paymentTermDays: 30, contactEmail: 'hello@designworks.example.com', category: 'Marketing' },
  { name: 'City Power & Light', paymentTerms: 'Net 15', paymentTermDays: 15, contactEmail: 'support@citypower.example.com', category: 'Utilities' },
  { name: 'LegalMinds Partners', paymentTerms: 'Net 45', paymentTermDays: 45, contactEmail: 'billing@legalminds.example.com', category: 'Legal' },
  { name: 'CleanSweep Services', paymentTerms: 'Net 15', paymentTermDays: 15, contactEmail: 'invoices@cleansweep.example.com', category: 'Maintenance' },
  { name: 'Global Importers Inc', paymentTerms: 'Net 30', paymentTermDays: 30, contactEmail: 'finance@globalimport.example.com', category: 'Import Goods' },
];

const taxRules = [
  { ruleId: 'TX-01', description: 'Exempt: Agricultural produce and essential food items', gstRate: 0, condition: { categories: ['Agricultural', 'Essential Food'], amountMin: 0, amountMax: 999999, invoiceType: 'goods', exemptCategories: [] }, priority: 10 },
  { ruleId: 'TX-02', description: 'GST 5%: Office supplies and stationery below ₹10,000', gstRate: 5, condition: { categories: ['Office Supplies'], amountMin: 0, amountMax: 10000, invoiceType: 'goods', exemptCategories: [] }, priority: 8 },
  { ruleId: 'TX-03', description: 'GST 12%: Transportation and logistics services', gstRate: 12, condition: { categories: ['Logistics', 'Travel', 'Transport'], amountMin: 0, amountMax: 999999, invoiceType: 'service', exemptCategories: [] }, priority: 7 },
  { ruleId: 'TX-04', description: 'GST 18%: Service invoices above ₹5,000 not in the exempt category', gstRate: 18, condition: { categories: ['IT Services', 'Cloud Infrastructure', 'Marketing', 'Consulting', 'Security', 'Software License', 'Legal'], amountMin: 5000, amountMax: 999999, invoiceType: 'service', exemptCategories: ['Agricultural', 'Essential Food'] }, priority: 5 },
  { ruleId: 'TX-05', description: 'GST 18%: Catering services for corporate events', gstRate: 18, condition: { categories: ['Catering'], amountMin: 0, amountMax: 999999, invoiceType: 'service', exemptCategories: [] }, priority: 6 },
  { ruleId: 'TX-06', description: 'GST 28%: Luxury goods and premium software licenses above ₹50,000', gstRate: 28, condition: { categories: ['Software License', 'Luxury Goods'], amountMin: 50000, amountMax: 999999, invoiceType: 'goods', exemptCategories: [] }, priority: 9 },
  { ruleId: 'TX-07', description: 'GST 5%: Low-value service invoices below ₹5,000', gstRate: 5, condition: { categories: ['IT Services', 'Consulting', 'Marketing'], amountMin: 0, amountMax: 4999, invoiceType: 'service', exemptCategories: [] }, priority: 6 },
  { ruleId: 'TX-08', description: 'GST 12%: Office supplies and stationery above ₹10,000', gstRate: 12, condition: { categories: ['Office Supplies'], amountMin: 10001, amountMax: 999999, invoiceType: 'goods', exemptCategories: [] }, priority: 8 },
];

async function seed() {
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/totally';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for seeding...');
  } else {
    console.log('Using existing MongoDB connection for seeding...');
  }

  // Clear existing data
  await Promise.all([
    BankStatement.deleteMany({}),
    Ledger.deleteMany({}),
    Settlement.deleteMany({}),
    Vendor.deleteMany({}),
    TaxRule.deleteMany({}),
    FXRate.deleteMany({}),
    MatchResult.deleteMany({}),
    ActionLog.deleteMany({}),
  ]);
  console.log('Cleared existing data.');

  // Seed Tax Rules
  await TaxRule.insertMany(taxRules);

  // Seed Vendors with historical data
  const vendorDocs = [];
  for (const v of vendors) {
    const historicalInvoices = [];
    for (let i = 0; i < 6; i++) {
      historicalInvoices.push({
        amount: randomBetween(5000, 25000),
        date: daysAgo(60 + i * 30),
        invoiceNo: `HIST-${v.name.substring(0, 3).toUpperCase()}-${100 + i}`,
      });
    }
    vendorDocs.push({ ...v, historicalInvoices });
  }
  await Vendor.insertMany(vendorDocs);

  // Seed FX Rates for multiple currencies (USD, EUR, GBP, AED, SGD to INR for last 60 days)
  const fxRates = [];
  const baseRates = { USD: 83.20, EUR: 89.50, GBP: 104.30, AED: 22.65, SGD: 61.80 };
  const currencyDrifts = { USD: 0, EUR: 0, GBP: 0, AED: 0, SGD: 0 };
  
  for (const currency of Object.keys(baseRates)) {
    let currentRate = baseRates[currency];
    for (let i = 60; i >= 0; i--) {
      // Different currencies drift differently
      const drift = randomBetween(-0.4, 0.45);
      currencyDrifts[currency] += drift;
      currentRate = baseRates[currency] + currencyDrifts[currency];
      // Keep within reasonable bounds
      currentRate = Math.max(baseRates[currency] * 0.9, Math.min(baseRates[currency] * 1.1, currentRate));
      
      fxRates.push({
        date: daysAgo(i),
        fromCurrency: currency,
        toCurrency: 'INR',
        rate: Math.round(currentRate * 100) / 100,
      });
    }
  }
  await FXRate.insertMany(fxRates);

  const bankStatements = [];
  const ledgerEntries = [];
  const settlements = [];

  // Group 1: Perfect 3-way matches (40 records) - ensures strong baseline
  for (let i = 0; i < 40; i++) {
    const day = Math.floor(Math.random() * 45) + 5;
    const amount = randomBetween(1000, 80000);
    const vendor = vendors[i % vendors.length];
    const ref = `REF-${String(1000 + i).padStart(5, '0')}`;
    const inv = `INV-${String(2000 + i).padStart(5, '0')}`;
    const settId = `setl_${String(3000 + i).padStart(8, '0')}`;

    bankStatements.push({ date: daysAgo(day), amount, currency: 'INR', referenceNo: ref, description: `Payment to ${vendor.name} - ${inv}`, type: 'debit' });
    ledgerEntries.push({ date: daysAgo(day), amount, currency: 'INR', vendorName: vendor.name, invoiceNo: inv, category: vendor.category, type: 'payable', description: `Invoice ${inv}` });
    
    const fees = Math.round(amount * 0.02);
    const tax = Math.round(fees * 0.18);
    settlements.push({ settlementId: settId, entityId: ref, type: 'payment', amount: amount - fees - tax, fees, tax, utr: `UTR${String(4000 + i).padStart(10, '0')}`, date: daysAgo(day - 1), status: 'processed', currency: 'INR' });
  }

  // Group 2: Perfect 2-way Bank-Ledger matches (65 records) - bulk of normal ops
  for (let i = 0; i < 65; i++) {
    const day = Math.floor(Math.random() * 45) + 5;
    const amount = randomBetween(500, 50000);
    const vendor = vendors[(i + 3) % vendors.length];
    const ref = `REF-B-${String(1000 + i).padStart(5, '0')}`;
    const inv = `INV-L-${String(2000 + i).padStart(5, '0')}`;

    bankStatements.push({ date: daysAgo(day), amount, currency: 'INR', referenceNo: ref, description: `NEFT to ${vendor.name}`, type: 'debit' });
    ledgerEntries.push({ date: daysAgo(day), amount, currency: 'INR', vendorName: vendor.name, invoiceNo: ref, category: vendor.category, type: 'payable', description: `Invoice matched to ${ref}` });
  }

  // Group 3: Fuzzy matches — amount off slightly or date off (10 records)
  for (let i = 0; i < 10; i++) {
    const day = Math.floor(Math.random() * 45) + 8;
    const amount = randomBetween(3000, 40000);
    const vendor = vendors[(i + 7) % vendors.length];
    const ref = `REF-FZ-${String(1100 + i).padStart(5, '0')}`;
    const inv = `INV-FZ-${String(2100 + i).padStart(5, '0')}`;
    const amtOffset = randomBetween(-45, 45); // within ±₹50

    bankStatements.push({ date: daysAgo(day), amount: amount + amtOffset, currency: 'INR', referenceNo: ref, description: `Payment ${vendor.name} ${inv}`, type: 'debit' });
    ledgerEntries.push({ date: daysAgo(day + (Math.random() > 0.5 ? 1 : -1)), amount, currency: 'INR', vendorName: vendor.name, invoiceNo: inv, category: vendor.category, type: 'payable', description: `Invoice ${inv}` });
  }

  // Group 4: FX mismatch (15 records) - Foreign currency in bank, INR in ledger, WITH staggered dates for drift
  const foreignCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'SGD'];
  for (let i = 0; i < 15; i++) {
    const bankDay = Math.floor(Math.random() * 40) + 10;
    // Stagger ledger day by 2-5 days so the exchange rate actually drifts
    const ledgerDay = bankDay + randomBetween(2, 5); 
    
    const fc = foreignCurrencies[i % foreignCurrencies.length];
    const fcAmount = randomBetween(500, 5000);
    
    const ledgerFxRate = fxRates.find(r => r.fromCurrency === fc && r.date.toDateString() === daysAgo(ledgerDay).toDateString()) || { rate: baseRates[fc] };
    const bankFxRate = fxRates.find(r => r.fromCurrency === fc && r.date.toDateString() === daysAgo(bankDay).toDateString()) || { rate: baseRates[fc] };
    
    // The expected amount is the invoice amount recorded on the ledger date
    const inrAmountLedger = Math.round(fcAmount * ledgerFxRate.rate);
    
    const vendor = vendors.find(v => v.name === 'Global Importers Inc') || vendors[0];
    const ref = `REF-FX-${String(1200 + i).padStart(5, '0')}`;
    const inv = `INV-FX-${String(2200 + i).padStart(5, '0')}`;

    // Bank records the transaction on bankDay, but uses bankDay's exchange rate which is different from ledgerDay's
    // To simulate a genuine FX drift, we record the foreign amount on the bank
    // The bank amount is the exact FC amount, ledger is INR amount
    bankStatements.push({ date: daysAgo(bankDay), amount: fcAmount, currency: fc, referenceNo: ref, description: `Wire transfer ${vendor.name}`, type: 'debit' });
    
    // Add small occasional data-entry drift on top of FX for some rows to simulate Real Discrepancy vs FX Explained
    const realDiscrepancyOffset = i % 3 === 0 ? randomBetween(500, 1500) : 0; 
    
    ledgerEntries.push({ date: daysAgo(ledgerDay), amount: inrAmountLedger + realDiscrepancyOffset, currency: 'INR', vendorName: vendor.name, invoiceNo: inv, category: vendor.category, type: 'payable', description: `Foreign invoice ${inv}` });
  }

  // Group 5: Bank-only records (15 records - fees, unknown debits)
  for (let i = 0; i < 15; i++) {
    const day = Math.floor(Math.random() * 50) + 5;
    bankStatements.push({ date: daysAgo(day), amount: randomBetween(50, 1500), currency: 'INR', referenceNo: `REF-BKO-${String(1300 + i).padStart(5, '0')}`, description: i < 8 ? `Bank processing fee` : `Unknown withdrawal charge`, type: 'debit' });
  }

  // Group 6: Probable duplicates (5 pairs)
  for (let i = 0; i < 5; i++) {
    const day = Math.floor(Math.random() * 40) + 10;
    const amount = randomBetween(5000, 30000);
    const vendor = vendors[i % vendors.length];

    bankStatements.push({ date: daysAgo(day), amount, currency: 'INR', referenceNo: `REF-DP-${String(1400 + i * 2).padStart(5, '0')}`, description: `Payment to ${vendor.name}`, type: 'debit' });
    bankStatements.push({ date: daysAgo(day - 1), amount, currency: 'INR', referenceNo: `REF-DP-${String(1401 + i * 2).padStart(5, '0')}`, description: `Payment to ${vendor.name} - retry`, type: 'debit' });
    ledgerEntries.push({ date: daysAgo(day), amount, currency: 'INR', vendorName: vendor.name, invoiceNo: `INV-DP-${String(2400 + i).padStart(5, '0')}`, category: vendor.category, type: 'payable', description: `Invoice from ${vendor.name}` });
  }

  // Group 7: Receivables for Cash Flow Forecast (20 records)
  for (let i = 0; i < 20; i++) {
    const day = Math.floor(Math.random() * 20); // recent days for active forecasting
    ledgerEntries.push({ date: daysAgo(day), amount: randomBetween(15000, 150000), currency: 'INR', customerName: `Customer ${String.fromCharCode(65 + i)}`, invoiceNo: `RECV-${String(5000 + i).padStart(5, '0')}`, category: 'Revenue', type: 'receivable', description: `Expected inbound from Customer ${String.fromCharCode(65 + i)}` });
  }

  // Group 8: Vendor Anomalies (3 spikes)
  const anomalyVendors = [vendors[0], vendors[2], vendors[4]]; // TechServ, OfficeSupply, SecureNet
  anomalyVendors.forEach((v, i) => {
    const avgHist = 15000;
    const spikeAmount = avgHist * (i + 2.5); // 2.5x to 4.5x spikes
    ledgerEntries.push({ date: daysAgo(3), amount: spikeAmount, currency: 'INR', vendorName: v.name, invoiceNo: `INV-SPIKE-${i}`, category: v.category, type: 'payable', description: `Unusual large invoice from ${v.name}` });
    bankStatements.push({ date: daysAgo(3), amount: spikeAmount, currency: 'INR', referenceNo: `REF-SPIKE-${i}`, description: `Large payment to ${v.name}`, type: 'debit' });
  });

  // Group 9: Overdue Payments (2 intentional overdues past net terms)
  const overdueVendors = [vendors[1], vendors[3]]; // CloudHost (Net 30), Digital Marketing Pro (Net 30)
  overdueVendors.forEach((v, i) => {
    const invoiceDate = daysAgo(v.paymentTermDays + 8 + i * 2); // 8-10 days overdue
    ledgerEntries.push({ date: invoiceDate, amount: randomBetween(12000, 25000), currency: 'INR', vendorName: v.name, invoiceNo: `INV-OVERDUE-${i}`, category: v.category, type: 'payable', description: `Overdue invoice from ${v.name}` });
  });

  // Action Logs (Pre-seed a few logs)
  const actionLogs = [
    { action: 'Approve Match', entityType: 'MatchResult', entityId: 'mock-id-1', details: { message: 'Approved fuzzy match manually.' }, timestamp: daysAgo(1) },
    { action: 'Send Email Reminder', entityType: 'Vendor', entityId: 'mock-id-2', details: { vendor: 'PayWise Consulting', amount: 8750 }, timestamp: daysAgo(2) }
  ];
  await ActionLog.insertMany(actionLogs);

  await BankStatement.insertMany(bankStatements);
  await Ledger.insertMany(ledgerEntries);
  await Settlement.insertMany(settlements);

  console.log(`\n=== Massive Seed Summary ===`);
  console.log(`Bank Statements: ${bankStatements.length}`);
  console.log(`Ledger Entries:  ${ledgerEntries.length}`);
  console.log(`Settlements:     ${settlements.length}`);
  console.log(`Vendors:         ${vendors.length}`);
  console.log(`Tax Rules:       ${taxRules.length}`);
  console.log(`FX Rates:        ${fxRates.length}`);
  console.log(`Total records:   ${bankStatements.length + ledgerEntries.length + settlements.length + vendors.length + taxRules.length + fxRates.length}`);

  // Only close if we opened it here in the seed script
  if (require.main === module) {
    await mongoose.connection.close();
    console.log('\nSeeding complete. Connection closed.');
  } else {
    console.log('\nSeeding complete.');
  }
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
  seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
}

module.exports = seed;
