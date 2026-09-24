import React, { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { toast } from "react-hot-toast";

import { coalVisitorApi } from "../../api/coalVisitor";
import { generateInvoicePDF } from "../../utils/pdfInvoiceGenerator";

const RAZORPAY_SCRIPT =
  "https://checkout.razorpay.com/v1/checkout.js";

const MAX_RAZORPAY_FULL_PAYMENT = 2500000;

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export default function CoalPricing() {
  const navigate = useNavigate();
  const location = useLocation();

  const readCoalSnapshot = () => {
    try {
      const raw = sessionStorage.getItem(
        "ito_coal_visitor_snapshot"
      );

      return raw
        ? JSON.parse(raw)
        : null;
    } catch {
      return null;
    }
  };

  const [visitor, setVisitor] = useState(
    location.state?.visitor ||
      readCoalSnapshot()
  );

  const [loading, setLoading] =
    useState(true);

  const [paying, setPaying] =
    useState(false);

  const [success, setSuccess] =
    useState(null);

  const visitorId =
    sessionStorage.getItem(
      "ito_coal_visitor_id"
    );

  useEffect(() => {
    if (!visitorId) {
      navigate("/coal", {
        replace: true,
      });
      return;
    }

    loadVisitor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorId]);

  const loadVisitor = async () => {
    try {
      const response =
        await coalVisitorApi.get(
          visitorId
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to load coal requirement."
        );
      }

      const serverVisitor =
        response?.data?.visitor ||
        response?.visitor ||
        null;

      if (!serverVisitor) {
        throw new Error(
          "Coal visitor response did not include visitor data."
        );
      }

      const fallbackVisitor =
        location.state?.visitor ||
        readCoalSnapshot() ||
        {};

      const normalizedVisitor = {
        ...fallbackVisitor,
        ...serverVisitor,

        visitorId:
          serverVisitor.visitorId ||
          response?.data?.visitorId ||
          response?.visitorId ||
          visitorId,

        mobile:
          serverVisitor.mobile ||
          serverVisitor.phone ||
          fallbackVisitor.mobile ||
          "",

        company:
          serverVisitor.company ||
          serverVisitor.requirement
            ?.company ||
          fallbackVisitor.company ||
          fallbackVisitor.requirement
            ?.company ||
          "",

        requirement: {
          ...(fallbackVisitor.requirement ||
            {}),
          ...(serverVisitor.requirement ||
            {}),
        },

        pricing:
          serverVisitor.pricing ||
          response?.data?.pricing ||
          response?.pricing ||
          fallbackVisitor.pricing ||
          null,
      };

      setVisitor(
        normalizedVisitor
      );

      sessionStorage.setItem(
        "ito_coal_visitor_snapshot",
        JSON.stringify(
          normalizedVisitor
        )
      );
    } catch (error) {
      console.error(
        "Coal visitor loading error:",
        error
      );

      const fallbackVisitor =
        location.state?.visitor ||
        readCoalSnapshot();

      if (fallbackVisitor) {
        setVisitor(
          fallbackVisitor
        );
      } else {
        toast.error(
          error.response?.data
            ?.message ||
            error.message ||
            "Unable to load coal requirement."
        );

        navigate("/coal", {
          replace: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script =
        document.createElement(
          "script"
        );

      script.src =
        RAZORPAY_SCRIPT;

      script.onload = () =>
        resolve(true);

      script.onerror = () =>
        resolve(false);

      document.body.appendChild(
        script
      );
    });

  const startPayment = async () => {
    if (!visitor) return;

    try {
      setPaying(true);

      const amount = Number(
        visitor.pricing?.grandTotal ||
          visitor.pricing
            ?.totalAmount ||
          visitor.pricing?.amount ||
          0
      );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        toast.error(
          "A valid coal commercial amount is not available yet."
        );
        setPaying(false);
        return;
      }

      if (
        amount >
        MAX_RAZORPAY_FULL_PAYMENT
      ) {
        toast.error(
          "Full online payment is unavailable for this high-value order. Please use the commercial payment process."
        );
        setPaying(false);
        return;
      }

      const loaded =
        await loadRazorpay();

      if (!loaded) {
        toast.error(
          "Razorpay could not be loaded. Please try again."
        );
        setPaying(false);
        return;
      }

      const orderResponse =
        await coalVisitorApi
          .createRazorpayOrder(
            visitor.visitorId
          );

      if (
        !orderResponse?.success
      ) {
        throw new Error(
          orderResponse?.message ||
            "Unable to create payment order."
        );
      }

      const orderData =
        orderResponse?.data || {};

      if (
        !orderData.orderId ||
        !orderData.keyId ||
        !orderData.amount
      ) {
        throw new Error(
          "Payment gateway returned an invalid order response."
        );
      }

      const options = {
        key:
          orderData.keyId,

        amount:
          orderData.amount,

        currency:
          orderData.currency ||
          "INR",

        name:
          "India Trade Overseas",

        description:
          "Coal commercial payment",

        order_id:
          orderData.orderId,

        prefill: {
          name:
            visitor.fullName ||
            "",

          email:
            visitor.email || "",

          contact:
            visitor.mobile || "",
        },

        notes: {
          visitorId:
            visitor.visitorId,

          vertical:
            "COAL",
        },

        theme: {
          color:
            "#C7A24A",
        },

        handler:
          async function (
            razorpayResponse
          ) {
            try {
              const verification =
                await coalVisitorApi
                  .verifyPayment(
                    visitor.visitorId,
                    razorpayResponse
                  );

              if (
                !verification?.success
              ) {
                throw new Error(
                  verification?.message ||
                    "Payment verification failed."
                );
              }

              const verificationData =
                verification?.data || {};

              const successData = {
                ...verificationData,

                visitorId:
                  verificationData
                    .visitorId ||
                  visitor.visitorId,

                orderId:
                  verificationData
                    .orderId ||
                  "",

                paymentId:
                  verificationData
                    .paymentId ||
                  razorpayResponse
                    .razorpay_payment_id,

                razorpayPaymentId:
                  razorpayResponse
                    .razorpay_payment_id,

                razorpayOrderId:
                  razorpayResponse
                    .razorpay_order_id,
              };

              setSuccess(
                successData
              );

              const req =
                visitor?.requirement ||
                {};

              const pricing =
                visitor?.pricing || {};

              const quantityMT =
                Number(
                  pricing.quantityMT ||
                    req.targetQty ||
                    req.orderQty ||
                    req.targetQtyMT ||
                    req.orderQtyMT ||
                    0
                );

              const valuationAmount =
                Number(
                  pricing
                    .valuationAmount ||
                    req.estValuation ||
                    req
                      .estimatedValuationINR ||
                    0
                );

              const transportAmount =
                Number(
                  pricing
                    .transportAmount ||
                    0
                );

              const subtotal =
                Number(
                  pricing.subtotal ||
                    valuationAmount +
                      transportAmount
                );

              const gstAmount =
                Number(
                  pricing.gstAmount ||
                    0
                );

              const grandTotal =
                Number(
                  pricing.grandTotal ||
                    pricing.totalAmount ||
                    pricing.amount ||
                    0
                );

              generateInvoicePDF({
                customerName:
                  visitor.fullName ||
                  "Valued Customer",

                customerEmail:
                  visitor.email || "",

                city:
                  visitor.city || "",

                state:
                  visitor.state || "",

                productName:
                  "Coal",

                grade:
                  [
                    req.origin,
                    req.coalType,

                    req.gcv
                      ? `${req.gcv} kcal/kg`
                      : req.gcvKcalKg
                        ? `${req.gcvKcalKg} kcal/kg`
                        : "",

                    req.basis,
                  ]
                    .filter(Boolean)
                    .join(" · "),

                quantity:
                  quantityMT,

                quantityUnit:
                  "MT",

                unitPrice:
                  quantityMT > 0
                    ? valuationAmount /
                      quantityMT
                    : 0,

                subtotal,
                gstAmount,

                totalAmount:
                  grandTotal,

                paymentMode:
                  "ONLINE",

                paymentStatus:
                  "PAID & CONFIRMED",

                paymentId:
                  successData.paymentId,
              });

              toast.success(
                "Coal payment verified. Confirmation and invoice generated."
              );
            } catch (error) {
              console.error(
                "Coal payment verification error:",
                error
              );

              toast.error(
                error.response?.data
                  ?.message ||
                  error.message ||
                  "Payment verification failed."
              );
            } finally {
              setPaying(false);
            }
          },

        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      };

      const razorpay =
        new window.Razorpay(
          options
        );

      razorpay.on(
        "payment.failed",
        () => {
          setPaying(false);

          toast.error(
            "Coal payment failed. Please try again."
          );
        }
      );

      razorpay.open();
    } catch (error) {
      console.error(
        "Coal payment error:",
        error
      );

      toast.error(
        error.response?.data
          ?.message ||
          error.message ||
          "Unable to start payment."
      );

      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="coal-pricing-page">
        <PageStyles />

        <div className="coal-pricing-card loading-card">
          <div className="coal-pricing-eyebrow">
            INDIA TRADE OVERSEAS · COAL
          </div>

          <div className="coal-loading-line" />
          <div className="coal-loading-line short" />
        </div>
      </div>
    );
  }

  if (!visitor) {
    return null;
  }

  if (success) {
    return (
      <div className="coal-pricing-page">
        <PageStyles />

        <div className="coal-pricing-card success-card">
          <div className="success-mark">
            ✓
          </div>

          <div className="coal-pricing-eyebrow">
            PAYMENT VERIFIED
          </div>

          <h1>
            Coal order confirmed.
          </h1>

          <p className="coal-pricing-lead">
            Your payment was verified
            by the server and the Coal
            order has been created.
            Your invoice has also been
            generated.
          </p>

          <div className="success-grid">
            <SummaryItem
              label="Visitor ID"
              value={
                success.visitorId
              }
            />

            <SummaryItem
              label="Order ID"
              value={
                success.orderId ||
                "Created"
              }
            />

            <SummaryItem
              label="Payment ID"
              value={
                success.paymentId ||
                success
                  .razorpayPaymentId
              }
            />

            <SummaryItem
              label="Payment Status"
              value="Paid & Verified"
            />
          </div>

          <button
            type="button"
            className="coal-pay-button secondary"
            onClick={() =>
              navigate("/coal")
            }
          >
            RETURN TO COAL
          </button>
        </div>
      </div>
    );
  }

  const requirement =
    visitor?.requirement || {};

  const pricing =
    visitor?.pricing || {};

  const valuationAmount =
    Number(
      pricing.valuationAmount ||
        requirement.estValuation ||
        requirement
          .estimatedValuationINR ||
        0
    );

  const transportAmount =
    Number(
      pricing.transportAmount ||
        0
    );

  const subtotal =
    Number(
      pricing.subtotal ||
        valuationAmount +
          transportAmount
    );

  const gstRate =
    Number(
      pricing.gstRate ??
        0.18
    );

  const gstAmount =
    Number(
      pricing.gstAmount ??
        subtotal * gstRate
    );

  const amount =
    Number(
      pricing.grandTotal ||
        pricing.totalAmount ||
        pricing.amount ||
        subtotal +
          gstAmount
    );

  const quantity =
    requirement.targetQty ||
    requirement.orderQty ||
    requirement.targetQtyMT ||
    requirement.orderQtyMT ||
    pricing.quantityMT ||
    "Not specified";

  const gcv =
    requirement.gcv ||
    requirement.gcvKcalKg ||
    null;

  const exceedsRazorpayFullPaymentLimit =
    amount >
    MAX_RAZORPAY_FULL_PAYMENT;

  return (
    <div className="coal-pricing-page">
      <PageStyles />

      <div className="coal-pricing-shell">
        <div className="coal-pricing-topbar">
          <div>
            <div className="coal-pricing-eyebrow">
              INDIA TRADE OVERSEAS · COAL
            </div>

            <h1>
              Coal Commercial Summary
            </h1>

            <p className="coal-pricing-lead">
              Review your requirement
              and payable amount before
              continuing to secure
              payment.
            </p>
          </div>

          <div className="coal-step-badge">
            <span>✓</span>
            Requirement saved
          </div>
        </div>

        <div className="coal-section-block">
          <div className="coal-section-heading">
            <div>
              <span className="section-number">
                01
              </span>

              <h2>
                Buyer Details
              </h2>
            </div>

            <span className="section-note">
              Registered requirement
            </span>
          </div>

          <div className="summary-grid">
            <SummaryItem
              label="Buyer"
              value={
                visitor.fullName ||
                "Not specified"
              }
            />

            <SummaryItem
              label="Company"
              value={
                visitor.company ||
                requirement.company ||
                "Not specified"
              }
            />

            <SummaryItem
              label="Email"
              value={
                visitor.email ||
                "Not specified"
              }
            />

            <SummaryItem
              label="Location"
              value={
                [visitor.city, visitor.state]
                  .filter(Boolean)
                  .join(", ") ||
                "Not specified"
              }
            />
          </div>
        </div>

        <div className="coal-section-block">
          <div className="coal-section-heading">
            <div>
              <span className="section-number">
                02
              </span>

              <h2>
                Coal Requirement
              </h2>
            </div>

            <button
              type="button"
              className="coal-edit-link"
              onClick={() =>
                navigate("/coal")
              }
            >
              Edit requirement
            </button>
          </div>

          <div className="summary-grid">
            <SummaryItem
              label="Origin"
              value={
                requirement.origin ||
                "Not specified"
              }
            />

            <SummaryItem
              label="Coal Type"
              value={
                requirement.coalType ||
                "Not specified"
              }
            />

            <SummaryItem
              label="GCV"
              value={
                gcv
                  ? `${gcv} kcal/kg`
                  : "Not specified"
              }
            />

            <SummaryItem
              label="Basis"
              value={
                requirement.basis ||
                "Not specified"
              }
            />

            <SummaryItem
              label="Quantity"
              value={
                quantity ===
                "Not specified"
                  ? quantity
                  : `${quantity} MT`
              }
              highlight
            />

            <SummaryItem
              label="Destination"
              value={
                requirement.dest ||
                "Not specified"
              }
            />

            <SummaryItem
              label="Transport"
              value={
                requirement.tMode ||
                "Not specified"
              }
            />

            <SummaryItem
              label="Incoterm"
              value={
                requirement.incoterm ||
                "Not specified"
              }
            />
          </div>
        </div>

        <div className="coal-section-block commercial-block">
          <div className="coal-section-heading">
            <div>
              <span className="section-number">
                03
              </span>

              <h2>
                Commercial Breakdown
              </h2>
            </div>

            <span className="section-note secure">
              Server calculated
            </span>
          </div>

          <div className="price-breakdown">
            <PriceRow
              label="Estimated valuation"
              value={valuationAmount}
            />

            <PriceRow
              label="Transport"
              value={transportAmount}
              muted={
                transportAmount === 0
              }
            />

            <PriceRow
              label="Subtotal"
              value={subtotal}
            />

            <PriceRow
              label={`GST (${(
                gstRate * 100
              ).toFixed(
                Number.isInteger(
                  gstRate * 100
                )
                  ? 0
                  : 2
              )}%)`}
              value={gstAmount}
            />

            <div className="grand-total-row">
              <div>
                <span>
                  Total Payable
                </span>

                <small>
                  Inclusive of applicable GST
                </small>
              </div>

              <strong>
                ₹{money(amount)}
              </strong>
            </div>
          </div>

          <div className="commercial-note">
            <span className="note-icon">
              i
            </span>

            <p>
              Pricing is calculated from
              the valuation saved with
              your Coal requirement.
              Payment confirmation and
              invoice are generated only
              after backend verification
              of the Razorpay payment.
            </p>
          </div>
        </div>

        {exceedsRazorpayFullPaymentLimit && (
          <div className="high-value-notice">
            <strong>
              High-value order
            </strong>

            <span>
              Full online gateway payment
              is unavailable above
              ₹25,00,000 in this checkout
              flow. Your requirement and
              pricing remain saved for
              the commercial payment
              process.
            </span>
          </div>
        )}

        <div className="payment-footer">
          <div className="payment-trust">
            <span className="lock-icon">
              🔒
            </span>

            <div>
              <strong>
                Secure payment
              </strong>

              <small>
                Powered through Razorpay ·
                Invoice after verified
                payment
              </small>
            </div>
          </div>

          <button
            type="button"
            disabled={
              paying ||
              amount <= 0 ||
              exceedsRazorpayFullPaymentLimit
            }
            className="coal-pay-button"
            onClick={startPayment}
          >
            {paying
              ? "OPENING SECURE PAYMENT..."
              : exceedsRazorpayFullPaymentLimit
                ? "FULL ONLINE PAYMENT UNAVAILABLE"
                : `PAY ₹${money(
                    amount
                  )} SECURELY`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  highlight = false,
}) {
  return (
    <div
      className={`summary-item ${
        highlight
          ? "highlight"
          : ""
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PriceRow({
  label,
  value,
  muted = false,
}) {
  return (
    <div
      className={`price-row ${
        muted ? "muted" : ""
      }`}
    >
      <span>{label}</span>

      <strong>
        ₹{money(value)}
      </strong>
    </div>
  );
}

function PageStyles() {
  return (
    <style>{`
      .coal-pricing-page {
        min-height: 100vh;
        padding: 58px 20px;
        background:
          radial-gradient(circle at 80% 0%, rgba(199,162,74,.12), transparent 28%),
          radial-gradient(circle at 10% 80%, rgba(36,77,97,.14), transparent 34%),
          linear-gradient(135deg,#071826 0%,#0d151b 48%,#101214 100%);
        color: #F7F4ED;
        box-sizing: border-box;
      }

      .coal-pricing-page * {
        box-sizing: border-box;
      }

      .coal-pricing-shell,
      .coal-pricing-card {
        width: min(1080px, 100%);
        margin: 0 auto;
        border: 1px solid rgba(199,162,74,.26);
        border-radius: 28px;
        background: rgba(17,18,20,.82);
        box-shadow: 0 30px 100px rgba(0,0,0,.38);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      .coal-pricing-shell {
        padding: clamp(24px,4vw,46px);
      }

      .coal-pricing-card {
        max-width: 760px;
        padding: clamp(28px,5vw,54px);
      }

      .coal-pricing-topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 28px;
        margin-bottom: 34px;
      }

      .coal-pricing-eyebrow {
        color: #C7A24A;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .18em;
        text-transform: uppercase;
      }

      .coal-pricing-topbar h1,
      .coal-pricing-card h1 {
        margin: 12px 0 12px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(42px,7vw,72px);
        line-height: .94;
        font-weight: 500;
        letter-spacing: -.04em;
      }

      .coal-pricing-lead {
        margin: 0;
        max-width: 650px;
        color: rgba(247,244,237,.62);
        font-size: 15px;
        line-height: 1.75;
      }

      .coal-step-badge {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 13px;
        border: 1px solid rgba(199,162,74,.25);
        border-radius: 999px;
        background: rgba(199,162,74,.07);
        color: rgba(247,244,237,.76);
        font-size: 11px;
        font-weight: 800;
      }

      .coal-step-badge span {
        display: grid;
        place-items: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #C7A24A;
        color: #111214;
        font-size: 11px;
      }

      .coal-section-block {
        padding: 26px 0;
        border-top: 1px solid rgba(247,244,237,.09);
      }

      .coal-section-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        margin-bottom: 18px;
      }

      .coal-section-heading > div {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .section-number {
        color: #C7A24A;
        font: 800 10px/1 monospace;
        letter-spacing: .12em;
      }

      .coal-section-heading h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -.01em;
      }

      .section-note,
      .coal-edit-link {
        color: rgba(247,244,237,.48);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .section-note.secure {
        color: #C7A24A;
      }

      .coal-edit-link {
        border: 0;
        padding: 0;
        background: transparent;
        color: #C7A24A;
        cursor: pointer;
      }

      .coal-edit-link:hover {
        text-decoration: underline;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 12px;
      }

      .summary-item {
        min-height: 86px;
        padding: 15px;
        border: 1px solid rgba(247,244,237,.10);
        border-radius: 14px;
        background: rgba(255,255,255,.025);
      }

      .summary-item.highlight {
        border-color: rgba(199,162,74,.35);
        background: rgba(199,162,74,.06);
      }

      .summary-item span {
        display: block;
        margin-bottom: 7px;
        color: rgba(247,244,237,.48);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .summary-item strong {
        display: block;
        color: #F7F4ED;
        font-size: 14px;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .commercial-block {
        padding-bottom: 12px;
      }

      .price-breakdown {
        overflow: hidden;
        border: 1px solid rgba(199,162,74,.28);
        border-radius: 18px;
        background: linear-gradient(
          145deg,
          rgba(199,162,74,.075),
          rgba(255,255,255,.02)
        );
      }

      .price-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(247,244,237,.07);
      }

      .price-row span {
        color: rgba(247,244,237,.62);
        font-size: 13px;
      }

      .price-row strong {
        font-size: 14px;
      }

      .price-row.muted strong {
        color: rgba(247,244,237,.55);
      }

      .grand-total-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 22px 18px;
        background: rgba(199,162,74,.08);
      }

      .grand-total-row span {
        display: block;
        color: #F7F4ED;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: .03em;
      }

      .grand-total-row small {
        display: block;
        margin-top: 4px;
        color: rgba(247,244,237,.45);
        font-size: 10px;
      }

      .grand-total-row strong {
        color: #E1B958;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(30px,5vw,46px);
        font-weight: 500;
        letter-spacing: -.03em;
        white-space: nowrap;
      }

      .commercial-note {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        margin-top: 14px;
        padding: 13px 15px;
        border: 1px solid rgba(247,244,237,.08);
        border-radius: 13px;
        background: rgba(255,255,255,.02);
      }

      .note-icon {
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid rgba(199,162,74,.35);
        color: #C7A24A;
        font: 800 11px/1 Georgia, serif;
      }

      .commercial-note p {
        margin: 0;
        color: rgba(247,244,237,.52);
        font-size: 11px;
        line-height: 1.65;
      }

      .high-value-notice {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin: 18px 0;
        padding: 15px 17px;
        border: 1px solid rgba(199,162,74,.30);
        border-radius: 14px;
        background: rgba(199,162,74,.07);
      }

      .high-value-notice strong {
        color: #E1B958;
        font-size: 13px;
      }

      .high-value-notice span {
        color: rgba(247,244,237,.62);
        font-size: 11px;
        line-height: 1.6;
      }

      .payment-footer {
        display: grid;
        grid-template-columns: 1fr minmax(300px, .95fr);
        gap: 18px;
        align-items: center;
        margin-top: 28px;
        padding-top: 28px;
        border-top: 1px solid rgba(247,244,237,.09);
      }

      .payment-trust {
        display: flex;
        align-items: center;
        gap: 11px;
      }

      .lock-icon {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border: 1px solid rgba(247,244,237,.10);
        border-radius: 50%;
        background: rgba(255,255,255,.03);
      }

      .payment-trust strong,
      .payment-trust small {
        display: block;
      }

      .payment-trust strong {
        margin-bottom: 3px;
        font-size: 12px;
      }

      .payment-trust small {
        color: rgba(247,244,237,.45);
        font-size: 10px;
        line-height: 1.45;
      }

      .coal-pay-button {
        width: 100%;
        min-height: 56px;
        padding: 0 22px;
        border: 1px solid #C7A24A;
        border-radius: 999px;
        background: #C7A24A;
        color: #111214;
        cursor: pointer;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: .10em;
        text-transform: uppercase;
        transition: .2s ease;
      }

      .coal-pay-button:hover:not(:disabled) {
        transform: translateY(-1px);
        filter: brightness(1.05);
      }

      .coal-pay-button:disabled {
        opacity: .52;
        cursor: not-allowed;
      }

      .coal-pay-button.secondary {
        margin-top: 28px;
        background: transparent;
        color: #F7F4ED;
      }

      .success-card {
        text-align: center;
      }

      .success-mark {
        display: grid;
        place-items: center;
        width: 62px;
        height: 62px;
        margin: 0 auto 18px;
        border-radius: 50%;
        background: #C7A24A;
        color: #111214;
        font-size: 28px;
        font-weight: 900;
      }

      .success-grid {
        display: grid;
        grid-template-columns: repeat(2,minmax(0,1fr));
        gap: 12px;
        margin-top: 30px;
        text-align: left;
      }

      .loading-card {
        overflow: hidden;
      }

      .coal-loading-line {
        width: 76%;
        height: 22px;
        margin-top: 24px;
        border-radius: 999px;
        background:
          linear-gradient(
            90deg,
            rgba(255,255,255,.04),
            rgba(255,255,255,.10),
            rgba(255,255,255,.04)
          );
      }

      .coal-loading-line.short {
        width: 44%;
        height: 14px;
        margin-top: 12px;
      }

      @media (max-width: 900px) {
        .summary-grid {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        .payment-footer {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 620px) {
        .coal-pricing-page {
          padding: 18px 10px;
        }

        .coal-pricing-shell,
        .coal-pricing-card {
          border-radius: 20px;
        }

        .coal-pricing-shell {
          padding: 22px 16px;
        }

        .coal-pricing-topbar {
          flex-direction: column;
          gap: 16px;
        }

        .coal-pricing-topbar h1,
        .coal-pricing-card h1 {
          font-size: clamp(42px,14vw,58px);
        }

        .summary-grid,
        .success-grid {
          grid-template-columns: 1fr;
        }

        .coal-section-heading {
          align-items: flex-start;
        }

        .grand-total-row {
          align-items: flex-end;
        }

        .grand-total-row strong {
          font-size: 30px;
        }

        .payment-trust {
          align-items: flex-start;
        }

        .coal-pay-button {
          min-height: 54px;
          padding: 0 16px;
          font-size: 10px;
        }
      }
    `}</style>
  );
}
