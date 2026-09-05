const Razorpay = require('razorpay');

let instance = null;

function getRazorpayInstance() {
  if (!instance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret || keyId.startsWith('rzp_test_xxx')) {
      console.warn('⚠️  Razorpay keys not configured — using mock mode');
      return null;
    }
    instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return instance;
}

async function createPaymentLink(amount, vendorName, invoiceRef, vendorEmail) {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    // Mock response
    const mockId = `plink_mock_${Date.now()}`;
    return {
      id: mockId,
      amount: amount * 100,
      currency: 'INR',
      description: `Payment for ${invoiceRef} — ${vendorName}`,
      short_url: `https://rzp.io/mock/${mockId}`,
      status: 'created',
      isMock: true,
    };
  }

  try {
    const link = await rzp.paymentLink.create({
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      description: `Payment for ${invoiceRef} — ${vendorName}`,
      customer: {
        name: vendorName,
        email: vendorEmail,
      },
      notify: { email: false, sms: false }, // We handle notification ourselves
      reminder_enable: false,
      callback_url: '',
      callback_method: '',
    });
    return { ...link, isMock: false };
  } catch (err) {
    console.error('Razorpay createPaymentLink error:', err);
    throw err;
  }
}

async function fetchSettlements() {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    return { items: generateMockSettlements(), isMock: true };
  }

  try {
    const settlements = await rzp.settlements.all({ count: 50 });
    if (settlements.items && settlements.items.length > 0) {
      return { ...settlements, isMock: false };
    } else {
      console.log('Razorpay live settlements empty — falling back to mock schema');
      return { items: generateMockSettlements(), isMock: true };
    }
  } catch (err) {
    console.error('Razorpay fetchSettlements error:', err);
    return { items: generateMockSettlements(), isMock: true };
  }
}

function generateMockSettlements() {
  const items = [];
  const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
  
  for (let i = 0; i < 40; i++) {
    const day = Math.floor(Math.random() * 45) + 5;
    const amount = Math.floor(Math.random() * 80000) + 1000;
    const fees = Math.round(amount * 0.02);
    const tax = Math.round(fees * 0.18);
    const id = `setl_${String(3000 + i).padStart(8, '0')}`;
    
    items.push({
      id: id,
      entity: 'settlement',
      amount: amount * 100, // Razorpay amounts in paise
      status: 'processed',
      fees: fees * 100,
      tax: tax * 100,
      utr: `UTR${String(4000 + i).padStart(10, '0')}`,
      created_at: Math.floor(new Date(daysAgo(day)).getTime() / 1000),
    });
  }
  return items;
}

async function createOrder(amount, notes = {}) {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    return {
      id: `order_mock_${Date.now()}`,
      amount: amount * 100,
      currency: 'INR',
      status: 'created',
      isMock: true,
    };
  }

  try {
    const order = await rzp.orders.create({
      amount: amount * 100,
      currency: 'INR',
      notes,
    });
    return { ...order, isMock: false };
  } catch (err) {
    console.error('Razorpay createOrder error:', err);
    throw err;
  }
}

module.exports = { getRazorpayInstance, createPaymentLink, fetchSettlements, createOrder };
