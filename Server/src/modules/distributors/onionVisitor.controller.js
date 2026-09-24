const crypto = require("crypto");

const OnionVisitor = require("./onionVisitor.model");

const {
  calculateOnionPricing,
} = require("./onionPricing");

const {
  ok,
  fail,
} = require("../../utils/response");

function normalizePhone(value) {
  const digits = String(value || "").replace(
    /\D/g,
    ""
  );

  if (
    digits.length < 10 ||
    digits.length > 15
  ) {
    throw new Error(
      "Please enter a valid mobile number."
    );
  }

  return digits;
}

function generateOrderId() {
  return `ITO-ONION-ORDER-${Date.now()
    .toString(36)
    .toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

function pricingSnapshot(pricing = {}) {
  return {
    unitRate:
      Number(pricing.unitRate || 0),

    transportRate:
      Number(
        pricing.transportRate || 0
      ),

    materialAmount:
      Number(
        pricing.materialAmount || 0
      ),

    transportAmount:
      Number(
        pricing.transportAmount || 0
      ),

    subtotal:
      Number(pricing.subtotal || 0),

    gstRate:
      Number(pricing.gstRate || 0),

    gstAmount:
      Number(pricing.gstAmount || 0),

    grandTotal:
      Number(
        pricing.grandTotal || 0
      ),
  };
}

function moneyDiffers(
  left,
  right
) {
  return (
    Math.abs(
      Number(left || 0) -
        Number(right || 0)
    ) > 0.009
  );
}

function hasPricingChanged(
  storedPricing,
  currentPricing
) {
  const stored =
    pricingSnapshot(storedPricing);

  const current =
    pricingSnapshot(currentPricing);

  return (
    moneyDiffers(
      stored.unitRate,
      current.unitRate
    ) ||
    moneyDiffers(
      stored.transportRate,
      current.transportRate
    ) ||
    moneyDiffers(
      stored.materialAmount,
      current.materialAmount
    ) ||
    moneyDiffers(
      stored.transportAmount,
      current.transportAmount
    ) ||
    moneyDiffers(
      stored.subtotal,
      current.subtotal
    ) ||
    moneyDiffers(
      stored.gstRate,
      current.gstRate
    ) ||
    moneyDiffers(
      stored.gstAmount,
      current.gstAmount
    ) ||
    moneyDiffers(
      stored.grandTotal,
      current.grandTotal
    )
  );
}

function isValidationError(error) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  return (
    message.includes(
      "valid mobile"
    ) ||
    message.includes(
      "required"
    ) ||
    message.includes(
      "requires"
    ) ||
    message.includes(
      "rate"
    ) ||
    message.includes(
      "select domestic"
    ) ||
    message.includes(
      "configured"
    )
  );
}

/**
 * Register Onion visitor + calculate pricing.
 *
 * NO OTP.
 *
 * Each new website requirement creates a
 * separate visitor record so previous
 * requirements/orders are not overwritten.
 */
const createOnionVisitor = async (
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
    } = req.body;

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !mobile?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !timeline
    ) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "Name, email, mobile, city, state and timeline are required."
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
        "VALIDATION_ERROR",
        "Please enter a valid email address."
      );
    }

    const phone =
      normalizePhone(mobile);

    const pricing =
      calculateOnionPricing({
        ...(requirement || {}),
        timeline,
      });

    const cleanRequirement = {
      product:
        "RED_ONION",

      crop:
        "NEW_CROP",

      tradeType:
        pricing.tradeType,

      size:
        requirement?.size,

      grade:
        requirement?.grade,

      quantityKg:
        pricing.quantityKg,

      quantityMT:
        pricing.quantityMT,

      packaging:
        pricing.packaging,

      destination:
        pricing.destination,
    };

    const visitor =
      await OnionVisitor.create({
        visitorId:
          OnionVisitor.generateVisitorId(),

        division:
          "ONION",

        fullName:
          fullName.trim(),

        email:
          email
            .trim()
            .toLowerCase(),

        phone,

        city:
          city.trim(),

        state:
          state.trim(),

        timeline,

        requirement:
          cleanRequirement,

        pricing:
          pricingSnapshot(
            pricing
          ),

        status:
          "PRICING_VIEWED",

        source:
          "WEBSITE_REQUEST_BULK_QUOTE",
      });

    return ok(
      res,
      {
        visitorId:
          visitor.visitorId,

        pricing:
          pricingSnapshot(
            pricing
          ),
      },
      "Onion visitor registered. Proceed to pricing.",
      201,
      req
    );
  } catch (error) {
    if (
      isValidationError(error)
    ) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        error.message
      );
    }

    next(error);
  }
};

/**
 * Get visitor + quotation.
 */
const getOnionVisitor = async (
  req,
  res,
  next
) => {
  try {
    const visitor =
      await OnionVisitor.findOne({
        visitorId:
          req.params.visitorId,
      });

    if (!visitor) {
      return fail(
        res,
        404,
        "NOT_FOUND",
        "Onion visitor not found."
      );
    }

    return ok(
      res,
      {
        visitor,
      },
      "Onion visitor retrieved.",
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create Razorpay order.
 *
 * IMPORTANT:
 * Onion is market-price sensitive.
 *
 * Before creating Razorpay order,
 * pricing is recalculated from the
 * current backend rate configuration.
 *
 * If the current price differs from
 * the price previously shown to the
 * buyer, the latest pricing is saved
 * and returned for buyer review.
 *
 * Razorpay is NOT created until the
 * buyer retries after reviewing the
 * revised amount.
 */
const createRazorpayOrder =
  async (req, res, next) => {
    try {
      const visitor =
        await OnionVisitor.findOne({
          visitorId:
            req.params.visitorId,
        });

      if (!visitor) {
        return fail(
          res,
          404,
          "NOT_FOUND",
          "Onion visitor not found."
        );
      }

      if (
        visitor.paymentStatus ===
          "COMPLETED" ||
        visitor.status ===
          "ORDER_CREATED"
      ) {
        return fail(
          res,
          409,
          "ORDER_ALREADY_PAID",
          "This Onion order has already been paid."
        );
      }

      /*
       * Recalculate against CURRENT
       * onionPricing.js rates.
       */
      const currentPricing =
        calculateOnionPricing({
          ...(
            visitor.requirement
              ?.toObject?.() ||
            visitor.requirement ||
            {}
          ),

          timeline:
            visitor.timeline,
        });

      const latestPricing =
        pricingSnapshot(
          currentPricing
        );

      const priceChanged =
        hasPricingChanged(
          visitor.pricing,
          latestPricing
        );

      if (priceChanged) {
        visitor.pricing =
          latestPricing;

        visitor.status =
          "PRICING_VIEWED";

        visitor.paymentOrderId =
          undefined;

        visitor.paymentStatus =
          "PRICE_UPDATED";

        await visitor.save();

        return ok(
          res,
          {
            priceChanged:
              true,

            visitorId:
              visitor.visitorId,

            pricing:
              latestPricing,
          },
          "Onion market price has changed. Please review the updated payable amount before continuing.",
          200,
          req
        );
      }

      if (
        !latestPricing.grandTotal ||
        latestPricing.grandTotal <= 0
      ) {
        return fail(
          res,
          400,
          "VALIDATION_ERROR",
          "No payable pricing is available."
        );
      }

      const keyId =
        process.env.RAZORPAY_KEY_ID;

      const keySecret =
        process.env
          .RAZORPAY_KEY_SECRET;

      if (
        !keyId ||
        !keySecret
      ) {
        return fail(
          res,
          500,
          "SERVER_ERROR",
          "Razorpay configuration missing on server."
        );
      }

      const amount =
        Math.round(
          latestPricing
            .grandTotal *
            100
        );

      const razorpayResponse =
        await fetch(
          "https://api.razorpay.com/v1/orders",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Basic ${Buffer.from(
                  `${keyId}:${keySecret}`
                ).toString(
                  "base64"
                )}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                amount,

                currency:
                  "INR",

                receipt:
                  `onion_${visitor.visitorId}_${Date.now()}`,

                notes: {
                  visitorId:
                    visitor.visitorId,

                  product:
                    "Red Onion",

                  destination:
                    visitor
                      .requirement
                      ?.destination,
                },
              }),
          }
        );

      if (
        !razorpayResponse.ok
      ) {
        const gatewayMessage =
          await razorpayResponse
            .text();

        return fail(
          res,
          razorpayResponse.status,
          "PAYMENT_GATEWAY_ERROR",
          `Razorpay Order Error: ${gatewayMessage}`
        );
      }

      const order =
        await razorpayResponse
          .json();

      /*
       * Keep DB pricing exactly aligned
       * with the amount used for this
       * Razorpay order.
       */
      visitor.pricing =
        latestPricing;

      visitor.paymentOrderId =
        order.id;

      visitor.paymentStatus =
        "INITIATED";

      visitor.status =
        "PAYMENT_INITIATED";

      await visitor.save();

      return ok(
        res,
        {
          priceChanged:
            false,

          orderId:
            order.id,

          amount:
            order.amount,

          currency:
            order.currency,

          keyId,

          pricing:
            latestPricing,
        },
        "Razorpay order created successfully.",
        201,
        req
      );
    } catch (error) {
      if (
        isValidationError(
          error
        )
      ) {
        return fail(
          res,
          400,
          "VALIDATION_ERROR",
          error.message
        );
      }

      next(error);
    }
  };

/**
 * Verify Razorpay payment signature.
 */
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
    } = req.body;

    const visitor =
      await OnionVisitor.findOne({
        visitorId:
          req.params.visitorId,
      });

    if (!visitor) {
      return fail(
        res,
        404,
        "NOT_FOUND",
        "Onion visitor not found."
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
        "VALIDATION_ERROR",
        "Missing payment verification parameters."
      );
    }

    if (
      visitor.paymentOrderId !==
      razorpay_order_id
    ) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "Order ID mismatch."
      );
    }

    const secret =
      process.env
        .RAZORPAY_KEY_SECRET;

    if (!secret) {
      return fail(
        res,
        500,
        "SERVER_ERROR",
        "Razorpay configuration missing on server."
      );
    }

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          secret
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest(
          "hex"
        );

    if (
      generatedSignature !==
      razorpay_signature
    ) {
      return fail(
        res,
        400,
        "PAYMENT_VERIFICATION_FAILED",
        "Invalid payment signature."
      );
    }

    visitor.paymentId =
      razorpay_payment_id;

    visitor.paymentSignature =
      razorpay_signature;

    visitor.paymentStatus =
      "COMPLETED";

    visitor.paymentAmount =
      visitor.pricing
        .grandTotal;

    visitor.paymentCompletedAt =
      new Date();

    visitor.status =
      "ORDER_CREATED";

    visitor.orderId =
      visitor.orderId ||
      generateOrderId();

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

        pricing:
          pricingSnapshot(
            visitor.pricing
          ),
      },
      "Payment verified and Onion order created successfully.",
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

/**
 * CRM list.
 */
const listOnionVisitors = async (
  req,
  res,
  next
) => {
  try {
    const limit =
      Math.min(
        Number(
          req.query.limit
        ) || 500,
        1000
      );

    const visitors =
      await OnionVisitor.find({
        division:
          "ONION",
      })
        .sort({
          createdAt:
            -1,
        })
        .limit(
          limit
        )
        .lean();

    return ok(
      res,
      {
        visitors,
      },
      "Onion visitors retrieved.",
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOnionVisitor,
  getOnionVisitor,
  createRazorpayOrder,
  verifyPayment,
  listOnionVisitors,
};