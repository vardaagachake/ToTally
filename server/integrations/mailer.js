const nodemailer = require('nodemailer');
const ActionLog = require('../models/ActionLog');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || user === 'your-email@gmail.com') {
    console.warn('⚠️  SMTP not configured — emails will be logged but not sent');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(port) || 587,
    secure: parseInt(port) === 465,
    auth: { user, pass },
  });

  return transporter;
}

async function sendVendorReminder({ to, subject, body, vendorName, amount, invoiceRef, paymentLinkUrl }) {
  const mail = getTransporter();

  const htmlBody = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0C2451; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">Payment Reminder — ToTally</h2>
      </div>
      <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear ${vendorName},</p>
        <p>${body}</p>
        <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
          <table style="width: 100%;">
            <tr><td style="color: #666;">Invoice Reference:</td><td style="text-align: right; font-weight: 600;">${invoiceRef}</td></tr>
            <tr><td style="color: #666;">Amount Due:</td><td style="text-align: right; font-weight: 600; color: #0C2451;">₹${amount.toLocaleString('en-IN')}</td></tr>
          </table>
        </div>
        ${paymentLinkUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${paymentLinkUrl}" style="background: #3395FF; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
            Pay Now →
          </a>
        </div>` : ''}
        <p style="color: #888; font-size: 12px; margin-top: 24px;">This is an automated reminder from ToTally Finance Operations.</p>
      </div>
    </div>
  `;

  const emailData = {
    from: process.env.SMTP_FROM || '"ToTally" <noreply@totally.app>',
    to,
    subject,
    html: htmlBody,
  };

  let result = { sent: false, mock: true };

  if (mail) {
    try {
      const info = await mail.sendMail(emailData);
      result = { sent: true, mock: false, messageId: info.messageId };
    } catch (err) {
      console.error('Email send error:', err.message);
      result = { sent: false, mock: true, error: err.message };
    }
  }

  // Log the action regardless
  await ActionLog.create({
    action: 'vendor_reminder_sent',
    entityType: 'reminder',
    entityId: invoiceRef,
    details: {
      vendorName,
      to,
      amount,
      invoiceRef,
      paymentLinkUrl,
      emailSent: result.sent,
      isMock: result.mock,
      timestamp: new Date(),
    },
  });

  return result;
}

module.exports = { sendVendorReminder, getTransporter };
