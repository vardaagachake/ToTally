const express = require('express');
const router = express.Router();
const { getVendors, getVendorAnomalies, getOverduePayments } = require('../engines/vendorEngine');
const { createPaymentLink } = require('../integrations/razorpay');
const { sendVendorReminder } = require('../integrations/mailer');
const ActionLog = require('../models/ActionLog');

// Track dismissed reminders in-session
const dismissedReminders = new Set();

router.get('/', async (req, res) => {
  try {
    const vendors = await getVendors();
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const anomalies = await getVendorAnomalies();
    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/overdue', async (req, res) => {
  try {
    const overdue = await getOverduePayments();
    // Filter out dismissed ones
    const filtered = overdue.filter(o => !dismissedReminders.has(o.invoiceNo));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reminder', async (req, res) => {
  try {
    const { vendorName, contactEmail, amount, invoiceNo, body, paymentLinkUrl } = req.body;

    const subject = `Payment Reminder: ${invoiceNo} — ₹${amount.toLocaleString('en-IN')}`;
    
    // We already generated the link in preview, just use the passed URL
    // Send email
    const emailResult = await sendVendorReminder({
      to: contactEmail,
      subject,
      body: body || `We'd like to follow up on invoice ${invoiceNo} for ₹${amount.toLocaleString('en-IN')}. Please process the payment at your earliest convenience using the secure payment link below.\n\nLink: ${paymentLinkUrl}`,
      vendorName,
      amount,
      invoiceRef: invoiceNo,
      paymentLinkUrl: paymentLinkUrl || '#',
    });

    res.json({
      success: true,
      emailResult,
      message: `Reminder sent to ${vendorName} at ${contactEmail}`,
      paymentLink: { short_url: paymentLinkUrl, isMock: paymentLinkUrl?.includes('mock') },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reminder/preview', async (req, res) => {
  try {
    const { vendorName, amount, invoiceNo, contactEmail } = req.body;

    // Pre-generate the payment link for the preview & QR code
    const paymentLink = await createPaymentLink(amount, vendorName, invoiceNo, contactEmail);

    const subject = `Payment Reminder: ${invoiceNo} — ₹${amount.toLocaleString('en-IN')}`;
    const body = `Dear ${vendorName},\n\nWe'd like to follow up on invoice ${invoiceNo} for ₹${amount.toLocaleString('en-IN')}. This payment is now overdue per our agreed terms. Please process the payment at your earliest convenience using the secure payment link below.\n\nPayment Link: ${paymentLink.short_url || paymentLink.url || '#'}\n\nThank you for your prompt attention.\n\nBest regards,\nToTally Finance Operations`;

    res.json({
      to: contactEmail,
      subject,
      body,
      paymentLink,
      paymentLinkUrl: paymentLink.short_url || paymentLink.url || '#',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reminder/dismiss', async (req, res) => {
  const { invoiceNo } = req.body;
  dismissedReminders.add(invoiceNo);
  res.json({ dismissed: true, invoiceNo });
});

module.exports = router;
