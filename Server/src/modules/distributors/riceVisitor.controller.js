const RiceVisitor = require('./riceVisitor.model');
const RiceOrder = require('./riceOrder.model');
const { validateCartItems } = require('./ricePricing');
const { ok, fail } = require('../../utils/response');
const crypto = require('crypto');

function generateVisitorId() {
  return RiceVisitor.generateVisitorId();
}

function generateOrderId() {
  return RiceOrder.generateOrderId();
}

const createRiceVisitor = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      currentLocation,
      requirement
    } = req.body;

    if (!fullName?.trim()) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Full name is required.');
    }
    if (!email?.trim()) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Email is required.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please enter a valid email address.');
    }
    if (!phone?.trim()) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Phone number is required.');
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please enter a valid phone number (minimum 10 digits).');
    }
    if (!currentLocation?.trim()) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Current location is required.');
    }
    if (!requirement) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Requirement data is required.');
    }

    const {
      variety,
      processingType,
      compliance,
      quantityKg,
      location,
      pincode,
      timeline,
      packaging,
      tradeType
    } = requirement;

    if (!variety) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Rice variety is required.');
    }
    if (!processingType) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Processing type is required.');
    }
    if (!quantityKg || quantityKg < 1) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Valid quantity is required.');
    }
    if (!location?.trim()) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Delivery location is required.');
    }
    if (!pincode?.trim()) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Pincode is required.');
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Pincode must be a valid 6-digit number.');
    }

    const pricing = validateCartItems([{
      variety,
      processingType,
      compliance: compliance || 'REGULAR',
      quantityKg: Number(quantityKg),
      location,
      pincode: pincode.trim(),
      timeline,
      packaging,
      tradeType
    }]);

    if (!pricing.allValid) {
      return fail(res, 400, 'VALIDATION_ERROR', pricing.items[0].error || 'Invalid pricing for the selected requirement.');
    }

    const item = pricing.items[0];

    let visitor = await RiceVisitor.findOne({ email: email.toLowerCase().trim(), division: 'RICE' });
    
    const visitorData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      currentLocation: currentLocation.trim(),
      variety,
      processingType,
      compliance: compliance || 'REGULAR',
      quantityKg: Number(quantityKg),
      quantityMT: item.quantityMT,
      location: location.trim(),
      pincode: pincode.trim(),
      timeline,
      packaging,
      tradeType,
      pricePerMT: item.pricePerMT,
      baseAmount: item.baseAmount,
      status: 'PRICING_VIEWED',
      source: 'WEBSITE_EXPLORE_PRODUCTS',
      sourcePage: 'Rice / Prakriti Rice',
      sourceAction: 'Explore Products',
      cartItems: [{
        variety,
        processingType,
        compliance: compliance || 'REGULAR',
        quantityKg: Number(quantityKg),
        quantityMT: item.quantityMT,
        location: location.trim(),
        pincode: pincode.trim(),
        pricePerMT: item.pricePerMT,
        baseAmount: item.baseAmount,
        timeline,
        packaging,
        tradeType,
      }],
      cartSubtotal: pricing.subtotal,
      cartGstRate: pricing.gstRate,
      cartGstAmount: pricing.gstAmount,
      cartGrandTotal: pricing.grandTotal,
    };

    if (visitor) {
      Object.assign(visitor, visitorData);
      visitor.cartItems = visitorData.cartItems;
      visitor.cartSubtotal = visitorData.cartSubtotal;
      visitor.cartGstAmount = visitorData.cartGstAmount;
      visitor.cartGrandTotal = visitorData.cartGrandTotal;
      visitor.status = 'PRICING_VIEWED';
      await visitor.save();
    } else {
      visitor = new RiceVisitor({
        visitorId: generateVisitorId(),
        division: 'RICE',
        ...visitorData
      });
      await visitor.save();
    }

    return ok(res, {
      visitorId: visitor.visitorId,
      _id: visitor._id,
      pricing: {
        pricePerMT: item.pricePerMT,
        quantityKg: Number(quantityKg),
        quantityMT: item.quantityMT,
        baseAmount: item.baseAmount,
        gstRate: pricing.gstRate,
        gstAmount: pricing.gstAmount,
        grandTotal: pricing.grandTotal
      }
    }, 'Rice visitor created successfully. Proceed to pricing.', 201, req);

  } catch (error) {
    next(error);
  }
};

const getRiceVisitor = async (req, res, next) => {
  try {
    const { visitorId } = req.params;
    
    const visitor = await RiceVisitor.findOne({ visitorId });
    if (!visitor) {
      return fail(res, 404, 'NOT_FOUND', 'Rice visitor not found.');
    }

    return ok(res, { visitor }, 'Rice visitor retrieved.', 200, req);
  } catch (error) {
    next(error);
  }
};

const updateRiceVisitorCart = async (req, res, next) => {
  try {
    const { visitorId } = req.params;
    const { cartItems } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Cart items array is required.');
    }

    const visitor = await RiceVisitor.findOne({ visitorId });
    if (!visitor) {
      return fail(res, 404, 'NOT_FOUND', 'Rice visitor not found.');
    }

    const pricing = validateCartItems(cartItems);
    if (!pricing.allValid) {
      return fail(res, 400, 'VALIDATION_ERROR', 'One or more cart items have invalid pricing.');
    }

    visitor.cartItems = pricing.items.map(item => ({
      variety: item.variety,
      processingType: item.processingType,
      compliance: item.compliance,
      quantityKg: item.quantityKg,
      quantityMT: item.quantityMT,
      location: item.location,
      pincode: item.pincode,
      pricePerMT: item.pricePerMT,
      baseAmount: item.baseAmount,
      timeline: item.timeline,
      packaging: item.packaging,
      tradeType: item.tradeType,
    }));
    visitor.cartSubtotal = pricing.subtotal;
    visitor.cartGstRate = pricing.gstRate;
    visitor.cartGstAmount = pricing.gstAmount;
    visitor.cartGrandTotal = pricing.grandTotal;
    visitor.status = 'CART_ACTIVE';

    await visitor.save();

    return ok(res, {
      visitorId: visitor.visitorId,
      cart: {
        items: visitor.cartItems,
        subtotal: visitor.cartSubtotal,
        gstRate: visitor.cartGstRate,
        gstAmount: visitor.cartGstAmount,
        grandTotal: visitor.cartGrandTotal
      }
    }, 'Cart updated successfully.', 200, req);

  } catch (error) {
    next(error);
  }
};

const createRazorpayOrderForVisitor = async (req, res, next) => {
  try {
    const { visitorId } = req.params;
    
    const visitor = await RiceVisitor.findOne({ visitorId });
    if (!visitor) {
      return fail(res, 404, 'NOT_FOUND', 'Rice visitor not found.');
    }

    if (!visitor.cartItems || visitor.cartItems.length === 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Cart is empty.');
    }

    const amount = visitor.cartGrandTotal;
    if (!amount || amount <= 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Invalid order amount.');
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      return fail(res, 500, 'SERVER_ERROR', 'Razorpay configuration missing on server.');
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const amountInPaise = Math.round(amount * 100);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rice_${visitor.visitorId}_${Date.now()}`
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Razorpay Order Error:', errText);
      return fail(res, response.status, 'PAYMENT_GATEWAY_ERROR', `Razorpay Order Error: ${errText}`, [], req);
    }

    const order = await response.json();

    visitor.paymentOrderId = order.id;
    visitor.status = 'PAYMENT_INITIATED';
    await visitor.save();

    return ok(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      visitorId: visitor.visitorId
    }, 'Razorpay order created successfully.', 201, req);

  } catch (error) {
    next(error);
  }
};

const verifyPaymentAndCreateOrder = async (req, res, next) => {
  try {
    const { visitorId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Missing payment verification parameters.');
    }

    const visitor = await RiceVisitor.findOne({ visitorId });
    if (!visitor) {
      return fail(res, 404, 'NOT_FOUND', 'Rice visitor not found.');
    }

    if (visitor.paymentOrderId !== razorpay_order_id) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Order ID mismatch.');
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return fail(res, 500, 'SERVER_ERROR', 'Missing Razorpay configuration on server.');
    }

    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return fail(res, 400, 'PAYMENT_VERIFICATION_FAILED', 'Invalid signature verification.');
    }

    const orderId = generateOrderId();
    
    const riceOrder = new RiceOrder({
      orderId,
      visitorId: visitor._id,
      division: 'RICE',
      customer: {
        fullName: visitor.fullName,
        email: visitor.email,
        phone: visitor.phone,
        currentLocation: visitor.currentLocation,
      },
      delivery: {
        location: visitor.location,
        pincode: visitor.pincode,
        timeline: visitor.timeline,
      },
      items: visitor.cartItems.map(item => ({
        variety: item.variety,
        processingType: item.processingType,
        processingLabel: item.processingType ? (require('./ricePricing').PROCESSING_KEY_TO_LABEL[item.processingType] || item.processingType) : '',
        compliance: item.compliance,
        quantityKg: item.quantityKg,
        quantityMT: item.quantityMT,
        location: item.location,
        pincode: item.pincode,
        timeline: item.timeline,
        packaging: item.packaging,
        tradeType: item.tradeType,
        pricePerMT: item.pricePerMT,
        baseAmount: item.baseAmount,
      })),
      pricing: {
        subtotal: visitor.cartSubtotal,
        gstRate: visitor.cartGstRate,
        gstAmount: visitor.cartGstAmount,
        grandTotal: visitor.cartGrandTotal,
      },
      payment: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'COMPLETED',
        amount: visitor.cartGrandTotal,
        currency: 'INR',
        paidAt: new Date(),
      },
      status: 'PLACED',
      source: 'WEBSITE_CUSTOMER_PURCHASE',
    });

    await riceOrder.save();

    visitor.status = 'ORDER_CREATED';
    visitor.paymentOrderId = razorpay_order_id;
    visitor.paymentId = razorpay_payment_id;
    visitor.paymentStatus = 'COMPLETED';
    visitor.paymentAmount = visitor.cartGrandTotal;
    visitor.paymentCompletedAt = new Date();
    visitor.orderId = orderId;
    visitor.orderCreatedAt = new Date();
    await visitor.save();

    return ok(res, {
      orderId: riceOrder.orderId,
      visitorId: visitor.visitorId,
      order: riceOrder
    }, 'Payment verified and Rice Order created successfully.', 200, req);

  } catch (error) {
    next(error);
  }
};

const getRiceVisitorByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Email query parameter is required.');
    }

    const visitor = await RiceVisitor.findOne({ 
      email: email.toLowerCase().trim(), 
      division: 'RICE' 
    }).sort({ createdAt: -1 });

    if (!visitor) {
      return ok(res, { visitor: null }, 'No visitor found.', 200, req);
    }

    return ok(res, { visitor }, 'Rice visitor retrieved.', 200, req);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRiceVisitor,
  getRiceVisitor,
  updateRiceVisitorCart,
  createRazorpayOrderForVisitor,
  verifyPaymentAndCreateOrder,
  getRiceVisitorByEmail,
};