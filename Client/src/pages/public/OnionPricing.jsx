import React, { useEffect, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";

import { loadRazorpayScript } from "../../utils/razorpay";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import { onionVisitorApi } from "../../api/onionVisitor";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function OnionPricing() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const visitorId = params.get("visitorId");

  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(null);

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
      navigate("/nashik-onion", {
        replace: true,
      });

      return;
    }

    onionVisitorApi
      .get(visitorId)
      .then((res) => {
        if (!res?.success) {
          throw new Error(
            res?.message ||
              "Unable to load quotation"
          );
        }

        setVisitor(res.data.visitor);
      })
      .catch((error) => {
        toast.error(
          error.message ||
            "Unable to load quotation"
        );

        navigate("/nashik-onion", {
          replace: true,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [visitorId, navigate]);

  const pay = async () => {
    if (!visitor || paying) return;

    try {
      setPaying(true);

      const orderRes =
        await onionVisitorApi.createRazorpayOrder(
          visitor.visitorId
        );

      if (!orderRes.success) {
        throw new Error(
          orderRes.message ||
            "Unable to create payment order"
        );
      }

      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error(
          "Payment gateway failed to initialise."
        );
      }

      const {
        orderId,
        keyId,
        amount,
      } = orderRes.data;

      const checkout =
        new window.Razorpay({
          key: keyId,
          amount,
          currency: "INR",

          name:
            "Prakriti by India Trade Overseas",

          description:
            `Red Onion Order ${visitor.visitorId}`,

          order_id: orderId,

          prefill: {
            name: visitor.fullName,
            email: visitor.email,
            contact: visitor.phone,
          },

          theme: {
            color: "#7A2332",
          },

          handler: async (response) => {
            try {
              const verify =
                await onionVisitorApi.verifyPayment(
                  visitor.visitorId,
                  response
                );

              if (!verify.success) {
                throw new Error(
                  verify.message ||
                    "Payment verification failed"
                );
              }

              setSuccess(verify.data);

              toast.success(
                "Payment successful! Your onion order has been created."
              );
            } catch (error) {
              toast.error(
                error.message ||
                  "Payment verification failed"
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
        });

      checkout.open();
    } catch (error) {
      setPaying(false);

      toast.error(
        error.message ||
          "Unable to start payment"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F7F3EA] text-[#4A101C] font-semibold">
        Preparing your quotation…
      </div>
    );
  }

  if (!visitor) return null;

  const pricing = visitor.pricing || {};
  const requirement =
    visitor.requirement || {};

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-4 py-8 sm:py-12 text-[#22211F]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-[#7A2332]">
              Prakriti by India Trade Overseas
            </div>

            <h1 className="mt-1 text-3xl sm:text-5xl font-semibold text-[#350914]">
              Onion Pricing & Order
            </h1>
          </div>

          <button
            onClick={() =>
              navigate("/nashik-onion")
            }
            className="rounded-xl border border-[#7A2332]/20 bg-white px-4 py-2 text-sm font-bold text-[#7A2332]"
          >
            Back
          </button>
        </div>

        {success ? (
          <div className="rounded-3xl bg-white p-8 shadow-xl border border-green-200">
            <div className="text-4xl">
              ✓
            </div>

            <h2 className="mt-4 text-3xl font-semibold text-[#350914]">
              Payment Successful
            </h2>

            <p className="mt-2 text-gray-600">
              Your onion order has been recorded successfully.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div>
                <span className="text-xs text-gray-500">
                  Order ID
                </span>

                <div className="font-bold">
                  {success.orderId}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">
                  Payment ID
                </span>

                <div className="font-bold break-all">
                  {success.paymentId}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">
                  Amount
                </span>

                <div className="font-bold">
                  {money(success.amount)}
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                navigate("/nashik-onion")
              }
              className="mt-7 rounded-xl bg-[#7A2332] px-6 py-3 text-sm font-black uppercase tracking-wider text-white"
            >
              Return to Onion Page
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* REQUIREMENT */}
            <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-[#DED1BC]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#566044]">
                    Buyer requirement
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold text-[#350914]">
                    Red Onion — New Crop
                  </h2>
                </div>

                <span className="rounded-full bg-[#7A2332]/10 px-3 py-1 text-xs font-bold text-[#7A2332]">
                  {requirement.tradeType}
                </span>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Destination"
                  value={requirement.destination}
                />

                <Info
                  label="Size"
                  value={requirement.size?.replace(
                    "_PLUS",
                    "+"
                  )}
                />

                <Info
                  label="Grade"
                  value={requirement.grade?.replace(
                    /_/g,
                    " "
                  )}
                />

                <Info
                  label="Quantity"
                  value={`${Number(
                    requirement.quantityKg
                  ).toLocaleString(
                    "en-IN"
                  )} KG (${requirement.quantityMT} MT)`}
                />

                <Info
                  label="Packaging"
                  value={requirement.packaging}
                />

                <Info
                  label="Timeline"
                  value={visitor.timeline}
                />
              </div>
            </section>

            {/* PRICE */}
            <section className="rounded-3xl bg-[#350914] p-6 sm:p-8 text-white shadow-xl">
              <div className="text-xs font-bold uppercase tracking-wider text-[#B5965A]">
                Complete quotation
              </div>

              <h2 className="mt-2 text-2xl font-semibold">
                Payable Summary
              </h2>

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
                    label={`JNPT @ ${money(
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
                    label={`GST (${
                      pricing.gstRate * 100
                    }%)`}
                    value={money(
                      pricing.gstAmount
                    )}
                  />
                </div>

                <div className="border-t border-[#B5965A]/40 pt-5">
                  <Row
                    label="FINAL PAYABLE"
                    value={money(
                      pricing.grandTotal
                    )}
                    big
                  />
                </div>
              </div>

              <button
                disabled={paying}
                onClick={pay}
                className="mt-7 w-full rounded-2xl bg-[#F7F3EA] py-4 text-sm font-black uppercase tracking-wider text-[#7A2332] transition hover:bg-[#B5965A] hover:text-white disabled:opacity-50"
              >
                {paying
                  ? "Opening Razorpay…"
                  : "Place Order and Pay"}
              </button>

              <p className="mt-3 text-center text-[11px] text-white/55">
                Secure payment powered by Razorpay
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#F7F3EA] p-4">
      <div className="text-[10px] font-black uppercase tracking-wider text-[#566044]">
        {label}
      </div>

      <div className="mt-1 font-semibold text-[#350914]">
        {value || "—"}
      </div>
    </div>
  );
}

function Row({ label, value, big }) {
  return (
    <div
      className={`flex items-end justify-between gap-4 ${
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

      <span>{value}</span>
    </div>
  );
}