import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { toast } from "react-hot-toast";

import {
  loadRazorpayScript,
} from "../../utils/razorpay";

import useDocumentMeta from "../../hooks/useDocumentMeta";

import {
  onionVisitorApi,
} from "../../api/onionVisitor";

import {
  generateInvoicePDF,
} from "../../utils/pdfInvoiceGenerator";

const money = (value) =>
  new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value || 0)
  );

function normalizePricing(
  pricing = {}
) {
  return {
    unitRate:
      Number(
        pricing.unitRate || 0
      ),

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
      Number(
        pricing.subtotal || 0
      ),

    gstRate:
      Number(
        pricing.gstRate || 0
      ),

    gstAmount:
      Number(
        pricing.gstAmount || 0
      ),

    grandTotal:
      Number(
        pricing.grandTotal || 0
      ),
  };
}

function isHighValueRazorpayError(
  error
) {
  const errorCode =
    error?.response
      ?.data
      ?.errorCode ||
    "";

  const message = String(
    error?.response
      ?.data
      ?.message ||
    error?.message ||
    ""
  ).toLowerCase();

  return (
    errorCode ===
      "HIGH_VALUE_PAYMENT_REQUIRED" ||
    (
      errorCode ===
        "PAYMENT_GATEWAY_ERROR" &&
      (
        message.includes(
          "amount exceeds maximum"
        ) ||
        message.includes(
          "maximum amount allowed"
        )
      )
    ) ||
    message.includes(
      "amount exceeds maximum amount allowed"
    )
  );
}

export default function OnionPricing() {
  const [params] =
    useSearchParams();

  const navigate =
    useNavigate();

  const visitorId =
    params.get(
      "visitorId"
    );

  const [
    visitor,
    setVisitor,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    paying,
    setPaying,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState(null);

  const [
    priceUpdated,
    setPriceUpdated,
  ] = useState(false);

  const [
    commercialPaymentRequired,
    setCommercialPaymentRequired,
  ] = useState(false);

  useDocumentMeta({
    title:
      "Onion Pricing | India Trade Overseas",

    description:
      "Calculated Nashik Red Onion quotation and secure payment",

    canonicalPath:
      "/nashik-onion/pricing",
  });

  useEffect(() => {
    if (!visitorId) {
      navigate(
        "/nashik-onion",
        {
          replace: true,
        }
      );

      return;
    }

    let cancelled =
      false;

    const loadVisitor =
      async () => {
        try {
          setLoading(true);

          const response =
            await onionVisitorApi.get(
              visitorId
            );

          if (
            !response?.success
          ) {
            throw new Error(
              response?.message ||
                "Unable to load quotation."
            );
          }

          const visitorData =
            response?.data
              ?.visitor;

          if (!visitorData) {
            throw new Error(
              "Quotation data was not returned by the server."
            );
          }

          if (!cancelled) {
            setVisitor(
              visitorData
            );
          }
        } catch (error) {
          console.error(
            "Onion visitor loading error:",
            error
          );

          if (!cancelled) {
            toast.error(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Unable to load quotation."
            );

            navigate(
              "/nashik-onion",
              {
                replace: true,
              }
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(
              false
            );
          }
        }
      };

    loadVisitor();

    return () => {
      cancelled = true;
    };
  }, [
    visitorId,
    navigate,
  ]);

  const generateVerifiedInvoice = ({
    verificationData,
    razorpayResponse,
    verifiedPricing,
  }) => {
    if (!visitor) {
      return;
    }

    const requirement =
      visitor.requirement ||
      {};

    const pricing =
      normalizePricing(
        verifiedPricing ||
          visitor.pricing ||
          {}
      );

    const quantityKg =
      Number(
        requirement
          .quantityKg ||
          0
      );

    try {
      generateInvoicePDF({
        customerName:
          visitor.fullName ||
          "Valued Customer",

        customerEmail:
          visitor.email ||
          "",

        city:
          visitor.city ||
          "",

        state:
          visitor.state ||
          "",

        productName:
          "Nashik Red Onion",

        grade:
          [
            requirement.size,
            requirement.grade
              ?.replace(
                /_/g,
                " "
              ),
            requirement
              .destination,
          ]
            .filter(Boolean)
            .join(
              " · "
            ),

        quantity:
          quantityKg,

        quantityUnit:
          "Kg",

        unitPrice:
          pricing.unitRate,

        subtotal:
          pricing.subtotal,

        gstAmount:
          pricing.gstAmount,

        totalAmount:
          pricing.grandTotal,

        paymentMode:
          "ONLINE",

        paymentStatus:
          "PAID & CONFIRMED",

        paymentId:
          verificationData
            ?.paymentId ||
          razorpayResponse
            ?.razorpay_payment_id ||
          "",
      });
    } catch (error) {
      console.error(
        "Onion invoice generation error:",
        error
      );

      toast.error(
        "Payment is confirmed, but the invoice could not be generated automatically."
      );
    }
  };

  const pay = async () => {
    if (
      !visitor ||
      paying
    ) {
      return;
    }

    try {
      setPaying(true);

      const currentTotal =
        Number(
          visitor
            ?.pricing
            ?.grandTotal ||
            0
        );

      if (
        !Number.isFinite(
          currentTotal
        ) ||
        currentTotal <= 0
      ) {
        throw new Error(
          "A valid onion payable amount is not available."
        );
      }

      const orderRes =
        await onionVisitorApi
          .createRazorpayOrder(
            visitor.visitorId
          );

      if (
        !orderRes?.success
      ) {
        throw new Error(
          orderRes?.message ||
            "Unable to create payment order."
        );
      }

      const orderData =
        orderRes?.data ||
        {};

      if (
        orderData
          .priceChanged
      ) {
        const latestPricing =
          normalizePricing(
            orderData.pricing ||
              {}
          );

        setVisitor(
          (
            previous
          ) => ({
            ...previous,
            pricing:
              latestPricing,
          })
        );

        setPriceUpdated(
          true
        );

        setCommercialPaymentRequired(
          false
        );

        toast(
          orderRes?.message ||
            "Onion market price has changed. Please review the updated amount before paying.",
          {
            icon: "ℹ️",
          }
        );

        return;
      }

      if (
        !orderData
          .orderId ||
        !orderData
          .keyId ||
        !orderData
          .amount
      ) {
        throw new Error(
          "Incomplete Razorpay order response."
        );
      }

      if (
        orderData.pricing
      ) {
        setVisitor(
          (
            previous
          ) => ({
            ...previous,
            pricing:
              normalizePricing(
                orderData
                  .pricing
              ),
          })
        );
      }

      const razorpayLoaded =
        await loadRazorpayScript();

      if (
        !razorpayLoaded ||
        !window.Razorpay
      ) {
        throw new Error(
          "Payment gateway failed to initialise."
        );
      }

      const checkout =
        new window.Razorpay({
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
            `Nashik Red Onion Order ${visitor.visitorId}`,

          order_id:
            orderData.orderId,

          prefill: {
            name:
              visitor.fullName ||
              "",

            email:
              visitor.email ||
              "",

            contact:
              visitor.phone ||
              visitor.mobile ||
              "",
          },

          notes: {
            visitorId:
              visitor.visitorId,

            vertical:
              "ONION",

            product:
              "Red Onion",

            destination:
              visitor
                .requirement
                ?.destination ||
              "",
          },

          theme: {
            color:
              "#7A2332",
          },

          handler:
            async (
              razorpayResponse
            ) => {
              const verificationToast =
                toast.loading(
                  "Verifying payment..."
                );

              try {
                const verify =
                  await onionVisitorApi
                    .verifyPayment(
                      visitor.visitorId,
                      {
                        razorpay_order_id:
                          razorpayResponse
                            .razorpay_order_id,

                        razorpay_payment_id:
                          razorpayResponse
                            .razorpay_payment_id,

                        razorpay_signature:
                          razorpayResponse
                            .razorpay_signature,
                      }
                    );

                if (
                  !verify?.success
                ) {
                  throw new Error(
                    verify?.message ||
                      "Payment verification failed."
                  );
                }

                const verificationData =
                  verify?.data ||
                  {};

                if (
                  !verificationData
                    .orderId
                ) {
                  throw new Error(
                    "Payment was verified but order confirmation was not returned."
                  );
                }

                const verifiedPricing =
                  normalizePricing(
                    verificationData
                      .pricing ||
                      orderData
                        .pricing ||
                      visitor
                        .pricing ||
                      {}
                  );

                const successData = {
                  ...verificationData,

                  visitorId:
                    verificationData
                      .visitorId ||
                    visitor
                      .visitorId,

                  orderId:
                    verificationData
                      .orderId,

                  paymentId:
                    verificationData
                      .paymentId ||
                    razorpayResponse
                      .razorpay_payment_id,

                  amount:
                    Number(
                      verificationData
                        .amount ||
                        verifiedPricing
                          .grandTotal ||
                        0
                    ),

                  pricing:
                    verifiedPricing,

                  razorpayOrderId:
                    razorpayResponse
                      .razorpay_order_id,

                  razorpayPaymentId:
                    razorpayResponse
                      .razorpay_payment_id,
                };

                setSuccess(
                  successData
                );

                setVisitor(
                  (
                    previous
                  ) => ({
                    ...previous,

                    pricing:
                      verifiedPricing,

                    paymentStatus:
                      "COMPLETED",

                    status:
                      "ORDER_CREATED",

                    orderId:
                      successData
                        .orderId,
                  })
                );

                setPriceUpdated(
                  false
                );

                setCommercialPaymentRequired(
                  false
                );

                toast.dismiss(
                  verificationToast
                );

                generateVerifiedInvoice({
                  verificationData:
                    successData,

                  razorpayResponse,

                  verifiedPricing,
                });

                toast.success(
                  "Payment verified. Onion order created and invoice generated."
                );
              } catch (error) {
                console.error(
                  "Onion payment verification error:",
                  error
                );

                toast.dismiss(
                  verificationToast
                );

                toast.error(
                  error?.response
                    ?.data
                    ?.message ||
                    error?.message ||
                    "Payment verification failed."
                );
              } finally {
                setPaying(
                  false
                );
              }
            },

          modal: {
            ondismiss:
              () => {
                setPaying(
                  false
                );
              },
          },
        });

      checkout.on(
        "payment.failed",
        (
          response
        ) => {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setPaying(
            false
          );

          toast.error(
            response?.error
              ?.description ||
              "Payment failed. Please try again."
          );
        }
      );

      checkout.open();
    } catch (error) {
      console.error(
        "Onion payment error:",
        error
      );

      if (
        isHighValueRazorpayError(
          error
        )
      ) {
        setCommercialPaymentRequired(
          true
        );

        toast.error(
          "Full online payment is unavailable for this order value. Please use our commercial payment process."
        );

        return;
      }

      toast.error(
        error?.response
          ?.data
          ?.message ||
          error?.message ||
          "Unable to start payment."
      );
    } finally {
      setPaying(
        false
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F7F3EA] px-4 text-center text-[#4A101C] font-semibold">
        Preparing your quotation…
      </div>
    );
  }

  if (!visitor) {
    return null;
  }

  const pricing =
    normalizePricing(
      visitor.pricing ||
        {}
    );

  const requirement =
    visitor.requirement ||
    {};

  if (success) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] px-4 pb-8 pt-36 text-[#22211F] sm:pb-12 sm:pt-40 lg:pt-44">
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-[#DED1BC] bg-white shadow-xl">
            <div className="border-b border-[#DED1BC] bg-[#350914] px-6 py-7 text-white sm:px-8">
              <div className="text-xs font-black uppercase tracking-[.18em] text-[#B5965A]">
                Verified Payment
              </div>

              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                Onion Order Confirmed
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Your payment was verified by our server and your Onion order has been created successfully.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SuccessInfo
                  label="Visitor ID"
                  value={
                    success.visitorId ||
                    visitor.visitorId
                  }
                />

                <SuccessInfo
                  label="Order ID"
                  value={
                    success.orderId
                  }
                />

                <SuccessInfo
                  label="Payment ID"
                  value={
                    success.paymentId
                  }
                />

                <SuccessInfo
                  label="Amount Paid"
                  value={money(
                    success.amount
                  )}
                />
              </div>

              <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="font-bold text-green-800">
                  Payment status: PAID & CONFIRMED
                </div>

                <p className="mt-1 text-sm leading-6 text-green-700">
                  Your invoice has been generated after successful payment verification.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/nashik-onion"
                    )
                  }
                  className="rounded-xl bg-[#7A2332] px-6 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-[#8E3347]"
                >
                  Return to Onion Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-4 pb-8 pt-36 text-[#22211F] sm:pb-12 sm:pt-40 lg:pt-44">
      <div className="relative z-10 mx-auto max-w-5xl">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-[#7A2332]">
              India Trade Overseas
            </div>

            <h1 className="mt-1 text-3xl font-semibold text-[#350914] sm:text-5xl">
              Onion Pricing & Order
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#22211F]/65">
              Review your current commercial amount before proceeding to secure online payment.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/nashik-onion"
              )
            }
            className="self-start rounded-xl border border-[#7A2332]/20 bg-white px-4 py-2 text-sm font-bold text-[#7A2332] sm:self-auto"
          >
            Back
          </button>
        </div>

        {priceUpdated && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <div className="font-black text-amber-900">
              Onion market price updated
            </div>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              The Onion rate changed since this quotation was first prepared. The amount below is the latest backend-calculated price. Please review it before clicking Pay again.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">

          <div className="space-y-6">
            <section className="rounded-3xl border border-[#DED1BC] bg-white p-6 shadow-xl sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#566044]">
                    Buyer requirement
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold text-[#350914]">
                    Red Onion — New Crop
                  </h2>
                </div>

                <span className="self-start rounded-full bg-[#7A2332]/10 px-3 py-1 text-xs font-bold text-[#7A2332]">
                  {requirement.tradeType ||
                    "—"}
                </span>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Destination"
                  value={
                    requirement.destination
                  }
                />

                <Info
                  label="Size"
                  value={
                    requirement.size
                  }
                />

                <Info
                  label="Grade"
                  value={
                    requirement.grade
                      ?.replace(
                        /_/g,
                        " "
                      )
                  }
                />

                <Info
                  label="Quantity"
                  value={`${Number(
                    requirement.quantityKg ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )} KG (${Number(
                    requirement.quantityMT ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )} MT)`}
                />

                <Info
                  label="Packaging"
                  value={
                    requirement.packaging
                  }
                />

                <Info
                  label="Timeline"
                  value={
                    visitor.timeline
                  }
                />
              </div>
            </section>

            <section className="rounded-3xl border border-[#DED1BC] bg-white p-6 shadow-lg sm:p-8">
              <div className="text-xs font-bold uppercase tracking-wider text-[#566044]">
                Buyer details
              </div>

              <h2 className="mt-2 text-2xl font-semibold text-[#350914]">
                Billing & Contact
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Name"
                  value={
                    visitor.fullName
                  }
                />

                <Info
                  label="Email"
                  value={
                    visitor.email
                  }
                />

                <Info
                  label="Mobile"
                  value={
                    visitor.phone ||
                    visitor.mobile
                  }
                />

                <Info
                  label="Location"
                  value={[
                    visitor.city,
                    visitor.state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              </div>
            </section>
          </div>

          <section className="h-fit rounded-3xl bg-[#350914] p-6 text-white shadow-xl sm:p-8 lg:sticky lg:top-36">
            <div className="text-xs font-bold uppercase tracking-wider text-[#B5965A]">
              Current quotation
            </div>

            <h2 className="mt-2 text-2xl font-semibold">
              Payable Summary
            </h2>

            <p className="mt-2 text-xs leading-5 text-white/55">
              Final payment is created only after the server confirms that this Onion pricing is still current.
            </p>

            <div className="mt-7 space-y-4 text-sm">
              <Row
                label={`Onion @ ${money(
                  pricing.unitRate
                )}/kg`}
                value={money(
                  pricing.materialAmount
                )}
              />

              {pricing.transportAmount >
                0 && (
                <Row
                  label={`Transport @ ${money(
                    pricing.transportRate
                  )}/kg`}
                  value={money(
                    pricing.transportAmount
                  )}
                />
              )}

              <div className="border-t border-white/15 pt-4">
                <Row
                  label="Subtotal"
                  value={money(
                    pricing.subtotal
                  )}
                />

                <Row
                  label={`GST ${(
                    pricing.gstRate *
                    100
                  ).toLocaleString(
                    "en-IN",
                    {
                      maximumFractionDigits:
                        2,
                    }
                  )}%`}
                  value={money(
                    pricing.gstAmount
                  )}
                />
              </div>

              <div className="border-t border-[#B5965A]/40 pt-5">
                <Row
                  label="Total Payable"
                  value={money(
                    pricing.grandTotal
                  )}
                  big
                />
              </div>
            </div>

            {commercialPaymentRequired ? (
              <div className="mt-7 rounded-2xl border border-[#B5965A]/35 bg-white/10 p-5">
                <div className="text-sm font-black uppercase tracking-wider text-[#B5965A]">
                  High-Value Commercial Payment
                </div>

                <p className="mt-2 text-sm leading-6 text-white/75">
                  This order exceeds the online payment amount currently accepted by the payment gateway. Your requirement and latest pricing are safely recorded.
                </p>

                <p className="mt-3 text-xs leading-5 text-white/55">
                  No payment has been marked successful and no paid invoice has been generated. Please contact our commercial team to arrange the appropriate payment method.
                </p>

                <a
                  href="https://wa.me/9973218366?text=Hello%20India%20Trade%20Overseas.%20I%20have%20a%20high-value%20Nashik%20Onion%20order%20and%20need%20assistance%20with%20commercial%20payment."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#F7F3EA] px-4 text-center text-sm font-black uppercase tracking-wider text-[#7A2332] transition hover:bg-[#B5965A] hover:text-white"
                >
                  Contact Sales for Payment
                </a>

                <button
                  type="button"
                  onClick={() =>
                    setCommercialPaymentRequired(
                      false
                    )
                  }
                  className="mt-3 w-full rounded-xl border border-white/15 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/70 transition hover:bg-white/10"
                >
                  Try Online Payment Again
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={
                  paying ||
                  pricing.grandTotal <=
                    0
                }
                onClick={pay}
                className="mt-7 w-full rounded-2xl bg-[#F7F3EA] px-4 py-4 text-sm font-black uppercase tracking-wider text-[#7A2332] transition hover:bg-[#B5965A] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paying
                  ? "Checking Current Price…"
                  : priceUpdated
                    ? "Pay Updated Amount"
                    : "Place Order and Pay"}
              </button>
            )}

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[#B5965A]">
                  ✓
                </span>

                <p className="text-[11px] leading-5 text-white/60">
                  Secure payment powered by Razorpay. Order confirmation and invoice are generated only after backend payment verification.
                </p>
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] leading-4 text-white/40">
              Onion prices are market-sensitive and may change before payment.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#F7F3EA] p-4">
      <div className="text-[10px] font-black uppercase tracking-wider text-[#566044]">
        {label}
      </div>

      <div className="mt-1 break-words font-semibold text-[#350914]">
        {value || "—"}
      </div>
    </div>
  );
}

function SuccessInfo({
  label,
  value,
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#DED1BC] bg-[#F7F3EA] p-4">
      <div className="text-[10px] font-black uppercase tracking-wider text-[#566044]">
        {label}
      </div>

      <div className="mt-1 break-all font-bold text-[#350914]">
        {value || "—"}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  big = false,
}) {
  return (
    <div
      className={`flex items-start justify-between gap-5 ${
        big
          ? "text-xl font-black"
          : ""
      }`}
    >
      <span
        className={
          big
            ? "text-[#B5965A]"
            : "text-white/70"
        }
      >
        {label}
      </span>

      <span
        className={`shrink-0 text-right ${
          big
            ? "text-white"
            : "font-semibold text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}