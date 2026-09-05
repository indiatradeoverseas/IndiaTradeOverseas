const mongoose = require('mongoose');
const paymentService = require('./payment.service');
const { ok, fail } = require('../../utils/response');

async function createPayment(req, res, next) {
  try {
    const { leadId, totalAmount, advanceAmount } = req.body;
    if (!leadId || totalAmount === undefined || totalAmount === null || totalAmount === '') {
      return fail(res, 400, 'VALIDATION_FAILED', 'leadId and totalAmount are required');
    }

    if (!mongoose.isValidObjectId(leadId)) {
      return fail(res, 400, 'VALIDATION_FAILED', 'leadId must be a valid identifier');
    }

    const parsedTotalAmount = Number(totalAmount);
    if (Number.isNaN(parsedTotalAmount) || parsedTotalAmount <= 0) {
      return fail(res, 400, 'VALIDATION_FAILED', 'totalAmount must be a valid positive number');
    }

    const parsedAdvanceAmount = Number(advanceAmount || 0);
    if (advanceAmount !== undefined && advanceAmount !== null && advanceAmount !== '' && Number.isNaN(parsedAdvanceAmount)) {
      return fail(res, 400, 'VALIDATION_FAILED', 'advanceAmount must be a valid number');
    }

    const payment = await paymentService.createPayment({
      ...req.body,
      leadId,
      totalAmount: parsedTotalAmount,
      advanceAmount: parsedAdvanceAmount,
      actorId: req.user._id
    });
    return ok(res, { payment }, 'Payment created successfully', 201, req);
  } catch (error) {
    if (error.message === 'LEAD_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Lead not found');
    next(error);
  }
}

async function getPaymentsList(req, res, next) {
  try {
    const payments = await paymentService.listPayments(req.user);
    return ok(res, { payments }, 'Payments retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getOutstandingPayments(req, res, next) {
  try {
    const payments = await paymentService.listOutstandingPayments(req.user);
    return ok(res, { payments }, 'Outstanding payments list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const payment = await paymentService.updatePaymentStatus({
      id: req.params.id,
      ...req.body,
      actorId: req.user._id
    });
    return ok(res, { payment }, 'Payment details updated successfully', 200, req);
  } catch (error) {
    if (error.message === 'PAYMENT_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Payment not found');
    next(error);
  }
}

async function triggerReminder(req, res, next) {
  try {
    const payment = await paymentService.triggerPaymentReminder(req.params.id, req.user._id);
    return ok(res, { reminderCount: payment.reminderCount }, 'Payment reminder triggered successfully', 200, req);
  } catch (error) {
    if (error.message === 'PAYMENT_NOT_FOUND') return fail(res, 404, 'VALIDATION_FAILED', 'Payment not found');
    next(error);
  }
}

async function createItoAdsRazorpayOrder(req, res, next) {
  try {
    const { packageName, amount, customerDetails } = req.body;
    
    if (!packageName || !amount) {
      return fail(res, 400, 'VALIDATION_FAILED', 'packageName and amount are required');
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return fail(res, 400, 'VALIDATION_FAILED', 'amount must be a valid positive number');
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      return fail(res, 500, 'SERVER_ERROR', 'Missing Razorpay configuration on server');
    }

    const crypto = require('crypto');
    const auth = crypto.createHash('sha256').update(`${keyId}:${keySecret}`).digest('hex');
    
    const amountInPaise = Math.round(parsedAmount * 100);
    const receipt = `ito_ads_${packageName.toLowerCase()}_${Date.now()}`;

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          packageName,
          customerEmail: customerDetails?.email || '',
          customerName: customerDetails?.name || '',
          customerPhone: customerDetails?.phone || ''
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Razorpay Gateway API Error:", errText);
      return fail(res, response.status, 'PAYMENT_GATEWAY_ERROR', `Razorpay Order Error: ${errText}`, [], req);
    }

    const order = await response.json();
    return ok(res, { orderId: order.id, amount: order.amount, keyId }, 'Razorpay order created successfully', 201, req);
  } catch (error) {
    console.error("Razorpay Order Creation Failure:", error);
    next(error);
  }
}

async function verifyItoAdsRazorpayPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageName, amount, customerDetails } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageName || !amount) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Missing verification parameters.', [], req);
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return fail(res, 500, 'SERVER_ERROR', 'Missing Razorpay configuration on server.', [], req);
    }

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return fail(res, 400, 'PAYMENT_VERIFICATION_FAILED', 'Invalid signature verification.', [], req);
    }

    return ok(res, { 
      paymentId: razorpay_payment_id, 
      orderId: razorpay_order_id,
      packageName,
      amount,
      customerDetails
    }, 'Payment verified successfully', 200, req);
  } catch (error) {
    console.error("Razorpay Verification Failure:", error);
    next(error);
  }
}

module.exports = {
  createPayment,
  getPaymentsList,
  getOutstandingPayments,
  updateStatus,
  triggerReminder,
  createItoAdsRazorpayOrder,
  verifyItoAdsRazorpayPayment
};



