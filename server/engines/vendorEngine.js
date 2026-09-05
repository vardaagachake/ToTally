const Vendor = require('../models/Vendor');
const Ledger = require('../models/Ledger');

async function getVendorAnomalies() {
  const vendors = await Vendor.find({}).lean();
  const anomalies = [];

  for (const vendor of vendors) {
    // Get current-period invoices (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const currentInvoices = await Ledger.find({
      vendorName: vendor.name,
      type: 'payable',
      date: { $gte: thirtyDaysAgo },
    }).lean();

    if (currentInvoices.length === 0) continue;

    // Compute historical average
    const historicalAmounts = (vendor.historicalInvoices || []).map(h => h.amount);
    const avgAmount = historicalAmounts.length > 0
      ? historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length
      : 0;
    const avgFrequency = historicalAmounts.length > 0
      ? historicalAmounts.length / 6 // over 6 months
      : 1;

    // Check for amount anomalies
    for (const inv of currentInvoices) {
      const amountRatio = avgAmount > 0 ? inv.amount / avgAmount : 1;

      if (amountRatio > 2) {
        anomalies.push({
          type: 'amount_spike',
          vendor: vendor.name,
          vendorId: vendor._id,
          invoiceNo: inv.invoiceNo,
          currentAmount: inv.amount,
          historicalAvg: Math.round(avgAmount),
          ratio: Math.round(amountRatio * 10) / 10,
          date: inv.date,
          message: `${vendor.name} usually bills ₹${Math.round(avgAmount).toLocaleString('en-IN')}/month, this invoice is ₹${inv.amount.toLocaleString('en-IN')} — ${Math.round(amountRatio)}x the average`,
          severity: amountRatio > 3 ? 'high' : 'medium',
        });
      }
    }

    // Check for frequency anomaly
    if (currentInvoices.length > avgFrequency * 2 && avgFrequency > 0) {
      anomalies.push({
        type: 'frequency_spike',
        vendor: vendor.name,
        vendorId: vendor._id,
        currentCount: currentInvoices.length,
        expectedCount: Math.round(avgFrequency),
        message: `${vendor.name} usually sends ~${Math.round(avgFrequency)} invoices/month, this month: ${currentInvoices.length}`,
        severity: 'medium',
      });
    }
  }

  return anomalies;
}

async function getOverduePayments() {
  const vendors = await Vendor.find({}).lean();
  const overdue = [];

  for (const vendor of vendors) {
    const unpaidInvoices = await Ledger.find({
      vendorName: vendor.name,
      type: 'payable',
    }).lean();

    for (const inv of unpaidInvoices) {
      const daysSinceInvoice = Math.round((Date.now() - new Date(inv.date)) / (1000 * 60 * 60 * 24));
      const daysOverdue = daysSinceInvoice - vendor.paymentTermDays;

      if (daysOverdue > 0) {
        overdue.push({
          vendor: vendor.name,
          vendorId: vendor._id,
          contactEmail: vendor.contactEmail,
          paymentTerms: vendor.paymentTerms,
          paymentTermDays: vendor.paymentTermDays,
          invoiceNo: inv.invoiceNo,
          amount: inv.amount,
          invoiceDate: inv.date,
          daysSinceInvoice,
          daysOverdue,
          message: `Payment to ${vendor.name} is ${daysOverdue} days overdue (promised: ${vendor.paymentTermDays} days, now: ${daysSinceInvoice} days)`,
        });
      }
    }
  }

  // Sort by days overdue descending
  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return overdue;
}

async function getVendors() {
  const vendors = await Vendor.find({}).lean();
  const result = [];

  for (const vendor of vendors) {
    const invoiceCount = await Ledger.countDocuments({ vendorName: vendor.name, type: 'payable' });
    const totalSpend = await Ledger.aggregate([
      { $match: { vendorName: vendor.name, type: 'payable' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    result.push({
      ...vendor,
      invoiceCount,
      totalSpend: totalSpend[0]?.total || 0,
    });
  }

  return result;
}

module.exports = { getVendorAnomalies, getOverduePayments, getVendors };
