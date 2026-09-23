const crypto = require('crypto');

const CoalVisitor = require('./coalVisitor.model');

const {
  calculateCoalPricing,
} = require('./coalPricing');

const {
  ok,
  fail,
} = require('../../utils/response');

function normalizePhone(value) {
  const digits = String(value || '')
    .replace(/\D/g, '');

  if (
    digits.length < 10 ||
    digits.length > 15
  ) {
    throw new Error(
      'Please enter a valid mobile number.'
    );
  }

  return digits;
}

function makeOrderId() {
  return `ITO-COAL-ORDER-${Date.now()
    .toString(36)
    .toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

function normalizeRequirement(
  requirement = {}
) {
  const numberFields = [
    'gcv',
    'rejVal',
    'ash',
    'sulphur',
    'tm',
    'vm',
    'fc',
    'orderQty',
    'trialQty',
    'monthly',
    'targetQty',
    'estValuation',
  ];

  const clean = {
    ...requirement,
  };

  for (const field of numberFields) {
    if (
      clean[field] === '' ||
      clean[field] === null ||
      clean[field] === undefined
    ) {
      delete clean[field];
      continue;
    }

    const value = Number(clean[field]);

    if (!Number.isFinite(value)) {
      throw new Error(
        `${field} must be a valid number.`
      );
    }

    clean[field] = value;
  }

  clean.product = 'COAL';

  clean.privacy = Boolean(
    clean.privacy
  );

  return clean;
}

const createCoalVisitor = async (
  req,
  res,
  next
) => {
  try {
    const {
      fullName,
      email,
      mobile,
      city,
      state,
      timeline,
      requirement,
    } = req.body || {};

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !mobile?.trim() ||
      !city?.trim() ||
      !state?.trim()
    ) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'Name, email, mobile, city and state are required.'
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'Please enter a valid email address.'
      );
    }

    const phone = normalizePhone(
      mobile
    );

    const cleanRequirement =
      normalizeRequirement(
        requirement || {}
      );

    if (!cleanRequirement.origin) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'Coal origin is required.'
      );
    }

    if (!cleanRequirement.coalType) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'Coal type is required.'
      );
    }

    if (!cleanRequirement.basis) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'GCV basis is required.'
      );
    }

    const pricing =
      calculateCoalPricing(
        cleanRequirement
      );

    const data = {
      fullName: fullName.trim(),

      email: email
        .trim()
        .toLowerCase(),

      phone,

      city: city.trim(),

      state: state.trim(),

      timeline: String(
        timeline ||
        cleanRequirement.timeline ||
        ''
      ),

      requirement:
        cleanRequirement,

      pricing,

      status:
        'PRICING_VIEWED',

      source:
        'WEBSITE_REQUEST_BULK_QUOTE',
    };

    let visitor =
      await CoalVisitor.findOne({
        email: data.email,
        division: 'COAL',
      });

    if (visitor) {
      Object.assign(
        visitor,
        data
      );

      await visitor.save();
    } else {
      visitor =
        await CoalVisitor.create({
          visitorId:
            CoalVisitor.generateVisitorId(),

          division: 'COAL',

          ...data,
        });
    }

    return ok(
      res,
      {
        visitorId:
          visitor.visitorId,

        pricing,
      },
      'Coal visitor registered. Proceed to pricing.',
      201,
      req
    );
  } catch (error) {
    if (
      error.message?.includes(
        'valid mobile'
      ) ||
      error.message?.includes(
        'required'
      ) ||
      error.message?.includes(
        'must be a valid'
      ) ||
      error.message?.includes(
        'Estimated valuation'
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        error.message
      );
    }

    next(error);
  }
};

const getCoalVisitor = async (
  req,
  res,
  next
) => {
  try {
    const visitor =
      await CoalVisitor.findOne({
        visitorId:
          req.params.visitorId,

        division: 'COAL',
      }).lean();

    if (!visitor) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Coal visitor not found.'
      );
    }

    return ok(
      res,
      { visitor },
      'Coal visitor retrieved.',
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

const createRazorpayOrder = async (
  req,
  res,
  next
) => {
  try {
    const visitor =
      await CoalVisitor.findOne({
        visitorId:
          req.params.visitorId,

        division: 'COAL',
      });

    if (!visitor) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Coal visitor not found.'
      );
    }

    if (
      !visitor.pricing?.grandTotal ||
      visitor.pricing.grandTotal <= 0
    ) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'No payable Coal pricing is available.'
      );
    }

    const keyId =
      process.env.RAZORPAY_KEY_ID;

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return fail(
        res,
        500,
        'SERVER_ERROR',
        'Razorpay configuration missing on server.'
      );
    }

    const amount =
      Math.round(
        visitor.pricing.grandTotal *
          100
      );

    const response =
      await fetch(
        'https://api.razorpay.com/v1/orders',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Basic ${Buffer.from(
                `${keyId}:${keySecret}`
              ).toString('base64')}`,

            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            amount,

            currency: 'INR',

            receipt:
              `coal_${visitor.visitorId}_${Date.now()}`,

            notes: {
              visitorId:
                visitor.visitorId,

              product:
                'Coal',

              origin:
                visitor.requirement
                  ?.origin || '',

              coalType:
                visitor.requirement
                  ?.coalType || '',

              destination:
                visitor.requirement
                  ?.dest || '',
            },
          }),
        }
      );

    if (!response.ok) {
      const gatewayMessage =
        await response.text();

      return fail(
        res,
        response.status,
        'PAYMENT_GATEWAY_ERROR',
        `Razorpay Order Error: ${gatewayMessage}`
      );
    }

    const order =
      await response.json();

    visitor.paymentOrderId =
      order.id;

    visitor.paymentStatus =
      'INITIATED';

    visitor.paymentAmount =
      visitor.pricing.grandTotal;

    visitor.status =
      'PAYMENT_INITIATED';

    await visitor.save();

    return ok(
      res,
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      },
      'Razorpay order created successfully.',
      201,
      req
    );
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (
  req,
  res,
  next
) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    const visitor =
      await CoalVisitor.findOne({
        visitorId:
          req.params.visitorId,

        division: 'COAL',
      });

    if (!visitor) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Coal visitor not found.'
      );
    }

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'Missing payment verification parameters.'
      );
    }

    if (
      visitor.paymentOrderId !==
      razorpay_order_id
    ) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'Order ID mismatch.'
      );
    }

    const secret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return fail(
        res,
        500,
        'SERVER_ERROR',
        'Razorpay configuration missing on server.'
      );
    }

    const expectedSignature =
      crypto
        .createHmac(
          'sha256',
          secret
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest('hex');

    if (
      expectedSignature !==
      razorpay_signature
    ) {
      return fail(
        res,
        400,
        'PAYMENT_VERIFICATION_FAILED',
        'Invalid payment signature.'
      );
    }

    visitor.paymentId =
      razorpay_payment_id;

    visitor.paymentSignature =
      razorpay_signature;

    visitor.paymentStatus =
      'COMPLETED';

    visitor.paymentAmount =
      visitor.pricing.grandTotal;

    visitor.paymentCompletedAt =
      new Date();

    visitor.status =
      'ORDER_CREATED';

    visitor.orderId =
      makeOrderId();

    await visitor.save();

    return ok(
      res,
      {
        visitorId:
          visitor.visitorId,

        orderId:
          visitor.orderId,

        paymentId:
          visitor.paymentId,

        amount:
          visitor.paymentAmount,
      },
      'Payment verified and Coal order created successfully.',
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

const listCoalVisitors = async (
  req,
  res,
  next
) => {
  try {
    const limit =
      Math.min(
        Number(req.query.limit) ||
          500,
        1000
      );

    const visitors =
      await CoalVisitor.find({
        division: 'COAL',
      })
        .sort({
          createdAt: -1,
        })
        .limit(limit)
        .lean();

    return ok(
      res,
      { visitors },
      'Coal visitors retrieved.',
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCoalVisitor,
  getCoalVisitor,
  createRazorpayOrder,
  verifyPayment,
  listCoalVisitors,
};