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

/**
 * Register Onion visitor + calculate pricing.
 *
 * NO OTP.
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
      product: "RED_ONION",
      crop: "NEW_CROP",

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

    const emailAddress =
      email.trim().toLowerCase();

    let visitor =
      await OnionVisitor.findOne({
        email: emailAddress,
        division: "ONION",
      });

    const data = {
      fullName: fullName.trim(),

      email: emailAddress,

      phone,

      city: city.trim(),

      state: state.trim(),

      timeline,

      requirement:
        cleanRequirement,

      pricing: {
        unitRate:
          pricing.unitRate,

        transportRate:
          pricing.transportRate,

        materialAmount:
          pricing.materialAmount,

        transportAmount:
          pricing.transportAmount,

        subtotal:
          pricing.subtotal,

        gstRate:
          pricing.gstRate,

        gstAmount:
          pricing.gstAmount,

        grandTotal:
          pricing.grandTotal,
      },

      status: "PRICING_VIEWED",

      source:
        "WEBSITE_REQUEST_BULK_QUOTE",
    };

    if (visitor) {
      Object.assign(
        visitor,
        data
      );

      await visitor.save();
    } else {
      visitor =
        await OnionVisitor.create({
          visitorId:
            OnionVisitor.generateVisitorId(),

          division: "ONION",

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
      "Onion visitor registered. Proceed to pricing.",
      201,
      req
    );
  } catch (error) {
    if (
      error.message?.includes(
        "valid mobile"
      ) ||
      error.message?.includes(
        "required"
      ) ||
      error.message?.includes(
        "rate"
      ) ||
      error.message?.includes(
        "Select Domestic"
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
      { visitor },
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
        !visitor.pricing?.grandTotal
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
        process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return fail(
          res,
          500,
          "SERVER_ERROR",
          "Razorpay configuration missing on server."
        );
      }

      const amount = Math.round(
        visitor.pricing.grandTotal *
          100
      );

      const razorpayResponse =
        await fetch(
          "https://api.razorpay.com/v1/orders",
          {
            method: "POST",

            headers: {
              Authorization: `Basic ${Buffer.from(
                `${keyId}:${keySecret}`
              ).toString("base64")}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              amount,

              currency: "INR",

              receipt: `onion_${visitor.visitorId}_${Date.now()}`,

              notes: {
                visitorId:
                  visitor.visitorId,

                product:
                  "Red Onion",

                destination:
                  visitor.requirement
                    ?.destination,
              },
            }),
          }
        );

      if (!razorpayResponse.ok) {
        return fail(
          res,
          razorpayResponse.status,
          "PAYMENT_GATEWAY_ERROR",
          `Razorpay Order Error: ${await razorpayResponse.text()}`
        );
      }

      const order =
        await razorpayResponse.json();

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
          orderId:
            order.id,

          amount:
            order.amount,

          currency:
            order.currency,

          keyId,
        },
        "Razorpay order created successfully.",
        201,
        req
      );
    } catch (error) {
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
      process.env.RAZORPAY_KEY_SECRET;

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
        .digest("hex");

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
      visitor.pricing.grandTotal;

    visitor.paymentCompletedAt =
      new Date();

    visitor.status =
      "ORDER_CREATED";

    visitor.orderId =
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
    const limit = Math.min(
      Number(req.query.limit) || 500,
      1000
    );

    const visitors =
      await OnionVisitor.find({
        division: "ONION",
      })
        .sort({
          createdAt: -1,
        })
        .limit(limit)
        .lean();

    return ok(
      res,
      { visitors },
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