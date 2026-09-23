import React, {



    useEffect,



    useState,



  } from "react";







  import { useLocation, useNavigate } from "react-router-dom";



  import { toast } from "react-hot-toast";







  import { coalVisitorApi } from "../../api/coalVisitor";

import { generateInvoicePDF } from "../../utils/pdfInvoiceGenerator";







  const RAZORPAY_SCRIPT =



    "https://checkout.razorpay.com/v1/checkout.js";



  const MAX_RAZORPAY_FULL_PAYMENT = 2500000;







  export default function CoalPricing() {



    const navigate = useNavigate();
    const location = useLocation();

    const readCoalSnapshot = () => {
      try {
        const raw =
          sessionStorage.getItem(
            "ito_coal_visitor_snapshot"
          );

        return raw
          ? JSON.parse(raw)
          : null;
      } catch {
        return null;
      }
    };







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
          response?.visitor ||
          response?.data?.visitor ||
          response?.data ||
          null;

        if (!serverVisitor) {
          throw new Error(
            "Coal visitor response did not include visitor data."
          );
        }

        const normalizedVisitor = {
          ...(visitor || {}),
          ...serverVisitor,
          visitorId:
            serverVisitor.visitorId ||
            response?.visitorId ||
            visitorId,
          requirement:
            serverVisitor.requirement ||
            visitor?.requirement ||
            (() => {
              try {
                const raw =
                  sessionStorage.getItem(
                    "ito_coal_requirement"
                  );

                return raw
                  ? JSON.parse(raw)
                  : {};
              } catch {
                return {};
              }
            })(),
          pricing:
            serverVisitor.pricing ||
            response?.pricing ||
            response?.data?.pricing ||
            visitor?.pricing ||
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

        if (!visitor) {
          toast.error(
            error.response?.data?.message ||
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



        if (



          window.Razorpay



        ) {



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







        const amount =



          Number(



            visitor.pricing



              ?.grandTotal ||



              visitor.pricing



                ?.totalAmount ||



              visitor.pricing



                ?.amount ||



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



        if (amount > MAX_RAZORPAY_FULL_PAYMENT) {



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







          return;



        }







        const orderResponse =



          await coalVisitorApi.createRazorpayOrder(



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







        const options = {



          key:



            orderResponse.keyId,







          amount:



            orderResponse.amount,







          currency:



            orderResponse.currency ||



            "INR",







          name:



            "India Trade Overseas",







          description:



            "Coal commercial payment",







          order_id:



            orderResponse.orderId,







          prefill: {



            name:



              visitor.fullName,







            email:



              visitor.email,







            contact:



              visitor.mobile,



          },







          notes: {



            visitorId:



              visitor.visitorId,







            vertical:



              "COAL",



          },







          theme: {



            color:



              "#D4A84F",



          },







          handler:



            async function (



              razorpayResponse



            ) {



              try {



                const verification =



                  await coalVisitorApi.verifyPayment(



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







                setSuccess(



                  verification



                );







                const verifiedRequirement =



                  visitor?.requirement || {};







                const verifiedPricing =



                  visitor?.pricing || {};







                const quantityMT =



                  Number(



                    verifiedPricing.quantityMT ||



                      verifiedRequirement.targetQtyMT ||



                      verifiedRequirement.orderQtyMT ||



                      verifiedRequirement.targetQty ||



                      verifiedRequirement.orderQty ||



                      0



                  );







                const valuationAmount =



                  Number(



                    verifiedPricing.valuationAmount ||



                      verifiedRequirement.estValuation ||



                      0



                  );







                const transportAmount =



                  Number(



                    verifiedPricing.transportAmount ||



                      0



                  );







                const subtotal =



                  Number(



                    verifiedPricing.subtotal ||



                      valuationAmount + transportAmount



                  );







                const gstAmount =



                  Number(



                    verifiedPricing.gstAmount ||



                      0



                  );







                const grandTotal =



                  Number(



                    verifiedPricing.grandTotal ||



                      verifiedPricing.totalAmount ||



                      verifiedPricing.amount ||



                      0



                  );







                generateInvoicePDF({



                  customerName:



                    visitor.fullName || "Valued Customer",



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



                      verifiedRequirement.origin,



                      verifiedRequirement.coalType,



                      verifiedRequirement.gcvKcalKg



                        ? `${verifiedRequirement.gcvKcalKg} kcal/kg`



                        : "",



                      verifiedRequirement.basis



                    ]



                      .filter(Boolean)



                      .join(" · "),



                  quantity:



                    quantityMT,



                  quantityUnit:



                    "MT",



                  unitPrice:



                    quantityMT > 0



                      ? valuationAmount / quantityMT



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



                    verification.razorpayPaymentId ||



                    razorpayResponse.razorpay_payment_id



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



                  error.response



                    ?.data?.message ||



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



          error.response?.data?.message ||



            error.message ||



            "Unable to start payment."



        );







        setPaying(false);



      }



    };







    if (loading) {



      return (



        <div style={pageStyle}>



          <div style={cardStyle}>



            <div style={eyebrowStyle}>



              INDIA TRADE OVERSEAS · COAL



            </div>







            <h1 style={titleStyle}>



              Loading requirement...



            </h1>



          </div>



        </div>



      );



    }







    if (success) {



      return (



        <div style={pageStyle}>



          <div style={cardStyle}>



            <div style={eyebrowStyle}>



              PAYMENT VERIFIED



            </div>







            <h1 style={titleStyle}>



              Coal order created.



            </h1>







            <p style={textStyle}>



              Your payment has been verified



              and your coal requirement has



              been registered with India Trade



              Overseas.



            </p>







            <div style={summaryStyle}>



              <div>



                <span>Visitor ID</span>



                <strong>



                  {success.visitorId}



                </strong>



              </div>







              <div>



                <span>Order ID</span>



                <strong>



                  {success.orderId}



                </strong>



              </div>







              <div>



                <span>Razorpay Payment</span>



                <strong>



                  {success.razorpayPaymentId}



                </strong>



              </div>







              <div>



                <span>Razorpay Order</span>



                <strong>



                  {success.razorpayOrderId}



                </strong>



              </div>



            </div>







            <button



              type="button"



              style={buttonStyle}



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



          0



      );







    const transportAmount =



      Number(



        pricing.transportAmount ||



          0



      );







    const gstAmount =



      Number(



        pricing.gstAmount ||



          0



      );







    const gstRate =



      Number(



        pricing.gstRate ||



          0



      );







    const amount =



      Number(



        pricing.grandTotal ||



          pricing.totalAmount ||



          pricing.amount ||



          0



      );



    const exceedsRazorpayFullPaymentLimit =



      amount > MAX_RAZORPAY_FULL_PAYMENT;







    return (



      <div style={pageStyle}>



        <div style={cardStyle}>



          <div style={eyebrowStyle}>



            INDIA TRADE OVERSEAS · COAL



          </div>







          <h1 style={titleStyle}>



            Coal Commercial Summary



          </h1>







          <p style={textStyle}>



            Review the requirement captured



            from your Coal Requirement Builder



            before continuing.



          </p>







          <div style={summaryStyle}>



            <div>



              <span>Buyer</span>



              <strong>



                {visitor.fullName}



              </strong>



            </div>







            <div>



              <span>Company</span>



              <strong>



                {visitor.company}



              </strong>



            </div>







            <div>



              <span>Origin</span>



              <strong>



                {requirement.origin ||



                  "Not specified"}



              </strong>



            </div>







            <div>



              <span>Coal Type</span>



              <strong>



                {requirement.coalType ||



                  "Not specified"}



              </strong>



            </div>







            <div>



              <span>GCV</span>



              <strong>



                {requirement.gcvKcalKg



                  ? `${requirement.gcvKcalKg} kcal/kg`



                  : "Not specified"}



              </strong>



            </div>







            <div>



              <span>Basis</span>



              <strong>



                {requirement.basis ||



                  "Not specified"}



              </strong>



            </div>







            <div>



              <span>Target Quantity</span>



              <strong>



                {requirement.targetQtyMT ||



                  requirement.orderQtyMT ||



                  "Not specified"}{" "}



                MT



              </strong>



            </div>







            <div>



              <span>Destination</span>



              <strong>



                {requirement.dest ||



                  "Not specified"}



              </strong>



            </div>







            <div>



              <span>Transport</span>



              <strong>



                {requirement.tMode ||



                  "Not specified"}



              </strong>



            </div>







            <div>



              <span>Incoterm</span>



              <strong>



                {requirement.incoterm ||



                  "Not specified"}



              </strong>



            </div>



          </div>







          <div style={priceBoxStyle}>



            <span>



              Backend Pricing



            </span>







            <div style={priceBreakdownStyle}>



              <div>



                <span>Valuation</span>



                <strong>



                  ₹{valuationAmount.toLocaleString("en-IN")}



                </strong>



              </div>







              <div>



                <span>Transport</span>



                <strong>



                  ₹{transportAmount.toLocaleString("en-IN")}



                </strong>



              </div>







              <div>



                <span>



                  GST



                  {gstRate > 0



                    ? ` (${(gstRate * 100).toFixed(



                        Number.isInteger(gstRate * 100) ? 0 : 2



                      )}%)`



                    : ""}



                </span>



                <strong>



                  ₹{gstAmount.toLocaleString("en-IN")}



                </strong>



              </div>







              <div style={priceTotalRowStyle}>



                <span>Grand Total</span>



                <strong>



                  ₹{amount.toLocaleString("en-IN")}



                </strong>



              </div>



            </div>



          </div>







          {exceedsRazorpayFullPaymentLimit && (



            <div style={highValueNoticeStyle}>



              <strong>



                High-value order



              </strong>



              <span>



                Full online gateway payment is available only up to ₹25,00,000 for this checkout flow. Your requirement and pricing remain saved; use the commercial payment process for this order.



              </span>



            </div>



          )}







          <button



            type="button"



            disabled={



              paying ||



              amount <= 0 ||



              exceedsRazorpayFullPaymentLimit



            }



            style={{



              ...buttonStyle,



              opacity:



                paying ||



                amount <= 0 ||



                exceedsRazorpayFullPaymentLimit



                  ? 0.55



                  : 1,



              cursor:



                paying ||



                amount <= 0 ||



                exceedsRazorpayFullPaymentLimit



                  ? "not-allowed"



                  : "pointer",



            }}



            onClick={startPayment}



          >



            {paying



              ? "OPENING PAYMENT..."



              : exceedsRazorpayFullPaymentLimit



                ? "FULL ONLINE PAYMENT UNAVAILABLE"



                : "PAY FULL AMOUNT ONLINE"}



          </button>



        </div>



      </div>



    );



  }







  const pageStyle = {



    minHeight: "100vh",



    background:



      "linear-gradient(135deg,#071826,#101214)",



    color: "#F4F0E7",



    padding: "60px 20px",



    display: "flex",



    alignItems: "center",



    justifyContent: "center",



  };







  const cardStyle = {



    width: "min(900px,100%)",



    padding: "40px",



    borderRadius: "28px",



    background:



      "rgba(255,255,255,.045)",



    border:



      "1px solid rgba(212,168,79,.25)",



    backdropFilter: "blur(18px)",



    boxShadow:



      "0 40px 100px rgba(0,0,0,.45)",



  };







  const eyebrowStyle = {



    color: "#D4A84F",



    fontSize: 10,



    fontWeight: 900,



    letterSpacing: ".18em",



  };







  const titleStyle = {



    margin:



      "14px 0 16px",



    fontFamily:



      "Georgia, Times New Roman, serif",



    fontSize:



      "clamp(42px,7vw,76px)",



    lineHeight: ".92",



    fontWeight: 500,



  };







  const textStyle = {



    color:



      "rgba(244,240,231,.65)",



    lineHeight: 1.8,



    maxWidth: 650,



  };







  const summaryStyle = {



    display: "grid",



    gridTemplateColumns:



      "repeat(auto-fit,minmax(210px,1fr))",



    gap: 12,



    margin:



      "30px 0",



  };







  const summaryItemStyle = {



    padding: 15,



    borderRadius: 12,



    background:



      "rgba(255,255,255,.035)",



    border:



      "1px solid rgba(244,240,231,.10)",



  };







  const priceBoxStyle = {



    display: "flex",



    flexDirection: "column",



    gap: 8,



    padding: 22,



    margin:



      "24px 0",



    borderRadius: 16,



    border:



      "1px solid rgba(212,168,79,.35)",



    background:



      "rgba(212,168,79,.06)",



  };







  const priceBreakdownStyle = {



    display: "grid",



    gap: 10,



    marginTop: 8,



  };







  const priceTotalRowStyle = {



    marginTop: 4,



    paddingTop: 12,



    borderTop:



      "1px solid rgba(212,168,79,.30)",



    fontSize: 18,



  };







  const highValueNoticeStyle = {



    display: "flex",



    flexDirection: "column",



    gap: 6,



    marginBottom: 14,



    padding: "14px 16px",



    border: "1px solid rgba(212, 168, 79, 0.35)",



    borderRadius: 12,



    background: "rgba(212, 168, 79, 0.08)",



    color: "#F4F0E7",



    fontSize: 12,



    lineHeight: 1.6,



  };







  const buttonStyle = {



    width: "100%",



    minHeight: 54,



    border: "1px solid #D4A84F",



    borderRadius: 999,



    background: "#D4A84F",



    color: "#071826",



    fontWeight: 900,



    letterSpacing: ".1em",



  };