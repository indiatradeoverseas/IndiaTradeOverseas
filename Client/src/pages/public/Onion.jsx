import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  toast,
} from "react-hot-toast";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import OnionRequirementBuilder from "../../components/requirements/OnionRequirementBuilder";
import { onionVisitorApi } from "../../api/onionVisitor";
import { IoLogoWhatsapp } from "react-icons/io5";

/*
  Onion.jsx — Nashik Onion Vertical
  India Trade Overseas

  Premium Tea-style hero carousel with the existing full DPR content.
  Hero images are served from public/images/onion-images/.
*/

const HERO_IMAGES = [
  "/images/onion-images/onion-1.png",
  "/images/onion-images/onion-2.png",
  "/images/onion-images/onion-4.png",
  "/images/onion-images/onion-5.png",
];

const COLORS = {
  burgundy: "#4A101C",
  onionRed: "#7A2332",
  wine: "#8E3347",
  olive: "#566044",
  ivory: "#F7F3EA",
  sand: "#DED1BC",
  gold: "#B5965A",
  charcoal: "#22211F",
  white: "#FFFFFF",
};

const SIZES = [
  "25–35 mm (Small)",
  "35–45 mm (Medium)",
  "45–55 mm (Large)",
  "55+ mm (Extra Large)",
  "Mixed Grade (Buyer-defined ratio)",
];

const MARKETS = [
  "Sri Lanka",
  "Bangladesh",
  "Nepal",
  "Bhutan",
  "United Arab Emirates",
  "Oman",
  "Qatar",
  "Bahrain",
  "Kuwait",
  "Saudi Arabia",
  "Maldives",
  "Malaysia",
  "Singapore",
  "Vietnam",
  "Mauritius",
];

const GRADES = [
  {
    name: "Commercial",
    positioning: "Price-sensitive domestic or approved bulk requirements",
    control: "Standard sorting; buyer-agreed visible-defect and mixed-size tolerance",
  },
  {
    name: "Standard Export",
    positioning: "International wholesale distribution",
    control: "Mature bulbs, suitable curing, buyer-approved size, export packing and controlled defects",
  },
  {
    name: "Premium Export",
    positioning: "Premium wholesale and retail channels",
    control: "Tighter size, appearance and visible-defect control with enhanced sorting",
  },
];

const CROPS = [
  {
    name: "Kharif Onion",
    description: "Supply is subject to checking maturity, skin, moisture, firmness and suitability for the proposed transit.",
  },
  {
    name: "Late Kharif Onion",
    description: "Available according to seasonal arrivals and buyer-approved quality requirements.",
  },
  {
    name: "Rabi / Summer Onion",
    description: "Suitable lots may support longer storage and distribution cycles when curing and condition are appropriate.",
  },
];

const PROCESS_STEPS = [
  "Submit requirement",
  "Complete buyer verification",
  "Confirm size, grade and packing",
  "Check lot and logistics availability",
  "Receive formal quotation",
  "Confirm Purchase Order and payment",
  "Begin procurement and grading",
  "Complete inspection and packing",
  "Load and document dispatch",
  "Track delivery and plan repeat supply",
];

const PACKAGING = {
  domestic: ["20 kg mesh or jute", "25 kg mesh or jute", "40 kg mesh or jute", "50 kg mesh or jute"],
  international: ["5 kg ventilated mesh", "8 kg ventilated mesh", "9 kg ventilated mesh", "10 kg ventilated mesh", "20 kg ventilated mesh", "25 kg ventilated mesh"],
};

const BUYER_PERSONAS = [
  { buyer: "Domestic wholesaler", need: "Fast truckload supply and delivered pricing", cta: "Get Domestic Delivered Rate" },
  { buyer: "Food processor", need: "Recurring volume and agreed tolerance", cta: "Discuss Monthly Supply" },
  { buyer: "International importer", need: "Container supply, documents and execution", cta: "Request Export SCO" },
  { buyer: "Supermarket distributor", need: "Consistent grading and presentation", cta: "Request Premium Packing Offer" },
  { buyer: "Trial buyer", need: "Execution confidence before a contract", cta: "Plan a Trial Order" },
];

const FAQS = [
  { q: "Do you supply across India?", a: "Yes. Supply may be coordinated according to quantity, destination, vehicle availability and agreed commercial terms." },
  { q: "Do you export Nashik onions?", a: "Yes, subject to Indian export policy, destination requirements, product availability, logistics and mutually accepted payment terms." },
  { q: "What is the minimum order?", a: "It depends on destination, packing and delivery structure. Domestic transactions are generally commercial truckloads; export orders are generally container-based." },
  { q: "Can the buyer select size?", a: "Yes. Requirements such as 25+, 35+, 40+, 45+, 50+ or 55+ mm may be considered according to lot availability." },
  { q: "Can the buyer inspect before dispatch?", a: "Yes. A buyer representative or approved third party may inspect when mutually agreed in advance." },
  { q: "Can loading evidence be shared?", a: "Photographs, videos, bag counts, sample-weight checks and seal details may be shared according to the confirmed process." },
  { q: "Are CIF quotations available?", a: "EXW, FCA, FOB, CFR and CIF may be considered according to transaction and destination feasibility." },
  { q: "Can shelf life be guaranteed?", a: "No universal shelf life should be guaranteed because performance depends on crop, curing, handling, storage, humidity and transit." },
  { q: "Can an annual fixed price be offered?", a: "Recurring supply can be discussed, but a market-linked agricultural product normally requires a defined price-review mechanism." },
];

const SPEC_FIELDS = [
  { label: "Product", value: "Nashik Red Onion" },
  { label: "Origin", value: "Nashik or approved nearby producing region, Maharashtra, India" },
  { label: "Crop", value: "Kharif, Late Kharif or Rabi" },
  { label: "Grade", value: "Commercial, Standard Export or Premium Export" },
  { label: "Size", value: "25+, 35+, 40+, 45+, 50+, 55+ mm or customized" },
  { label: "Colour", value: "Red or pink-red, subject to crop and approved lot" },
  { label: "Condition", value: "Fresh, mature and commercially sound" },
  { label: "Skin and neck", value: "Buyer-approved outer skin and dryness" },
  { label: "Defect tolerance", value: "Written tolerance for sprouting, decay, cuts, doubles and damage" },
  { label: "Foreign matter", value: "Within mutually agreed tolerance" },
  { label: "Packing", value: "Mesh, jute, private-label or customized" },
  { label: "Quantity", value: "Metric tons, truckload or container load" },
  { label: "Inspection", value: "Internal, buyer representative or approved third party" },
  { label: "Trade term", value: "Ex-Warehouse, FOR, FCA, FOB, CFR, CIF or agreed structure" },
  { label: "Payment", value: "As stated in accepted commercial documents" },
  { label: "Dispatch", value: "Subject to procurement, payment, logistics and regulatory confirmation" },
];

const QUALITY_STAGES = [
  { stage: "Supplier and lot", checks: "Identity, origin, crop, availability, preliminary size, quality and transit suitability" },
  { stage: "Pre-packing", checks: "Colour, firmness, skin, neck, size, sprouting, decay, cuts, doubles and foreign matter" },
  { stage: "Sorting and packing", checks: "Removal of unsuitable bulbs, size segregation, weight, count, labels and packing strength" },
  { stage: "Pre-dispatch", checks: "Quantity, bag count, vehicle or container condition, ventilation, loading and seal" },
  { stage: "Independent inspection", checks: "Buyer representative or approved third party when mutually agreed" },
];

const EXPORT_DOCS = [
  "Commercial Invoice and Packing List",
  "Shipping Bill and Bill of Lading",
  "Certificate of Origin and Phytosanitary Certificate",
  "Fumigation, inspection, weight or quality certificate where applicable and agreed",
  "Insurance Certificate for applicable CIF transactions",
  "Container, seal and loading records",
  "Other documents required by the destination and contract",
];

const DOMESTIC_COST_COMPONENTS = [
  { component: "Material", requirement: "Base onion rate against grade and size" },
  { component: "Processing", requirement: "Sorting, grading and labour" },
  { component: "Packing", requirement: "Bag type, weight and printing" },
  { component: "Handling", requirement: "Warehouse and loading, where applicable" },
  { component: "Transport", requirement: "Vehicle, route and destination freight" },
  { component: "Tax and insurance", requirement: "Applicable taxes and optional insurance" },
  { component: "Commercial total", requirement: "Total basis, validity and dispatch window" },
];

const ONION_RATE_CHART = {
  date: "22/09/2026",
  product: "Red Onion",
  variety: "NEW CROP",
  export: [
    { market: "Dubai", size: "55mm+", rate: "₹50.50/kg", packing: "20 KG Mesh Bag" },
    { market: "Malaysia", size: "45mm+", rate: "₹43.50/kg", packing: "9 KG Mesh Bag" },
    { market: "Sri Lanka", size: "45mm+", rate: "₹48.50/kg", packing: "25 KG Jute Bag" },
    { market: "Bangladesh", size: "40mm+", rate: "₹45.50/kg", packing: "50 KG Jute Bag" },
    { market: "Vietnam", size: "35mm+", rate: "₹38.50/kg", packing: "10 KG Mesh Bag" },
    { market: "Nepal", size: "45mm+", rate: "₹47.80/kg", packing: "50 KG Mesh Bag" },
  ],
  domestic: [
    { size: "40mm+", rate: "₹46.50/kg" },
    { size: "45mm+", rate: "₹47.50/kg" },
    { size: "50mm+", rate: "₹49.00/kg" },
  ],
  domesticPacking: "50 KG Mesh Bag",
  jnpt: "₹1.30/kg Extra",
  transport: "As applicable",
};

const EXPORT_WORKFLOW = [
  { stage: "1. RFQ", control: "Capture importer identity, destination, specification, quantity, timeline and payment instrument." },
  { stage: "2. Feasibility", control: "Review crop, destination rules, documentation, logistics and commercial viability." },
  { stage: "3. Offer", control: "Issue quotation or SCO; receive Purchase Order; issue Proforma Invoice." },
  { stage: "4. Security", control: "Complete payment security and written commercial confirmation before procurement." },
  { stage: "5. Preparation", control: "Procure, sort, grade, pack and inspect the approved product." },
  { stage: "6. Shipment", control: "Coordinate container, vessel, customs, loading, seal and documents." },
  { stage: "7. Follow-up", control: "Share shipment updates, record arrival feedback and schedule repeat supply." },
];

const CRM_STAGES = [
  "New enquiry",
  "Verification pending",
  "Buyer contacted",
  "Requirement qualified",
  "Specification confirmed",
  "Quotation preparation",
  "Quotation submitted",
  "Negotiation",
  "Sample or inspection",
  "Purchase Order awaited",
  "Proforma Invoice issued",
  "Payment security pending",
  "Procurement started",
  "Sorting and packing",
  "Inspection completed",
  "Dispatch planned",
  "Dispatched",
  "Delivered",
  "Repeat-order follow-up",
  "Closed won",
  "Closed lost",
];

export default function Onion() {
  const navigate =
    useNavigate();

  const [heroIndex, setHeroIndex] = useState(0);
  const [showRequirementBuilder, setShowRequirementBuilder] =
    useState(false);

  const [showRateChart, setShowRateChart] = useState(false);

  const [showPersonalDetails, setShowPersonalDetails] =
    useState(false);

  const [builtRequirement, setBuiltRequirement] =
    useState(null);

  const [submittingPersonalDetails, setSubmittingPersonalDetails] =
    useState(false);

  const [personalDetails, setPersonalDetails] =
    useState({
      fullName: "",
      email: "",
      mobile: "",
      city: "",
      state: "",
      targetTimeline: "",
    });

  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);

    return () => clearTimeout(timer);
  }, [heroIndex]);

  const openRequirementBuilder = () => {
    setShowRequirementBuilder(true);
  };

  const handleRequirementComplete = (
    requirement
  ) => {
    setBuiltRequirement(
      requirement
    );

    setPersonalDetails(
      (previous) => ({
        ...previous,

        targetTimeline:
          requirement?.timeline ||
          "",
      })
    );

    setShowRequirementBuilder(
      false
    );

    setShowPersonalDetails(
      true
    );
  };

  const handlePersonalDetailsSubmit =
    async (event) => {
      event.preventDefault();

      if (
        submittingPersonalDetails
      ) {
        return;
      }

      if (!builtRequirement) {
        toast.error(
          "Please complete the Onion Requirement Builder first."
        );

        return;
      }

      const {
        fullName,
        email,
        mobile,
        city,
        state,
        targetTimeline,
      } = personalDetails;

      const cleanName =
        fullName.trim();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const cleanMobile =
        mobile.replace(
          /\D/g,
          ""
        );

      const cleanCity =
        city.trim();

      const cleanState =
        state.trim();

      if (
        !cleanName ||
        !cleanEmail ||
        !cleanMobile ||
        !cleanCity ||
        !cleanState ||
        !targetTimeline
      ) {
        toast.error(
          "Please complete all required buyer details."
        );

        return;
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          cleanEmail
        )
      ) {
        toast.error(
          "Please enter a valid email address."
        );

        return;
      }

      if (
        cleanMobile.length <
          10 ||
        cleanMobile.length >
          15
      ) {
        toast.error(
          "Please enter a valid mobile number."
        );

        return;
      }

      try {
        setSubmittingPersonalDetails(
          true
        );

        const response =
          await onionVisitorApi.create({
            fullName:
              cleanName,

            email:
              cleanEmail,

            mobile:
              cleanMobile,

            city:
              cleanCity,

            state:
              cleanState,

            timeline:
              targetTimeline,

            requirement:
              builtRequirement,
          });

        if (
          !response?.success
        ) {
          throw new Error(
            response?.message ||
              "Unable to register your requirement."
          );
        }

        const visitorId =
          response?.data
            ?.visitorId;

        if (!visitorId) {
          throw new Error(
            "Onion visitor ID was not returned by the server."
          );
        }

        const pricing =
          response?.data
            ?.pricing ||
          null;

        /*
         * Backend remains the source of truth.
         * Session storage is checkout context only.
         */
        sessionStorage.setItem(
          "ito_onion_visitor_id",
          visitorId
        );

        sessionStorage.setItem(
          "ito_onion_requirement",
          JSON.stringify(
            builtRequirement
          )
        );

        sessionStorage.setItem(
          "ito_onion_visitor_snapshot",
          JSON.stringify({
            visitorId,

            fullName:
              cleanName,

            email:
              cleanEmail,

            phone:
              cleanMobile,

            city:
              cleanCity,

            state:
              cleanState,

            timeline:
              targetTimeline,

            requirement:
              builtRequirement,

            pricing,
          })
        );

        setShowPersonalDetails(
          false
        );

        toast.success(
          "Details saved. Review the latest Onion pricing before payment."
        );

        navigate(
          `/nashik-onion/pricing?visitorId=${encodeURIComponent(
            visitorId
          )}`
        );
      } catch (error) {
        console.error(
          "Onion visitor registration error:",
          error
        );

        toast.error(
          error?.response
            ?.data
            ?.message ||
            error?.message ||
            "Unable to submit your requirement. Please try again."
        );
      } finally {
        setSubmittingPersonalDetails(
          false
        );
      }
    };

  return (
    <main id="top" className="ito-onion-page">
      <style>{`
        .ito-onion-page {
          --burgundy: ${COLORS.burgundy};
          --onion-red: ${COLORS.onionRed};
          --wine: ${COLORS.wine};
          --olive: ${COLORS.olive};
          --ivory: ${COLORS.ivory};
          --sand: ${COLORS.sand};
          --gold: ${COLORS.gold};
          --charcoal: ${COLORS.charcoal};
          --white: ${COLORS.white};
          --overlay-light: rgba(247,243,234,0.88);
          --overlay-dark: rgba(74,16,28,0.88);

          background: var(--ivory);
          color: var(--charcoal);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          overflow: clip;
        }

        .ito-onion-page *,
        .ito-onion-page *::before,
        .ito-onion-page *::after {
          box-sizing: border-box;
        }

        .ito-display {
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 500;
          letter-spacing: -0.035em;
        }

        

        .ito-hero {
          position: relative;
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          overflow: hidden;
          background: var(--burgundy);
        }

        .ito-hero-background {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .ito-hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        .ito-hero-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .ito-hero-overlay-horizontal {
          background: linear-gradient(
            90deg,
            rgba(74, 16, 28, 0.90) 0%,
            rgba(74, 16, 28, 0.62) 38%,
            rgba(74, 16, 28, 0.22) 72%,
            rgba(74, 16, 28, 0.04) 100%
          );
        }

        .ito-hero-overlay-bottom {
          background: linear-gradient(
            0deg,
            rgba(34, 33, 31, 0.60) 0%,
            rgba(34, 33, 31, 0.08) 48%,
            rgba(34, 33, 31, 0.10) 100%
          );
        }

        .ito-hero-inner {
          position: relative;
          z-index: 2;
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 7.5rem 32px 5rem;
          display: grid;
          grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);
          align-items: center;
          min-height: 100vh;
        }

        .ito-hero-text {
          max-width: 850px;
          color: var(--white);
          text-align: left;
        }

        .ito-hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 22px;
          padding: 7px 13px;
          border: 1px solid rgba(181, 150, 90, 0.42);
          border-radius: 999px;
          background: rgba(74, 16, 28, 0.30);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: var(--ivory);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .ito-hero-kicker-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: var(--gold);
          box-shadow: 0 0 0 4px rgba(181,150,90,.13);
        }

        .ito-hero-text .ito-hero-title {
          max-width: 850px;
          margin: 0;
          color: var(--white);
          font-size: clamp(48px, 7vw, 96px);
          line-height: .92;
          text-shadow: 0 10px 35px rgba(0,0,0,.28);
        }

        .ito-hero-accent-line {
          height: 2px;
          margin: 28px 0 0;
          background: var(--gold);
        }

        .ito-hero-subtitle {
          max-width: 650px;
          margin: 25px 0 0;
          color: rgba(247,243,234,.94);
          font-size: clamp(15px, 1.6vw, 20px);
          line-height: 1.65;
          text-shadow: 0 5px 22px rgba(0,0,0,.28);
        }

        .ito-trust-line {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 30px;
          margin-top: 34px;
          color: rgba(247,243,234,.96);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .05em;
          text-shadow: 0 4px 16px rgba(0,0,0,.3);
        }

        .ito-trust-line span {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ito-trust-line span::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold);
        }

        .ito-section-inner {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .ito-intro {
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: clamp(40px, 8vw, 120px);
          align-items: end;
        }

        .ito-eyebrow {
          color: var(--olive);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .ito-section-title {
          margin: 12px 0 0;
          color: var(--burgundy);
          font-size: clamp(42px, 6vw, 78px);
          line-height: .98;
        }

        .ito-lead {
          margin: 0;
          max-width: 650px;
          color: rgba(34,33,31,.88);
          font-size: 18px;
          line-height: 1.75;
        }

        .ito-lead-burgundy {
          color: var(--burgundy) !important;
        }

        .ito-spec-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          margin-top: 72px;
          border: 1px solid var(--sand);
          background: var(--sand);
        }

        .ito-spec {
          min-height: 170px;
          padding: 28px;
          background: var(--ivory);
        }

        .ito-spec strong {
          display: block;
          margin-bottom: 10px;
          color: var(--burgundy);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          font-weight: 500;
        }

        .ito-spec span {
          color: rgba(34,33,31,.78);
          font-size: 12px;
          line-height: 1.55;
        }

        .ito-dark {
          background: var(--burgundy);
          color: var(--ivory);
        }

        .ito-dark .ito-eyebrow {
          color: var(--gold);
        }

        .ito-dark .ito-section-title {
          color: var(--ivory);
        }

        .ito-dark .ito-lead {
          color: rgba(247,243,234,.88);
        }

        .ito-dark .ito-spec {
          background: rgba(255,255,255,.12);
          border-color: rgba(247,243,234,.25);
        }

        .ito-dark .ito-spec-grid {
          background: rgba(247,243,234,.2);
          border-color: rgba(247,243,234,.25);
        }

        .ito-dark .ito-spec strong {
          color: var(--ivory);
        }

        .ito-dark .ito-spec span {
          color: rgba(247,243,234,.82);
        }

        .ito-dark .ito-card {
          background: rgba(255,255,255,.06);
          border-color: rgba(247,243,234,.18);
        }

        .ito-dark .ito-card h3 {
          color: var(--ivory);
        }

        .ito-dark .ito-card p {
          color: rgba(247,243,234,.88);
        }

        .ito-dark .ito-card .positioning {
          color: var(--gold);
        }

        .ito-grade-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-top: 56px;
        }

        .ito-card {
          min-height: 270px;
          padding: 30px;
          border: 1px solid var(--sand);
          border-radius: 14px;
          background: var(--white);
          box-shadow: 0 18px 50px rgba(74,16,28,.05);
        }

        .ito-card-number {
          color: var(--gold);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .ito-card h3 {
          margin: 56px 0 14px;
          color: var(--burgundy);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 30px;
          font-weight: 500;
        }

        .ito-card p {
          margin: 0;
          color: rgba(34,33,31,.82);
          line-height: 1.7;
          font-size: 14px;
        }

        .ito-card .positioning {
          color: var(--olive);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .ito-process {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 60px;
          margin-top: 58px;
          counter-reset: process;
        }

        .ito-process-item {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 18px;
          align-items: center;
          padding: 22px 0;
          border-bottom: 1px solid var(--sand);
        }

        .ito-process-item::before {
          counter-increment: process;
          content: counter(process, decimal-leading-zero);
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(86,96,68,.10);
          color: var(--olive);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .ito-process-item span {
          color: var(--charcoal);
          font-size: 14px;
          line-height: 1.55;
        }

        .ito-markets {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 48px;
        }

        .ito-market {
          border: 1px solid rgba(247,243,234,.3);
          border-radius: 999px;
          padding: 11px 15px;
          color: var(--ivory);
          background: rgba(255,255,255,.1);
          font-size: 11px;
          letter-spacing: .04em;
        }

        .ito-packaging {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 58px;
        }

        .ito-pack-card {
          padding: 36px;
          border-radius: 14px;
          background: rgba(255,255,255,.92);
          border: 1px solid var(--sand);
          box-shadow: 0 12px 35px rgba(34,33,31,.08);
        }

        .ito-pack-card small {
          color: var(--olive);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .ito-pack-card h3 {
          margin: 14px 0 8px;
          color: var(--burgundy);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 29px;
          font-weight: 500;
        }

        .ito-pack-card p {
          margin: 0;
          color: rgba(34,33,31,.82);
          font-size: 14px;
          line-height: 1.65;
        }

        .ito-cta {
          padding-top: 52px;
          padding-bottom: 72px;
          background: var(--burgundy);
          color: var(--ivory);
        }

        .ito-cta-inner {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 70px;
          align-items: start;
        }

        .ito-cta h2 {
          max-width: 780px;
          margin: 0;
          color: var(--ivory);
          font-size: clamp(46px, 6.5vw, 88px);
          line-height: .95;
        }

        .ito-cta-copy {
          color: rgba(247,243,234,.70);
          line-height: 1.75;
          font-size: 15px;
        }

        .ito-cta-image {
          width: 100%;
          max-width: 360px;
          height: auto;
          border-radius: 12px;
          margin-bottom: 20px;
          display: block;
        }

        .ito-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .ito-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 20px;
          border-radius: 999px;
          border: 1px solid var(--onion-red);
          background: var(--onion-red);
          color: var(--ivory);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          text-decoration: none;
          transition: transform .2s ease, background .2s ease;
        }

        .ito-button:hover {
          transform: translateY(-2px);
          background: var(--wine);
        }

        .ito-button.secondary {
          border-color: rgba(247,243,234,.34);
          background: transparent;
          color: var(--ivory);
        }

        .ito-whatsapp-button {
          gap: 9px;
          border-color: rgba(181,150,90,.62);
          background: rgba(74,16,28,.34);
          color: var(--ivory);
          box-shadow: inset 0 0 0 1px rgba(181,150,90,.08);
        }

        .ito-whatsapp-button .ito-whatsapp-icon {
          flex: 0 0 auto;
          width: 19px;
          height: 19px;
          color: var(--gold);
          transition: color .2s ease, transform .2s ease;
        }

        .ito-whatsapp-button:hover {
          background: var(--onion-red);
          border-color: var(--gold);
          color: var(--ivory);
        }

        .ito-whatsapp-button:hover .ito-whatsapp-icon {
          color: var(--ivory);
          transform: scale(1.06);
        }

        .ito-whatsapp-button:focus-visible {
          outline: 2px solid var(--gold);
          outline-offset: 3px;
        }

        @media (max-width: 800px) {
          .ito-whatsapp-button {
            width: 100%;
            max-width: 100%;
          }
        }

        /* Secondary buttons inside light cards must remain visible. */
        .ito-split-card .ito-button.secondary {
          background: var(--onion-red) !important;
          color: var(--ivory) !important;
          border-color: var(--onion-red) !important;
        }

        .ito-split-card .ito-button.secondary:hover,
        .ito-split-card .ito-button.secondary:focus-visible {
          background: var(--wine) !important;
          color: var(--ivory) !important;
          border-color: var(--wine) !important;
        }

        .ito-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 32px;
          font-size: 14px;
        }

        .ito-table th,
        .ito-table td {
          padding: 14px 18px;
          border-bottom: 1px solid var(--sand);
          text-align: left;
        }

        .ito-table th {
          color: var(--burgundy);
          font-weight: 700;
          font-size: 13px;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .ito-table td {
          color: rgba(34,33,31,.84);
          line-height: 1.6;
        }

        .ito-table tr:last-child td {
          border-bottom: none;
        }

        .ito-table.alt th {
          color: var(--gold);
        }

        .ito-table.alt td {
          color: rgba(247,243,234,.92);
        }

        .ito-faq {
          margin-top: 32px;
        }

        .ito-faq-item {
          border-top: 1px solid var(--sand);
          padding: 16px 0;
        }

        .ito-faq-item:first-child {
          border-top: none;
          padding-top: 0;
        }

        .ito-faq-q {
          margin-bottom: 6px;
        }

.ito-pack-note {
          margin-top: 16px;
          font-size: 13px;
          color: rgba(34,33,31,.85);
        }

        .ito-quote-box--alt {
          margin-top: 32px;
          background: rgba(74,16,28,.1);
          border-color: rgba(74,16,28,.2);
          color: rgba(34,33,31,.9);
        }

        .ito-disclaimer {
          margin-top: 16px;
          font-size: 13px;
          color: rgba(34,33,31,.8);
        }

        .ito-section-heading {
          color: var(--ivory);
          font-family: Georgia, serif;
          font-size: 28px;
          font-weight: 500;
          margin-bottom: 24px;
        }

        .ito-process-item--alt {
          border-bottom-color: rgba(247,243,234,.14);
          grid-template-columns: 100px 1fr;
        }

        .ito-process-stage {
          color: var(--gold);
          font-size: 12px;
          font-weight: 900;
        }

        .ito-process-control {
          color: rgba(247,243,234,.78);
        }

        .ito-bullet-list--alt li {
          color: rgba(247,243,234,.78);
        }

        .ito-doc-note {
          margin-top: 16px;
          font-size: 13px;
          color: rgba(247,243,234,.55);
        }

        #international.ito-section {
          padding-top: clamp(52px, 5vw, 72px);
          padding-bottom: clamp(52px, 5vw, 72px);
        }

        /* Compact export operating model. */
        .ito-export-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr);
          gap: 26px;
          margin-top: 34px;
          align-items: start;
        }

        .ito-export-column {
          min-width: 0;
        }

        .ito-export-column .ito-section-heading {
          margin: 0 0 12px;
          font-size: 20px;
        }

        .ito-export-workflow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 24px;
          border-top: 1px solid rgba(247,243,234,.14);
        }

        .ito-export-step {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 10px;
          align-items: start;
          min-height: 68px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(247,243,234,.12);
        }

        .ito-export-step .ito-process-stage {
          padding-top: 2px;
          font-size: 10px;
          letter-spacing: .08em;
        }

        .ito-export-step .ito-process-control {
          font-size: 12px;
          line-height: 1.45;
        }

        .ito-export-docs {
          padding: 20px 22px;
          border: 1px solid rgba(247,243,234,.14);
          border-radius: 12px;
          background: rgba(247,243,234,.035);
        }

        .ito-export-docs .ito-section-heading {
          margin-bottom: 12px;
        }

        .ito-export-docs .ito-bullet-list li {
          margin-bottom: 7px;
          font-size: 12px;
          line-height: 1.4;
        }

        .ito-export-docs .ito-doc-note {
          margin-top: 12px;
          font-size: 11px;
          line-height: 1.45;
        }

        .ito-section-heading-wrapper {
          margin-top: 24px;
        }

        .ito-sub-heading {
          margin-top: 48px;
          color: var(--burgundy);
          font-family: Georgia, serif;
          font-size: 26px;
          font-weight: 500;
        }

        .ito-table--mt {
          margin-top: 24px;
        }

        .ito-split-grid--mt {
          margin-top: 56px;
        }

        .ito-quote-box--mt {
          margin-top: 48px;
        }

        .ito-market-notice {
          margin-top: 24px;
          font-size: 13px;
          color: rgba(34,33,31,.85);
        }

        .ito-section--pt {
          padding-top: 60px;
        }

        .ito-crm-heading {
          margin-top: 48px;
          color: var(--burgundy);
          font-family: Georgia, serif;
          font-size: 26px;
          font-weight: 500;
        }

        .ito-markets--mt {
          margin-top: 24px;
        }

        .ito-market--crm {
          background: rgba(74,16,28,.08);
          border-color: rgba(74,16,28,.18);
          color: var(--burgundy);
        }

        .ito-faq-q {
          color: var(--burgundy);
          font-weight: 700;
          font-size: 15px;
          line-height: 1.4;
          margin-bottom: 8px;
        }

        .ito-faq-a {
          color: rgba(34,33,31,.88);
          line-height: 1.65;
        }

        .ito-dark .ito-faq-q {
          color: var(--ivory);
        }

        .ito-dark .ito-faq-a {
          color: rgba(247,243,234,.88);
        }

        .ito-persona-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          margin-top: 48px;
        }

        .ito-persona-card {
          padding: 28px;
          border: 1px solid var(--sand);
          border-radius: 14px;
          background: var(--white);
        }

        .ito-persona-card .buyer {
          color: var(--burgundy);
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 6px;
        }

        .ito-persona-card .need {
          color: rgba(34,33,31,.82);
          font-size: 13px;
          margin-bottom: 10px;
        }

        .ito-persona-card .cta {
          color: var(--onion-red);
          font-weight: 800;
          font-size: 12px;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .ito-split-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          margin-top: 56px;
        }

        .ito-split-card {
          padding: 32px;
          border: 1px solid var(--sand);
          border-radius: 14px;
          background: var(--white);
        }

        .ito-split-card h3 {
          color: var(--burgundy);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 26px;
          font-weight: 500;
          margin-bottom: 16px;
        }

        .ito-split-card p {
          color: rgba(34,33,31,.86);
          line-height: 1.7;
          margin-bottom: 16px;
        }

        .ito-bullet-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .ito-bullet-list li {
          position: relative;
          padding-left: 24px;
          margin-bottom: 10px;
          color: rgba(34,33,31,.86);
          line-height: 1.6;
        }

        .ito-bullet-list li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold);
        }

        .ito-quote-box {
          background: rgba(74,16,28,.08);
          border: 1px solid var(--sand);
          border-radius: 12px;
          padding: 28px;
          margin-top: 32px;
          font-style: italic;
          color: rgba(34,33,31,.9);
          line-height: 1.7;
        }

        .ito-footer {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 25px clamp(20px, 6vw, 96px);
          background: #321019;
          color: rgba(247,243,234,.80);
          font-size: 10px;
          letter-spacing: .10em;
          text-transform: uppercase;
        }
        }

        /* Desktop / laptop hero remains left-aligned.
           Mobile-only centering is applied inside the breakpoint below. */
        @media (min-width: 801px) {
          .ito-hero-inner {
            grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);
          }

          .ito-hero-text {
            margin: 0;
            max-width: 850px;
            text-align: left;
          }

          .ito-hero-kicker {
            justify-content: flex-start;
          }

          .ito-hero-accent-line {
            margin-left: 0;
            margin-right: 0;
          }

          .ito-hero-subtitle {
            margin-left: 0;
            margin-right: 0;
            text-align: left;
          }

          .ito-trust-line {
            justify-content: flex-start;
            text-align: left;
          }
        }

        @media (max-width: 800px) {
          .ito-hero {
            min-height: 100svh;
          }

          .ito-hero-inner {
            grid-template-columns: 1fr;
            min-height: 100svh;
            padding: 7.5rem 20px 4rem;
          }

          .ito-hero-text {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            text-align: center;
          }

          .ito-hero-text .ito-hero-title,
          .ito-hero-subtitle {
            width: 100%;
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
          }

          .ito-hero-kicker {
            justify-content: center;
            font-size: 8px;
            letter-spacing: .10em;
          }

          .ito-hero-text .ito-hero-title {
            font-size: clamp(43px, 13vw, 68px);
            line-height: .94;
          }

          .ito-hero-accent-line {
            margin-left: auto;
            margin-right: auto;
          }

          .ito-hero-subtitle {
            margin-left: auto;
            margin-right: auto;
            font-size: 14px;
            line-height: 1.55;
          }

          .ito-trust-line {
            justify-content: center;
            gap: 10px 18px;
            font-size: 10px;
          }



          .ito-hero-title {
            max-width: 100%;
            font-size: clamp(32px, 11vw, 56px);
            line-height: 1.1;
          }

          .ito-hero-subtitle {
            max-width: 100%;
            font-size: clamp(13px, 3.2vw, 16px);
            margin-top: 12px;
            line-height: 1.55;
          }

          .ito-trust-line {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            margin-top: 16px;
            gap: 10px;
            font-size: 12px;
            text-align: center;
          }

          .ito-trust-line span {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            text-align: center;
          }

            .ito-intro,
          .ito-cta-inner,
          .ito-export-grid {
            grid-template-columns: 1fr;
          }

          .ito-export-workflow {
            grid-template-columns: 1fr;
          }

          .ito-export-step {
            min-height: 58px;
            padding: 10px 0;
          }

          .ito-export-docs {
            padding: 18px;
          }

          .ito-spec-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .ito-grade-grid,
          .ito-process,
          .ito-packaging,
          .ito-persona-grid,
          .ito-split-grid {
            grid-template-columns: 1fr;
          }

          .ito-process {
            gap: 0;
          }

          .ito-cta {
            padding-top: 44px;
            padding-bottom: 56px;
          }

          .ito-table th,
          .ito-table td {
            padding: 10px 12px;
            font-size: 13px;
          }

          .ito-cta-image {
            max-width: 100%;
          }

          .ito-intro > div:first-child {
            max-width: 100%;
          }

          .ito-section-title,
          .ito-display {
            word-break: break-word;
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 800px) {
          .ito-onion-page .ito-table {
            width: 100%;
            table-layout: fixed;
            font-size: 13px;
          }

          .ito-onion-page .ito-table th,
          .ito-onion-page .ito-table td {
            padding: 11px 10px;
            line-height: 1.55;
            overflow-wrap: anywhere;
          }

          .ito-onion-page .ito-table th:first-child,
          .ito-onion-page .ito-table td:first-child {
            width: 32%;
          }

          .ito-onion-page .ito-table th:last-child,
          .ito-onion-page .ito-table td:last-child {
            width: 68%;
          }

          /* Never let a table become wider than its section card. */
          .ito-onion-page .ito-section-inner {
            min-width: 0;
          }
        }

        @media (max-width: 430px) {
          .ito-onion-page .ito-table {
            font-size: 12px;
          }

          .ito-onion-page .ito-table th,
          .ito-onion-page .ito-table td {
            padding: 10px 8px;
          }

          .ito-onion-page .ito-table th:first-child,
          .ito-onion-page .ito-table td:first-child {
            width: 34%;
          }

          .ito-onion-page .ito-table th:last-child,
          .ito-onion-page .ito-table td:last-child {
            width: 66%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ito-button {
            transition: none;
          }
        }

        /* Readability surfaces for the existing DPR sections. */
        .ito-section {
          background: var(--ivory);
        }

        .ito-section-inner {
          position: relative;
          z-index: 10;
        }

        .ito-section .ito-section-inner {
          background: rgba(247,243,234,.98);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(20,18,16,.15);
          margin: 0 auto;
          max-width: 1180px;
        }

        .ito-section.ito-dark .ito-section-inner {
          background: rgba(247,243,234,.98);
          border: 1px solid var(--sand);
        }

        .ito-section.ito-cta .ito-section-inner {
          background: rgba(247,243,234,.98);
          border: 1px solid var(--sand);
        }

        .ito-section--pt .ito-section-inner {
          background: rgba(247,243,234,.98);
          border: 1px solid var(--sand);
        }

        .ito-intro {
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: clamp(40px, 8vw, 120px);
          align-items: end;
        }

        .ito-section:not(.ito-dark):not(.ito-cta) .ito-section-title,
        .ito-section:not(.ito-dark):not(.ito-cta) .ito-section-heading,
        .ito-section:not(.ito-dark):not(.ito-cta) .ito-crm-heading {
          color: var(--burgundy) !important;
        }

        .ito-section:not(.ito-dark):not(.ito-cta) .ito-eyebrow {
          color: var(--olive);
        }

        .ito-section:not(.ito-dark):not(.ito-cta) .ito-lead {
          color: rgba(34,33,31,.9);
        }

        .ito-section.ito-dark .ito-section-title,
        .ito-section.ito-dark .ito-section-heading,
        .ito-section.ito-dark .ito-crm-heading,
        .ito-section.ito-cta .ito-section-title,
        .ito-section.ito-cta .ito-section-heading,
        .ito-section.ito-cta .ito-crm-heading,
        .ito-section--pt .ito-section-title,
        .ito-section--pt .ito-section-heading,
        .ito-section--pt .ito-crm-heading {
          color: var(--burgundy) !important;
        }

        .ito-section.ito-dark .ito-eyebrow,
        .ito-section.ito-cta .ito-eyebrow,
        .ito-section--pt .ito-eyebrow {
          color: var(--olive);
        }

        .ito-section.ito-dark .ito-lead,
        .ito-section.ito-cta .ito-lead,
        .ito-section--pt .ito-lead {
          color: rgba(34,33,31,.9);
        }

        .ito-spec {
          background: var(--white) !important;
          border: 1px solid var(--sand);
          border-radius: 12px;
        }

        .ito-spec strong {
          color: var(--burgundy);
        }

        .ito-spec span {
          color: rgba(34,33,31,.85);
        }

        .ito-dark .ito-spec {
          background: rgba(255,255,255,.08) !important;
          border-color: rgba(247,243,234,.2);
        }

        .ito-dark .ito-spec strong {
          color: var(--ivory);
        }

        .ito-dark .ito-spec span {
          color: rgba(247,243,234,.9);
        }

        .ito-pack-card {
          background: var(--white) !important;
          border: 1px solid var(--sand);
          border-radius: 14px;
          box-shadow: 0 12px 35px rgba(34,33,31,.1);
        }

        .ito-dark .ito-pack-card {
          background: rgba(255,255,255,.06) !important;
          border-color: rgba(247,243,234,.18);
        }

        .ito-market {
          background: rgba(247,243,234,.2) !important;
          border: 1px solid var(--sand);
          color: var(--burgundy);
        }

        .ito-quote-box {
          background: rgba(247,243,234,.2) !important;
          border: 1px solid var(--sand);
          color: rgba(34,33,31,.9);
        }

        .ito-dark .ito-quote-box,
        .ito-section--pt .ito-quote-box {
          background: rgba(247,243,234,.2) !important;
          border-color: var(--sand);
          color: rgba(34,33,31,.9);
        }

        .ito-grade-grid {
          gap: 20px;
        }

        .ito-card {
          background: var(--white) !important;
          border: 1px solid var(--sand);
          border-radius: 14px;
          box-shadow: 0 12px 35px rgba(34,33,31,.1);
        }

        .ito-dark .ito-card {
          background: rgba(255,255,255,.06) !important;
          border-color: rgba(247,243,234,.18);
        }

        .ito-card h3 {
          color: var(--burgundy);
        }

        .ito-dark .ito-card h3 {
          color: var(--ivory);
        }

        .ito-card p,
        .ito-card .positioning {
          color: rgba(34,33,31,.85);
        }

        .ito-dark .ito-card p,
        .ito-dark .ito-card .positioning {
          color: rgba(247,243,234,.9);
        }

        .ito-persona-card {
          background: var(--white) !important;
          border: 1px solid var(--sand);
          border-radius: 14px;
          box-shadow: 0 12px 35px rgba(34,33,31,.1);
        }

        .ito-split-card {
          background: var(--white) !important;
          border: 1px solid var(--sand);
          border-radius: 14px;
          box-shadow: 0 12px 35px rgba(34,33,31,.1);
        }

        .ito-split-card h3 {
          color: var(--burgundy);
        }

        .ito-split-card p {
          color: rgba(34,33,31,.85);
        }

        .ito-table {
          background: var(--white);
          border-radius: 12px;
          overflow: hidden;
        }

        .ito-table th {
          background: rgba(74,16,28,.05);
          color: var(--burgundy);
        }

        .ito-table td {
          color: rgba(34,33,31,.85);
        }

        .ito-table.alt {
          background: rgba(247,243,234,.98);
        }
        .ito-table.alt th { background: rgba(74,16,28,.08); color: var(--burgundy); }
        .ito-table.alt td { color: rgba(34,33,31,.85); }

        .ito-faq-q {
          color: var(--burgundy);
        }

        .ito-faq-a {
          color: rgba(34,33,31,.9);
        }

        .ito-dark .ito-faq-q {
          color: var(--burgundy);
        }

        .ito-dark .ito-faq-a {
          color: rgba(34,33,31,.9);
        }

        .ito-process-item span {
          color: rgba(34,33,31,.9);
        }

        .ito-export-step .ito-process-stage {
          color: var(--gold);
        }

        .ito-export-step .ito-process-control {
          color: rgba(34,33,31,.9);
        }

        .ito-export-docs {
          background: rgba(247,243,234,.15) !important;
          border: 1px solid var(--sand);
          border-radius: 12px;
        }

        .ito-export-docs .ito-section-heading { color: var(--burgundy); }
        .ito-export-docs .ito-bullet-list li { color: rgba(34,33,31,.9); }
        .ito-export-docs .ito-doc-note { color: rgba(34,33,31,.7); }

        .ito-spec-grid {
          background: var(--white);
          border: 1px solid var(--sand);
        }

        .ito-dark .ito-spec-grid {
          background: rgba(255,255,255,.04);
          border-color: rgba(247,243,234,.15);
        }

        .ito-section--pt .ito-section-title,
        .ito-section--pt .ito-crm-heading {
          color: var(--ivory);
        }

        .ito-section--pt .ito-lead {
          color: rgba(247,243,234,.95);
        }

        .ito-section--pt .ito-market--crm {
          background: rgba(34,33,31,.84);
          border-color: rgba(181,150,90,.78);
          color: var(--ivory);
          box-shadow: 0 5px 18px rgba(0,0,0,.18);
        }

        .ito-section--pt .ito-quote-box--mt {
          background: rgba(34,33,31,.88);
          border-color: rgba(181,150,90,.82);
          color: var(--ivory);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          box-shadow: 0 10px 30px rgba(0,0,0,.20);
        }

        .ito-section--pt .ito-quote-box--mt strong {
          color: var(--gold);
        }

        /* CTA reading surfaces */
        .ito-cta-inner {
          position: relative;
        }

        .ito-cta-inner > div:first-child,
        .ito-cta-inner > div:last-child {
          padding: 22px 26px 26px;
          border-radius: 16px;
          background: rgba(247,243,234,.98);
          border: 1px solid var(--sand);
          box-shadow: 0 14px 38px rgba(20,18,16,.15);
        }

        .ito-cta h2 {
          color: var(--burgundy) !important;
        }

        .ito-cta-copy {
          color: rgba(34,33,31,.9) !important;
        }

        /* Light sections: burgundy text */
        .ito-section:not(.ito-dark):not(.ito-cta) .ito-section-title,
        .ito-section:not(.ito-dark):not(.ito-cta) .ito-lead,
        .ito-section:not(.ito-dark):not(.ito-cta) .ito-section-heading,
        .ito-section:not(.ito-dark):not(.ito-cta) .ito-crm-heading {
          color: var(--burgundy);
        }

        /* Dark sections: ivory text */
        .ito-section.ito-dark .ito-section-title,
        .ito-section.ito-dark .ito-lead,
        .ito-section.ito-dark .ito-section-heading,
        .ito-section.ito-cta .ito-section-title,
        .ito-section.ito-cta .ito-lead,
        .ito-section.ito-cta .ito-section-heading,
        .ito-section--pt .ito-section-title,
        .ito-section--pt .ito-lead,
        .ito-section--pt .ito-crm-heading {
          color: var(--ivory);
        }

        #international .ito-lead {
          color: var(--burgundy) !important;
        }

        .ito-section:not(.ito-cta) .ito-section-title,
        .ito-section:not(.ito-cta) .ito-lead,
        .ito-section:not(.ito-cta) .ito-section-heading {
          background: transparent;
          border: 0;
          box-shadow: none;
        }

        .ito-section:not(.ito-cta) .ito-section-title {
          display: block;
          max-width: 920px;
          padding: 0;
          border-radius: 0;
        }

        .ito-section:not(.ito-cta) .ito-lead {
          padding: 0;
          border-radius: 0;
          max-width: 760px;
        }

        .ito-section--pt .ito-section-title {
          display: block;
          padding: 0;
          border-radius: 0;
        }

        .ito-section--pt .ito-lead {
          padding: 0;
          border-radius: 0;
        }

        .ito-section--pt .ito-crm-heading {
          display: block;
          padding: 0;
          border-radius: 0;
        }


        /* FINAL REQUESTED CARD TREATMENT
           Only the specified Grade cards, Size classification pills, and
           Export Documentation card use a solid white background with
           Burgundy text and absolutely no shadow. */
        .ito-grade-card,
        .ito-size-card,
        .ito-export-docs {
          background: #FFFFFF !important;
          color: var(--burgundy) !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }

        .ito-grade-card h3,
        .ito-grade-card p,
        .ito-grade-card .positioning,
        .ito-grade-card .ito-card-number,
        .ito-size-card,
        .ito-export-docs .ito-section-heading,
        .ito-export-docs .ito-bullet-list li,
        .ito-export-docs .ito-doc-note {
          color: var(--burgundy) !important;
          text-shadow: none !important;
        }

        .ito-grade-card {
          border-color: rgba(74,16,28,.18) !important;
        }

        .ito-size-card {
          border: 1px solid rgba(74,16,28,.18) !important;
        }

        .ito-export-docs {
          border-color: rgba(74,16,28,.18) !important;
        }

        .ito-export-docs .ito-section-heading {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .ito-export-docs .ito-bullet-list li::before {
          background: var(--burgundy) !important;
        }

        
  /* FINAL REQUESTED TREATMENT
     CRM stages + WhatsApp acknowledgement:
     white background, Burgundy text, absolutely no shadow.
     Master specification table:
     Burgundy text throughout, no shadow.
     Table headers such as "Parameter":
     darker Burgundy for maximum readability. */

  .ito-section .ito-market--crm,
  .ito-section .ito-quote-box--mt {
    background: #FFFFFF !important;
    color: var(--burgundy) !important;
    text-shadow: none !important;
    box-shadow: none !important;
    border-color: rgba(74, 16, 28, 0.18) !important;
  }

  .ito-section .ito-market--crm,
  .ito-section .ito-market--crm *,
  .ito-section .ito-quote-box--mt,
  .ito-section .ito-quote-box--mt * {
    color: var(--burgundy) !important;
    text-shadow: none !important;
  }

  #specifications .ito-table.alt,
  #specifications .ito-table.alt th,
  #specifications .ito-table.alt td,
  #specifications .ito-table.alt th *,
  #specifications .ito-table.alt td * {
    color: var(--burgundy) !important;
    text-shadow: none !important;
  }

  #specifications .ito-table.alt th {
    color: #350914 !important;
    font-weight: 800 !important;
  }

  #specifications .ito-table.alt td {
    color: var(--burgundy) !important;
  }

        /* FINAL REQUESTED TEXT TREATMENT
           Process steps: white text.
           Export workflow: dark Burgundy points, lighter Burgundy details.
           Quality-control table: dark Burgundy points, lighter Burgundy details. */

        .ito-process-item span {
          color: #FFFFFF !important;
          text-shadow: none !important;
        }

        .ito-export-step .ito-process-stage {
          color: #350914 !important;
          text-shadow: none !important;
          font-weight: 900 !important;
        }

        .ito-export-step .ito-process-control {
          color: var(--burgundy) !important;
          text-shadow: none !important;
        }

        /* Quality-control table */
        .ito-table.quality-table th,
        .ito-table.quality-table td:first-child {
          color: #350914 !important;
          text-shadow: none !important;
          font-weight: 800 !important;
        }

        .ito-table.quality-table td:last-child {
          color: var(--burgundy) !important;
          text-shadow: none !important;
        }


        /* FINAL REQUESTED TEXT TREATMENT */

        /* Process steps: use burgundy for readability on ivory */
        .ito-process-item span {
          color: var(--burgundy) !important;
          text-shadow: none !important;
        }

        /* Quality-control table: dark Burgundy stage names, lighter Burgundy details. */
        .ito-quality-table th,
        .ito-quality-table td:first-child {
          color: #350914 !important;
          font-weight: 800 !important;
          text-shadow: none !important;
        }

        .ito-quality-table td:last-child {
          color: var(--burgundy) !important;
          text-shadow: none !important;
        }

        /* Market-price notice: burgundy text. */
        .ito-market-notice,
        .ito-market-notice * {
          color: var(--burgundy) !important;
          text-shadow: none !important;
        }

        /* CTA heading: dark Burgundy, no background on the heading itself. */
        .ito-cta h2 {
          color: #350914 !important;
          background: transparent !important;
          text-shadow: none !important;
        }

        /* CTA image: no background, border, shadow or extra visual treatment. */
        .ito-cta-image {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        /* CTA description under the image: bright white. */
        .ito-cta-copy {
          color: #FFFFFF !important;
          text-shadow: none !important;
        }

        /* CTA buttons: ivory background with Burgundy text for readability */
        .ito-actions .ito-button,
        .ito-actions .ito-button *,
        .ito-actions a {
          background: var(--ivory) !important;
          color: var(--burgundy) !important;
          border-color: var(--burgundy) !important;
          text-shadow: none !important;
        }

        .ito-actions .ito-button:hover,
        .ito-actions .ito-button:focus-visible,
        .ito-actions a:hover,
        .ito-actions a:focus-visible {
          background: var(--gold) !important;
          color: var(--ivory) !important;
          border-color: var(--gold) !important;
        }


        /* FINAL CTA CORRECTION
           Remove the CTA heading panel and the dark image/copy panel.
           Keep the CTA area transparent so the onion Canvas remains visible.
           Buttons use a white background with Burgundy text. */
        .ito-cta-inner > div:first-child,
        .ito-cta-inner > div:last-child {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .ito-cta h2 {
          background: transparent !important;
          color: #350914 !important;
          text-shadow: none !important;
        }

        .ito-cta-image {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .ito-cta-copy {
          color: rgba(247,243,234,.95) !important;
        }

        .ito-cta-copy-burgundy {
          color: var(--burgundy) !important;
        }


        /* =========================================================
           PROFESSIONAL RESPONSIVE NAVIGATION
           ========================================================= */

        .ito-nav {
          position: fixed;
          z-index: 60;
          top: 0;
          left: 0;
          width: 100%;
          min-height: 76px;
          padding: 14px clamp(16px, 4vw, 56px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          pointer-events: none;
        }

        .ito-nav-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          color: var(--burgundy);
          text-decoration: none;
          pointer-events: auto;
        }

        .ito-nav-mark {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(74,16,28,.22);
          border-radius: 50%;
          background: rgba(247,243,234,.94);
          color: var(--burgundy);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          box-shadow: 0 4px 16px rgba(34,33,31,.08);
        }

        .ito-nav-brand-copy {
          display: grid;
          gap: 2px;
          min-width: 0;
          text-transform: uppercase;
        }

        .ito-nav-brand-copy strong {
          color: var(--burgundy);
          font-size: 11px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: .15em;
        }

        .ito-nav-brand-copy small {
          color: rgba(74,16,28,.62);
          font-size: 8px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: .15em;
        }

        .ito-nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 5px;
          border: 1px solid rgba(74,16,28,.14);
          border-radius: 999px;
          background: rgba(247,243,234,.82);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          pointer-events: auto;
        }

        .ito-nav-links a {
          padding: 8px 11px;
          border-radius: 999px;
          color: var(--burgundy);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          text-decoration: none;
          transition: background .2s ease, color .2s ease;
        }

        .ito-nav-links a:hover,
        .ito-nav-links a:focus-visible {
          background: var(--burgundy);
          color: var(--ivory);
          outline: none;
        }

        .ito-nav-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          pointer-events: auto;
        }

        .ito-nav-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 15px;
          border: 1px solid var(--burgundy);
          border-radius: 999px;
          background: var(--burgundy);
          color: var(--ivory);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .09em;
          text-transform: uppercase;
          text-decoration: none;
          transition: transform .2s ease, background .2s ease;
        }

        .ito-nav-cta:hover,
        .ito-nav-cta:focus-visible {
          background: var(--onion-red);
          transform: translateY(-1px);
          outline: none;
        }

        .ito-nav-menu,
        .ito-mobile-menu {
          display: none;
        }

        @media (max-width: 800px) {
          .ito-nav {
            min-height: 68px;
            padding: 10px 12px;
            gap: 10px;
            background: linear-gradient(
              180deg,
              rgba(247,243,234,.97) 0%,
              rgba(247,243,234,.88) 76%,
              rgba(247,243,234,0) 100%
            );
          }

          .ito-nav-brand {
            gap: 9px;
            flex: 1 1 auto;
            min-width: 0;
          }

          .ito-nav-mark {
            width: 34px;
            height: 34px;
            flex-basis: 34px;
            font-size: 8px;
          }

          .ito-nav-brand-copy strong {
            font-size: 9px;
            letter-spacing: .12em;
            white-space: nowrap;
          }

          .ito-nav-brand-copy small {
            font-size: 7px;
            letter-spacing: .12em;
          }

          .ito-nav-links {
            display: none;
          }

          .ito-nav-cta {
            min-height: 36px;
            padding: 0 12px;
            font-size: 8px;
          }

          .ito-nav-menu {
            width: 38px;
            height: 36px;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 5px;
            padding: 0;
            border: 1px solid rgba(74,16,28,.20);
            border-radius: 999px;
            background: rgba(247,243,234,.94);
            cursor: pointer;
          }

          .ito-nav-menu span {
            width: 15px;
            height: 1.5px;
            display: block;
            background: var(--burgundy);
            transition: transform .2s ease;
          }

          .ito-nav-menu.is-open span:first-child {
            transform: translateY(3.25px) rotate(45deg);
          }

          .ito-nav-menu.is-open span:last-child {
            transform: translateY(-3.25px) rotate(-45deg);
          }

          .ito-mobile-menu {
            position: absolute;
            top: 62px;
            left: 12px;
            right: 12px;
            display: grid;
            gap: 2px;
            padding: 8px;
            border: 1px solid rgba(74,16,28,.16);
            border-radius: 16px;
            background: rgba(247,243,234,.97);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            box-shadow: 0 16px 40px rgba(34,33,31,.14);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-8px);
            transition: opacity .2s ease, transform .2s ease, visibility .2s ease;
            pointer-events: none;
          }

          .ito-mobile-menu.is-open {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
            pointer-events: auto;
          }

          .ito-mobile-menu a {
            display: flex;
            align-items: center;
            min-height: 42px;
            padding: 0 13px;
            border-radius: 10px;
            color: var(--burgundy);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
            text-decoration: none;
          }

          .ito-mobile-menu a:hover,
          .ito-mobile-menu a:focus-visible {
            background: rgba(74,16,28,.07);
            outline: none;
          }

          .ito-mobile-menu .ito-mobile-menu-cta {
            justify-content: center;
            margin-top: 5px;
            background: var(--burgundy);
            color: var(--ivory);
          }

          .ito-mobile-menu .ito-mobile-menu-cta:hover,
          .ito-mobile-menu .ito-mobile-menu-cta:focus-visible {
            background: var(--onion-red);
          }
        }

        @media (max-width: 430px) {
          .ito-nav {
            padding-left: 10px;
            padding-right: 10px;
          }

          .ito-nav-brand-copy strong {
            font-size: 8px;
          }

          .ito-nav-brand-copy small {
            font-size: 6.5px;
          }

          .ito-nav-cta {
            display: none;
          }

          .ito-nav-menu {
            width: 40px;
            height: 38px;
          }
        }




        /* Mobile-only alignment fix for the Core Value Proposition section.
           Everything else remains unchanged. */
        @media (max-width: 800px) {
          .ito-core-value-section .ito-intro {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .ito-core-value-section .ito-intro > div,
          .ito-core-value-section .ito-lead {
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }

          .ito-core-value-section .ito-section-title {
            width: 100%;
            max-width: 100%;
            font-size: clamp(38px, 11vw, 56px);
            line-height: 1.02;
            word-break: normal;
            overflow-wrap: normal;
          }

          .ito-core-value-section .ito-spec-grid {
            width: 100%;
            max-width: 100%;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ito-core-value-section .ito-spec {
            min-width: 0;
            width: 100%;
            padding: 20px 16px;
            overflow: visible;
          }

          .ito-core-value-section .ito-spec strong,
          .ito-core-value-section .ito-spec span {
            min-width: 0;
            max-width: 100%;
            overflow-wrap: normal;
            word-break: normal;
          }

          .ito-core-value-section .ito-spec strong {
            white-space: nowrap;
          }
        }

        @media (max-width: 430px) {
          .ito-core-value-section .ito-section-title {
            font-size: clamp(36px, 10.5vw, 50px);
            line-height: 1.03;
          }
        }

        /* Mobile-only alignment fix for the Packaging section.
           Keeps the desktop layout unchanged and stacks the heading content cleanly on mobile. */
        @media (max-width: 800px) {
          .ito-packaging-section .ito-intro {
            grid-template-columns: 1fr;
            gap: 28px;
            align-items: start;
          }

          .ito-packaging-section .ito-intro > div,
          .ito-packaging-section .ito-lead {
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }

          .ito-packaging-section .ito-section-title {
            width: 100%;
            max-width: 100%;
            font-size: clamp(42px, 12vw, 58px);
            line-height: 1.02;
            word-break: normal;
            overflow-wrap: normal;
          }

          .ito-packaging-section .ito-eyebrow {
            margin-top: 14px;
          }

          .ito-packaging-section .ito-lead {
            line-height: 1.65;
          }
        }

        @media (max-width: 430px) {
          .ito-packaging-section .ito-section-title {
            font-size: clamp(40px, 11.5vw, 52px);
            line-height: 1.03;
          }
        }


        /* =========================================================
           FINAL RESPONSIVE + CONTENT ALIGNMENT PASS
           ========================================================= */

        /* Keep normal body copy centered inside content cards/divs.
           Headings remain independently left-aligned. */
        .ito-onion-page .ito-spec,
        .ito-onion-page .ito-card,
        .ito-onion-page .ito-pack-card,
        .ito-onion-page .ito-persona-card,
        .ito-onion-page .ito-split-card,
        .ito-onion-page .ito-quote-box,
        .ito-onion-page .ito-export-docs,
        .ito-onion-page .ito-process-item,
        .ito-onion-page .ito-export-step,
        .ito-onion-page .ito-market,
        .ito-onion-page .ito-cta-copy {
          text-align: center;
        }

        /* Section headings / titles are centered across the page. */
        .ito-onion-page h2,
        .ito-onion-page .ito-section-title,
        .ito-onion-page .ito-section-heading,
        .ito-onion-page .ito-crm-heading,
        .ito-onion-page .ito-sub-heading {
          text-align: center !important;
          margin-left: auto;
          margin-right: auto;
        }

        /* Small section eyebrow labels such as PACKAGING / SEASONAL CROP CATEGORIES. */
        .ito-onion-page .ito-eyebrow {
          display: flex !important;
          align-items: center;
          justify-content: center !important;
          width: 100%;
          margin-left: auto !important;
          margin-right: auto !important;
          text-align: center !important;
        }

        .ito-onion-page .ito-eyebrow::before,
        .ito-onion-page .ito-eyebrow::after {
          display: none !important;
          content: none !important;
        }

        .ito-onion-page .ito-spec strong,
        .ito-onion-page .ito-spec span,
        .ito-onion-page .ito-card p,
        .ito-onion-page .ito-pack-card p,
        .ito-onion-page .ito-persona-card .need,
        .ito-onion-page .ito-split-card p,
        .ito-onion-page .ito-quote-box,
        .ito-onion-page .ito-export-step .ito-process-control,
        .ito-onion-page .ito-process-item span {
          text-align: center;
        }

        /* =========================================================
           TABLE LAYOUT FIX
           The previous responsive rule changed the actual <table> to
           display:block and then targeted a nested <table> that does not
           exist. That made the cells shrink to their content and left a
           large empty white area inside the table surface.

           Keep the table as a real table at every viewport width.
           Columns are allowed to wrap naturally so the table fills the
           available section width without creating horizontal dead space.
           ========================================================= */
        .ito-onion-page .ito-table {
          display: table;
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          overflow: visible;
        }

        .ito-onion-page .ito-table th,
        .ito-onion-page .ito-table td {
          min-width: 0;
          max-width: none;
          overflow-wrap: break-word;
          word-break: normal;
          white-space: normal;
          vertical-align: middle;
        }

        .ito-onion-page .ito-table th:first-child,
        .ito-onion-page .ito-table td:first-child {
          width: 28%;
        }

        .ito-onion-page .ito-table th:last-child,
        .ito-onion-page .ito-table td:last-child {
          width: 72%;
        }

        /* Keep the table surface clean on desktop and mobile. */
        .ito-onion-page .ito-table tr {
          width: 100%;
        }

        .ito-onion-page img {
          max-width: 100%;
        }

        .ito-onion-page input,
        .ito-onion-page textarea,
        .ito-onion-page select,
        .ito-onion-page button {
          max-width: 100%;
        }

        /* Requirement / personal-details modal responsiveness. */
        .ito-onion-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          overflow-y: auto;
          background: rgba(20, 12, 14, 0.62);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .ito-onion-personal-modal {
          width: min(760px, 100%);
          max-height: min(900px, calc(100svh - 48px));
          overflow-y: auto;
          border: 1px solid rgba(74, 16, 28, 0.16);
          border-radius: 22px;
          background: #F7F3EA;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.28);
        }

        .ito-onion-personal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 28px 30px 22px;
          border-bottom: 1px solid rgba(74, 16, 28, 0.12);
        }

        .ito-onion-personal-header small {
          display: block;
          margin-bottom: 8px;
          color: #566044;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          text-align: left;
        }

        .ito-onion-personal-header h2 {
          margin: 0;
          color: #4A101C;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1;
          font-weight: 500;
          text-align: left;
        }

        .ito-onion-modal-close {
          flex: 0 0 auto;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(74, 16, 28, 0.18);
          border-radius: 50%;
          background: transparent;
          color: #4A101C;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
        }

        .ito-onion-personal-body {
          padding: 26px 30px 30px;
        }

        .ito-onion-requirement-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 24px;
        }

        .ito-onion-requirement-summary > div {
          min-width: 0;
          padding: 14px;
          border: 1px solid rgba(74, 16, 28, 0.12);
          border-radius: 12px;
          background: #FFFFFF;
          text-align: center;
        }

        .ito-onion-requirement-summary span {
          display: block;
          margin-bottom: 6px;
          color: #566044;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .ito-onion-requirement-summary strong {
          display: block;
          color: #4A101C;
          font-size: 12px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .ito-onion-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .ito-onion-field {
          min-width: 0;
        }

        .ito-onion-field.full {
          grid-column: 1 / -1;
        }

        .ito-onion-field label {
          display: block;
          margin-bottom: 7px;
          color: #4A101C;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          text-align: left;
        }

        .ito-onion-field input,
        .ito-onion-field textarea,
        .ito-onion-field select {
          width: 100%;
          min-height: 48px;
          padding: 12px 14px;
          border: 1px solid rgba(74, 16, 28, 0.16);
          border-radius: 10px;
          outline: none;
          background: #FFFFFF;
          color: #22211F;
          font: inherit;
          font-size: 14px;
        }

        .ito-onion-field input:focus,
        .ito-onion-field textarea:focus,
        .ito-onion-field select:focus {
          border-color: #8E3347;
          box-shadow: 0 0 0 3px rgba(142, 51, 71, 0.10);
        }

        .ito-onion-form-note {
          margin: 20px 0 0;
          color: rgba(34, 33, 31, .72);
          font-size: 12px;
          line-height: 1.6;
          text-align: center;
        }

        .ito-onion-form-actions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        /* Laptop / tablet widths. */
        @media (max-width: 1100px) {
          .ito-onion-page .ito-section-inner {
            width: min(100% - 40px, 1100px);
          }

          .ito-onion-page .ito-hero-inner {
            width: min(100% - 40px, 1100px);
            padding-left: 20px;
            padding-right: 20px;
          }

          .ito-onion-page .ito-spec-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ito-onion-page .ito-grade-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ito-onion-page .ito-persona-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ito-onion-page .ito-export-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Phones. */
        @media (max-width: 800px) {
          .ito-onion-page {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          .ito-onion-page .ito-section {
            width: 100%;
            overflow: hidden;
          }

          .ito-onion-page .ito-section .ito-section-inner {
            width: calc(100% - 24px);
            max-width: none;
            margin-left: 12px;
            margin-right: 12px;
            padding: 26px 18px;
            border-radius: 16px;
          }

          .ito-onion-page .ito-hero-inner {
            width: 100%;
            padding: 7rem 18px 3.5rem;
          }

          .ito-onion-page .ito-hero-text {
            width: 100%;
            max-width: 100%;
            text-align: center;
          }

          .ito-onion-page .ito-hero-title,
          .ito-onion-page .ito-hero-subtitle {
            max-width: 100%;
          }

          .ito-onion-page .ito-intro,
          .ito-onion-page .ito-cta-inner,
          .ito-onion-page .ito-export-grid,
          .ito-onion-page .ito-split-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .ito-onion-page .ito-spec-grid {
            grid-template-columns: 1fr;
            margin-top: 36px;
          }

          .ito-onion-page .ito-grade-grid,
          .ito-onion-page .ito-process,
          .ito-onion-page .ito-packaging,
          .ito-onion-page .ito-persona-grid {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-process-item {
            grid-template-columns: 42px 1fr;
            gap: 12px;
            text-align: center;
          }

          .ito-onion-page .ito-process-item span {
            min-width: 0;
          }

          .ito-onion-page .ito-export-workflow {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-export-step {
            grid-template-columns: 48px minmax(0, 1fr);
            gap: 10px;
          }

          .ito-onion-page .ito-export-docs,
          .ito-onion-page .ito-pack-card,
          .ito-onion-page .ito-persona-card,
          .ito-onion-page .ito-split-card,
          .ito-onion-page .ito-quote-box {
            padding: 20px 16px;
          }

          .ito-onion-page .ito-markets {
            justify-content: center;
          }

          .ito-onion-page .ito-market {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .ito-onion-page .ito-table {
            margin-left: 0;
            margin-right: 0;
          }

          .ito-onion-page .ito-cta-inner > div:first-child,
          .ito-onion-page .ito-cta-inner > div:last-child {
            padding: 20px 18px;
          }

          .ito-onion-page .ito-actions {
            justify-content: center;
          }

          .ito-onion-page .ito-button {
            width: 100%;
            max-width: 100%;
          }

          .ito-onion-page .ito-footer {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .ito-onion-modal-backdrop {
            align-items: flex-start;
            padding: 12px;
          }

          .ito-onion-personal-modal {
            width: 100%;
            max-height: calc(100svh - 24px);
            border-radius: 16px;
          }

          .ito-onion-personal-header {
            padding: 20px 18px 18px;
          }

          .ito-onion-personal-body {
            padding: 20px 18px 22px;
          }

          .ito-onion-requirement-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ito-onion-form-grid {
            grid-template-columns: 1fr;
          }

          .ito-onion-field.full {
            grid-column: auto;
          }

          .ito-onion-form-actions {
            flex-direction: column-reverse;
          }

          .ito-onion-form-actions .ito-button {
            width: 100%;
          }

          /* Content copy is centered on mobile; section headings remain left. */
          .ito-onion-page .ito-lead,
          .ito-onion-page .ito-pack-card p,
          .ito-onion-page .ito-persona-card .need,
          .ito-onion-page .ito-split-card p,
          .ito-onion-page .ito-quote-box,
          .ito-onion-page .ito-cta-copy {
            text-align: center;
            margin-left: auto;
            margin-right: auto;
          }

          .ito-onion-page .ito-section-title,
          .ito-onion-page .ito-section-heading,
          .ito-onion-page .ito-crm-heading,
          .ito-onion-page .ito-sub-heading {
            width: 100%;
            max-width: 100%;
            overflow-wrap: anywhere;
          }
        }

        /* Small phones. */
        @media (max-width: 430px) {
          .ito-onion-page .ito-section .ito-section-inner {
            width: calc(100% - 16px);
            margin-left: 8px;
            margin-right: 8px;
            padding: 22px 14px;
          }

          .ito-onion-page .ito-section-title {
            font-size: clamp(34px, 11vw, 48px);
          }

          .ito-onion-page .ito-card {
            min-height: auto;
            padding: 22px 16px;
          }

          .ito-onion-page .ito-card h3 {
            margin-top: 34px;
            font-size: 26px;
          }

          .ito-onion-page .ito-spec {
            min-height: auto;
            padding: 22px 16px;
          }

          .ito-onion-page .ito-process-item,
          .ito-onion-page .ito-export-step {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .ito-onion-page .ito-process-item::before {
            margin-bottom: 4px;
          }

          .ito-onion-page .ito-process-stage {
            text-align: center;
          }

          .ito-onion-page .ito-hero-inner {
            padding-left: 14px;
            padding-right: 14px;
          }

          .ito-onion-page .ito-hero-text {
            width: 100%;
            max-width: 100%;
            text-align: left;
          }

          .ito-onion-page .ito-hero-kicker {
            margin-left: auto;
            margin-right: auto;
            text-align: center;
            justify-content: center;
          }

          .ito-onion-page .ito-hero-title {
            width: 100%;
            max-width: 100%;
            margin: 0;
            font-size: clamp(35px, 10vw, 42px);
            line-height: 0.98;
            letter-spacing: -0.025em;
            text-align: left;
            white-space: normal;
          }

          .ito-onion-page .ito-hero-title-line {
            display: block;
            width: max-content;
            max-width: 100%;
            white-space: nowrap;
          }

          .ito-onion-page .ito-hero-subtitle {
            width: 100%;
            max-width: 100%;
            text-align: center;
            margin-left: auto;
            margin-right: auto;
          }

          .ito-onion-page .ito-trust-line {
            width: 100%;
            justify-content: flex-start;
          }

          .ito-onion-page .ito-trust-line {
            align-items: center;
          }

          .ito-onion-requirement-summary {
            grid-template-columns: 1fr;
          }

          .ito-onion-personal-header h2 {
            font-size: 30px;
          }

          .ito-onion-modal-close {
            width: 36px;
            height: 36px;
          }
        }

        /* Large laptop / desktop: keep content comfortably centered. */
        @media (min-width: 1400px) {
          .ito-onion-page .ito-section .ito-section-inner {
            max-width: 1240px;
          }

          .ito-onion-page .ito-hero-inner {
            width: min(1240px, calc(100% - 80px));
          }
        }


        /* =========================================================
           FINAL PAGE ALIGNMENT SYSTEM
           Desktop / laptop: hero remains intentionally left aligned.
           Mobile: hero becomes a centered composition.
           Other page sections use the alignment that best suits their
           content: headings remain left-aligned while compact cards and
           process content can use centered copy.
           ========================================================= */

        /* HERO — LAPTOP / DESKTOP */
        .ito-onion-page .ito-hero-inner {
          grid-template-columns: minmax(0, 1fr) !important;
          justify-items: start;
          width: min(1180px, calc(100% - 40px));
        }

        .ito-onion-page .ito-hero-text {
          width: min(100%, 920px);
          max-width: 920px;
          margin-left: 0;
          margin-right: auto;
          text-align: left !important;
        }

        .ito-onion-page .ito-hero-kicker {
          width: fit-content;
          max-width: 100%;
          margin-left: 0 !important;
          margin-right: 0 !important;
          justify-content: flex-start;
          text-align: left !important;
        }

        .ito-onion-page .ito-hero-title {
          width: 100%;
          max-width: 920px;
          margin-left: 0 !important;
          margin-right: auto !important;
          text-align: left !important;
        }

        .ito-onion-page .ito-hero-title-line {
          display: block;
          width: fit-content;
          max-width: 100%;
          margin-left: 0;
          margin-right: auto;
          white-space: nowrap;
          text-align: left;
        }

        .ito-onion-page .ito-hero-accent-line {
          margin-left: 0 !important;
          margin-right: auto !important;
        }

        .ito-onion-page .ito-hero-subtitle {
          width: 100%;
          max-width: 680px;
          margin-left: 0 !important;
          margin-right: auto !important;
          text-align: left !important;
        }

        .ito-onion-page .ito-trust-line {
          width: 100%;
          justify-content: flex-start !important;
          align-items: flex-start !important;
          text-align: left !important;
          margin-left: 0;
          margin-right: auto;
        }

        .ito-onion-page .ito-trust-line span {
          justify-content: flex-start;
          text-align: left;
        }

        /* General page alignment: keep major headings readable and consistent. */
        .ito-onion-page .ito-section-title,
        .ito-onion-page .ito-section-heading,
        .ito-onion-page .ito-crm-heading,
        .ito-onion-page .ito-sub-heading,
        .ito-onion-page .ito-display {
          text-align: left;
        }

        .ito-onion-page .ito-lead {
          text-align: left;
        }

        /* Cards, compact process blocks and specification copy remain centered
           where that creates a cleaner visual hierarchy. */
        .ito-onion-page .ito-spec,
        .ito-onion-page .ito-card,
        .ito-onion-page .ito-pack-card,
        .ito-onion-page .ito-persona-card,
        .ito-onion-page .ito-split-card,
        .ito-onion-page .ito-quote-box,
        .ito-onion-page .ito-export-docs,
        .ito-onion-page .ito-process-item,
        .ito-onion-page .ito-export-step,
        .ito-onion-page .ito-market,
        .ito-onion-page .ito-cta-copy {
          text-align: center;
        }

        /* HERO — MOBILE ONLY */
        @media (max-width: 800px) {
          .ito-onion-page .ito-hero-inner {
            width: 100%;
            grid-template-columns: 1fr !important;
            justify-items: center;
            padding-left: 14px;
            padding-right: 14px;
          }

          .ito-onion-page .ito-hero-text {
            width: 100%;
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
            text-align: center !important;
          }

          .ito-onion-page .ito-hero-kicker {
            width: fit-content;
            max-width: 100%;
            margin-left: auto !important;
            margin-right: auto !important;
            justify-content: center;
            text-align: center !important;
          }

          .ito-onion-page .ito-hero-title {
            width: 100%;
            max-width: 100%;
            margin-left: auto !important;
            margin-right: auto !important;
            font-size: clamp(36px, 10.5vw, 58px);
            line-height: 0.98;
            text-align: center !important;
          }

          .ito-onion-page .ito-hero-title-line {
            width: fit-content;
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
            white-space: nowrap;
            text-align: center;
          }

          .ito-onion-page .ito-hero-accent-line {
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .ito-onion-page .ito-hero-subtitle {
            width: 100%;
            max-width: 100%;
            margin-left: auto !important;
            margin-right: auto !important;
            text-align: center !important;
          }

          .ito-onion-page .ito-trust-line {
            width: 100%;
            justify-content: center !important;
            align-items: center !important;
            flex-direction: column;
            text-align: center !important;
            margin-left: auto;
            margin-right: auto;
          }

          .ito-onion-page .ito-trust-line span {
            width: 100%;
            justify-content: center;
            text-align: center;
          }
        }

        @media (max-width: 430px) {
          .ito-onion-page .ito-hero-title {
            font-size: clamp(34px, 10.2vw, 44px);
            line-height: 1;
          }

          .ito-onion-page .ito-hero-title-line {
            white-space: nowrap;
          }

          .ito-onion-page .ito-hero-kicker {
            font-size: 8px;
          }

          .ito-onion-page .ito-hero-subtitle {
            font-size: 14px;
            line-height: 1.55;
          }

          .ito-onion-page .ito-trust-line {
            gap: 9px;
            font-size: 11px;
          }
        }

        /* =========================================================
           MOBILE HERO TYPOGRAPHY SPACING
           Mobile only — laptop/desktop remains unchanged.
           ========================================================= */
        @media (max-width: 800px) {
          .ito-onion-page .ito-hero-text {
            gap: 0;
          }

          .ito-onion-page .ito-hero-kicker {
            margin-bottom: 28px !important;
          }

          .ito-onion-page .ito-hero-title {
            margin-bottom: 28px !important;
          }

          .ito-onion-page .ito-hero-title-line + .ito-hero-title-line {
            margin-top: 5px;
          }

          .ito-onion-page .ito-hero-accent-line {
            margin-top: 4px !important;
            margin-bottom: 28px !important;
          }

          .ito-onion-page .ito-hero-subtitle {
            margin-top: 0 !important;
            line-height: 1.8 !important;
          }

          .ito-onion-page .ito-trust-line {
            margin-top: 28px !important;
            gap: 14px !important;
            line-height: 1.5 !important;
          }
        }

        @media (max-width: 430px) {
          .ito-onion-page .ito-hero-kicker {
            margin-bottom: 24px !important;
          }

          .ito-onion-page .ito-hero-title {
            margin-bottom: 24px !important;
          }

          .ito-onion-page .ito-hero-title-line + .ito-hero-title-line {
            margin-top: 4px;
          }

          .ito-onion-page .ito-hero-accent-line {
            margin-bottom: 24px !important;
          }

          .ito-onion-page .ito-hero-subtitle {
            line-height: 1.75 !important;
          }

          .ito-onion-page .ito-trust-line {
            margin-top: 24px !important;
            gap: 12px !important;
          }
        }


        /* DAILY ONION RATE CHART MODAL */
        .ito-rate-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(20, 12, 14, 0.72);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .ito-rate-modal {
          width: min(920px, 100%);
          max-height: min(90vh, 900px);
          overflow: hidden;
          border: 1px solid rgba(181, 150, 90, 0.55);
          border-radius: 22px;
          background: var(--ivory);
          color: var(--charcoal);
          box-shadow: 0 30px 100px rgba(0,0,0,.35);
          display: flex;
          flex-direction: column;
        }

        .ito-rate-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 28px;
          background: var(--burgundy);
          color: var(--ivory);
          border-bottom: 1px solid rgba(181,150,90,.35);
        }

        .ito-rate-modal-kicker {
          margin-bottom: 7px;
          color: var(--gold);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .ito-rate-modal-header h2 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 500;
          line-height: 1;
        }

        .ito-rate-modal-date {
          margin-top: 8px;
          color: rgba(247,243,234,.82);
          font-size: 12px;
          font-weight: 700;
        }

        .ito-rate-modal-close {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          border: 1px solid rgba(247,243,234,.28);
          border-radius: 50%;
          background: rgba(255,255,255,.08);
          color: var(--ivory);
          font-size: 25px;
          line-height: 1;
          cursor: pointer;
          transition: transform .2s ease, background .2s ease;
        }

        .ito-rate-modal-close:hover {
          transform: rotate(4deg);
          background: rgba(255,255,255,.16);
        }

        .ito-rate-modal-body {
          overflow-y: auto;
          padding: 26px 28px 30px;
        }

        .ito-rate-intro {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 22px;
        }

        .ito-rate-pill {
          padding: 8px 12px;
          border: 1px solid var(--sand);
          border-radius: 999px;
          background: rgba(74,16,28,.045);
          color: var(--burgundy);
          font-size: 11px;
          font-weight: 800;
        }

        .ito-rate-section-title {
          margin: 24px 0 12px;
          color: var(--burgundy);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 25px;
          font-weight: 500;
        }

        .ito-rate-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid var(--sand);
          border-radius: 14px;
          background: var(--white);
        }

        .ito-rate-table {
          width: 100%;
          min-width: 650px;
          border-collapse: collapse;
          font-size: 13px;
        }

        .ito-rate-table th,
        .ito-rate-table td {
          padding: 13px 14px;
          text-align: left;
          border-bottom: 1px solid rgba(222,209,188,.75);
        }

        .ito-rate-table th {
          background: rgba(74,16,28,.055);
          color: var(--burgundy);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .ito-rate-table td {
          color: rgba(34,33,31,.86);
        }

        .ito-rate-table tbody tr:last-child td {
          border-bottom: none;
        }

        .ito-rate-price {
          color: var(--onion-red) !important;
          font-weight: 900;
          white-space: nowrap;
        }

        .ito-domestic-highlight {
          margin-top: 12px;
          padding: 16px 18px;
          border: 1px solid rgba(74,16,28,.18);
          border-radius: 14px;
          background: rgba(74,16,28,.055);
        }

        .ito-domestic-highlight strong {
          color: var(--burgundy);
        }

        .ito-rate-notes {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 16px;
        }

        .ito-rate-note {
          padding: 14px;
          border: 1px solid var(--sand);
          border-radius: 12px;
          background: var(--white);
        }

        .ito-rate-note span {
          display: block;
          margin-bottom: 5px;
          color: var(--olive);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .ito-rate-note strong {
          color: var(--burgundy);
          font-size: 14px;
        }

        .ito-rate-disclaimer {
          margin-top: 20px;
          color: rgba(34,33,31,.62);
          font-size: 11px;
          line-height: 1.6;
        }

        @media (max-width: 800px) {
          .ito-rate-modal-backdrop {
            align-items: flex-start;
            padding: 12px;
          }

          .ito-rate-modal {
            max-height: calc(100svh - 24px);
            border-radius: 17px;
          }

          .ito-rate-modal-header {
            padding: 20px 18px;
          }

          .ito-rate-modal-body {
            padding: 20px 16px 24px;
          }

          .ito-rate-notes {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 430px) {
          .ito-rate-modal-header h2 {
            font-size: 30px;
          }

          .ito-rate-modal-close {
            width: 36px;
            height: 36px;
            font-size: 21px;
          }

          .ito-rate-table {
            min-width: 590px;
          }
        }

        /* ============================================================
           FINAL TYPOGRAPHY + BULLET RESTRUCTURE
           ============================================================ */

        .ito-onion-page h1,
        .ito-onion-page h2,
        .ito-onion-page h3,
        .ito-onion-page h4,
        .ito-onion-page h5,
        .ito-onion-page h6,
        .ito-onion-page .ito-display,
        .ito-onion-page .ito-section-title,
        .ito-onion-page .ito-section-heading,
        .ito-onion-page .ito-sub-heading,
        .ito-onion-page .ito-crm-heading {
          text-align: center !important;
        }

        .ito-onion-page .ito-eyebrow,
        .ito-onion-page .ito-pack-card small {
          text-align: center !important;
        }

        .ito-onion-page .ito-section-title,
        .ito-onion-page .ito-section-heading,
        .ito-onion-page .ito-sub-heading,
        .ito-onion-page .ito-crm-heading {
          width: 100%;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .ito-onion-page .ito-card h3,
        .ito-onion-page .ito-pack-card h3,
        .ito-onion-page .ito-split-card h3,
        .ito-onion-page .ito-cta h2,
        .ito-onion-page .ito-faq-q,
        .ito-onion-page .ito-onion-personal-header h2,
        .ito-onion-page .ito-rate-modal-header h2,
        .ito-onion-page .ito-rate-section-title {
          text-align: center !important;
        }

        /* Compact bullets */
        .ito-onion-page .ito-bullet-list {
          list-style: none !important;
          padding: 0 !important;
          margin: 0 auto !important;
          width: max-content;
          max-width: 100%;
          text-align: left !important;
        }

        .ito-onion-page .ito-bullet-list li {
          position: relative;
          padding-left: 12px !important;
          margin: 0 0 3px !important;
          line-height: 1.35 !important;
          text-align: left !important;
        }

        .ito-onion-page .ito-bullet-list li:last-child {
          margin-bottom: 0 !important;
        }

        .ito-onion-page .ito-bullet-list li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.58em;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gold);
        }

        .ito-onion-page .ito-export-docs .ito-bullet-list li,
        .ito-onion-page .ito-pack-card .ito-bullet-list li,
        .ito-onion-page .ito-split-card .ito-bullet-list li {
          padding-left: 12px !important;
          margin-bottom: 3px !important;
          line-height: 1.35 !important;
          text-align: left !important;
        }

        .ito-onion-page .ito-export-docs .ito-bullet-list li:last-child,
        .ito-onion-page .ito-pack-card .ito-bullet-list li:last-child,
        .ito-onion-page .ito-split-card .ito-bullet-list li:last-child {
          margin-bottom: 0 !important;
        }

        /* Center supporting section copy */
        .ito-onion-page .ito-lead {
          margin-left: auto !important;
          margin-right: auto !important;
          text-align: center !important;
        }

        .ito-onion-page .ito-market-notice,
        .ito-onion-page .ito-quote-box {
          text-align: center !important;
        }

        .ito-onion-page .ito-persona-card,
        .ito-onion-page .ito-persona-card .buyer,
        .ito-onion-page .ito-persona-card .need,
        .ito-onion-page .ito-persona-card .cta {
          text-align: center !important;
        }

        .ito-onion-page .ito-process-item,
        .ito-onion-page .ito-process-item span,
        .ito-onion-page .ito-export-step .ito-process-stage,
        .ito-onion-page .ito-export-step .ito-process-control {
          text-align: center !important;
        }

        .ito-onion-page .ito-table th {
          text-align: center !important;
          vertical-align: middle !important;
        }

        /* Keep the first quality-table header on one line, including narrow phones. */
        .ito-onion-page .ito-quality-table th:first-child {
          white-space: nowrap !important;
          font-size: 11px;
          letter-spacing: .08em;
        }

        .ito-onion-page .ito-table td {
          vertical-align: middle !important;
        }

        @media (max-width: 800px) {
          .ito-onion-page h1,
          .ito-onion-page h2,
          .ito-onion-page h3,
          .ito-onion-page h4,
          .ito-onion-page h5,
          .ito-onion-page h6,
          .ito-onion-page .ito-display,
          .ito-onion-page .ito-section-title,
          .ito-onion-page .ito-section-heading,
          .ito-onion-page .ito-sub-heading,
          .ito-onion-page .ito-crm-heading {
            text-align: center !important;
          }

          .ito-onion-page .ito-bullet-list {
            width: max-content;
            max-width: 100%;
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .ito-onion-page .ito-bullet-list li {
            padding-left: 10px !important;
            margin-bottom: 2px !important;
            line-height: 1.32 !important;
            text-align: left !important;
          }

          .ito-onion-page .ito-bullet-list li::before {
            width: 4px;
            height: 4px;
          }

          .ito-onion-page .ito-export-docs .ito-bullet-list li,
          .ito-onion-page .ito-pack-card .ito-bullet-list li,
          .ito-onion-page .ito-split-card .ito-bullet-list li {
            padding-left: 10px !important;
            margin-bottom: 2px !important;
            line-height: 1.32 !important;
            text-align: left !important;
          }
        }

        @media (max-width: 430px) {
          .ito-onion-page .ito-quality-table th:first-child {
            width: 38% !important;
            font-size: 9.5px !important;
            letter-spacing: .06em !important;
            white-space: nowrap !important;
          }

          .ito-onion-page .ito-quality-table th:last-child {
            width: 62% !important;
          }

          .ito-onion-page .ito-bullet-list {
            width: max-content;
            max-width: 100%;
          }

          .ito-onion-page .ito-bullet-list li {
            padding-left: 9px !important;
            margin-bottom: 1px !important;
            line-height: 1.3 !important;
            text-align: left !important;
          }

          .ito-onion-page .ito-export-docs .ito-bullet-list li,
          .ito-onion-page .ito-pack-card .ito-bullet-list li,
          .ito-onion-page .ito-split-card .ito-bullet-list li {
            padding-left: 9px !important;
            margin-bottom: 1px !important;
            text-align: left !important;
          }
        }


        /* ============================================================
           FINAL MOBILE + RESPONSIVE SAFETY PASS
           ============================================================ */

        .ito-onion-page,
        .ito-onion-page * {
          box-sizing: border-box;
        }

        .ito-onion-page {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: clip;
        }

        .ito-onion-page .ito-section,
        .ito-onion-page .ito-section-inner,
        .ito-onion-page .ito-hero,
        .ito-onion-page .ito-hero-inner,
        .ito-onion-page .ito-intro,
        .ito-onion-page .ito-cta-inner,
        .ito-onion-page .ito-export-grid,
        .ito-onion-page .ito-grade-grid,
        .ito-onion-page .ito-process,
        .ito-onion-page .ito-packaging,
        .ito-onion-page .ito-persona-grid,
        .ito-onion-page .ito-split-grid,
        .ito-onion-page .ito-spec-grid {
          min-width: 0;
          max-width: 100%;
        }

        .ito-onion-page .ito-section-inner > *,
        .ito-onion-page .ito-card,
        .ito-onion-page .ito-spec,
        .ito-onion-page .ito-pack-card,
        .ito-onion-page .ito-persona-card,
        .ito-onion-page .ito-split-card,
        .ito-onion-page .ito-export-docs,
        .ito-onion-page .ito-quote-box,
        .ito-onion-page .ito-faq,
        .ito-onion-page .ito-faq-item {
          min-width: 0;
          max-width: 100%;
        }

        .ito-onion-page img,
        .ito-onion-page video,
        .ito-onion-page canvas,
        .ito-onion-page iframe {
          max-width: 100%;
        }

        /* Quality-table headers use exactly the same font size. */
        .ito-onion-page .ito-quality-table th:first-child,
        .ito-onion-page .ito-quality-table th:last-child {
          font-size: 13px !important;
          line-height: 1.2 !important;
        }

        /* Buyer Questions: questions stay left-aligned. */
        .ito-onion-page .ito-faq,
        .ito-onion-page .ito-faq-item,
        .ito-onion-page .ito-faq-q {
          text-align: left !important;
        }

        .ito-onion-page .ito-faq-q {
          width: 100%;
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .ito-onion-page .ito-faq-a {
          text-align: left !important;
          overflow-wrap: anywhere;
        }

        /* Prevent long inline content from creating horizontal overflow. */
        .ito-onion-page .ito-market,
        .ito-onion-page .ito-button,
        .ito-onion-page .ito-quote-box,
        .ito-onion-page .ito-cta-copy,
        .ito-onion-page p,
        .ito-onion-page li,
        .ito-onion-page td,
        .ito-onion-page th,
        .ito-onion-page span,
        .ito-onion-page strong,
        .ito-onion-page a {
          overflow-wrap: anywhere;
        }

        /* Do not allow the quality table itself to become wider than its card. */
        .ito-onion-page .ito-quality-table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
        }

        @media (max-width: 800px) {
          .ito-onion-page .ito-quality-table th:first-child,
          .ito-onion-page .ito-quality-table th:last-child {
            font-size: 10px !important;
            line-height: 1.15 !important;
          }

          .ito-onion-page .ito-quality-table th:first-child {
            width: 38% !important;
            white-space: nowrap !important;
            overflow-wrap: normal !important;
            word-break: normal !important;
          }

          .ito-onion-page .ito-quality-table th:last-child {
            width: 62% !important;
          }

          .ito-onion-page .ito-quality-table th,
          .ito-onion-page .ito-quality-table td {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .ito-onion-page .ito-faq {
            width: 100%;
            max-width: 100%;
          }

          .ito-onion-page .ito-faq-q {
            text-align: left !important;
            font-size: 15px;
          }

          .ito-onion-page .ito-faq-a {
            text-align: left !important;
          }

          /* Every responsive grid child may shrink instead of forcing a page-wide overflow. */
          .ito-onion-page .ito-grade-grid > *,
          .ito-onion-page .ito-process > *,
          .ito-onion-page .ito-packaging > *,
          .ito-onion-page .ito-persona-grid > *,
          .ito-onion-page .ito-split-grid > *,
          .ito-onion-page .ito-export-grid > *,
          .ito-onion-page .ito-spec-grid > * {
            min-width: 0;
            max-width: 100%;
          }
        }

        @media (max-width: 430px) {
          .ito-onion-page .ito-quality-table th:first-child,
          .ito-onion-page .ito-quality-table th:last-child {
            font-size: 9.5px !important;
            line-height: 1.15 !important;
          }

          .ito-onion-page .ito-quality-table th:first-child {
            width: 38% !important;
            white-space: nowrap !important;
          }

          .ito-onion-page .ito-quality-table th:last-child {
            width: 62% !important;
          }

          .ito-onion-page .ito-faq-q {
            font-size: 14px;
            line-height: 1.45;
          }
        }


        /* ============================================================
           PREMIUM ONION DESIGN SYSTEM
           Layout / spacing / typography only. Existing content,
           colors and business/backend logic are preserved.
           ============================================================ */

        .ito-onion-page {
          --premium-max: 1220px;
          --premium-x: clamp(18px, 4vw, 54px);
          --premium-y: clamp(72px, 8vw, 124px);
          overflow-x: hidden;
        }

        .ito-onion-page .ito-section {
          padding: var(--premium-y) var(--premium-x);
        }

        .ito-onion-page .ito-section-inner {
          width: min(var(--premium-max), 100%);
          margin-inline: auto;
        }

        .ito-onion-page .ito-section-title {
          max-width: 900px;
          font-size: clamp(40px, 5.2vw, 72px);
          line-height: .96;
          letter-spacing: -.045em;
        }

        .ito-onion-page .ito-lead {
          max-width: 720px;
          font-size: clamp(15px, 1.25vw, 18px);
          line-height: 1.8;
        }

        .ito-onion-page .ito-eyebrow {
          margin-bottom: 16px;
          line-height: 1;
        }

        /* HERO */
        .ito-onion-page .ito-hero-inner {
          width: min(1220px, 100%);
          padding: clamp(108px, 12vw, 150px) var(--premium-x) clamp(62px, 7vw, 96px);
          grid-template-columns: minmax(0, 1.08fr) minmax(220px, .42fr);
          gap: clamp(30px, 7vw, 105px);
        }

        .ito-onion-page .ito-hero-text {
          max-width: 820px;
        }

        .ito-onion-page .ito-hero-title {
          font-size: clamp(46px, 6.5vw, 94px);
          line-height: .91;
          letter-spacing: -.055em;
        }

        .ito-onion-page .ito-hero-title-line {
          display: block;
        }

        .ito-onion-page .ito-hero-subtitle {
          max-width: 650px;
          font-size: clamp(15px, 1.45vw, 19px);
          line-height: 1.75;
        }

        /* EDITORIAL INTRO */
        .ito-onion-page .ito-intro {
          grid-template-columns: minmax(270px, .78fr) minmax(0, 1.22fr);
          gap: clamp(42px, 8vw, 112px);
          align-items: end;
        }

        /* SPECIFICATION CARDS */
        .ito-onion-page .ito-spec-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          margin-top: clamp(42px, 5vw, 70px);
        }

        .ito-onion-page .ito-spec {
          min-width: 0;
          min-height: 185px;
          padding: clamp(22px, 2.4vw, 32px);
        }

        .ito-onion-page .ito-spec strong {
          font-size: clamp(22px, 2vw, 28px);
        }

        /* GRADE / FEATURE CARDS */
        .ito-onion-page .ito-grade-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          margin-top: 52px;
        }

        .ito-onion-page .ito-card {
          min-width: 0;
          min-height: 280px;
          padding: clamp(24px, 2.5vw, 32px);
          border-radius: 16px;
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }

        .ito-onion-page .ito-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 60px rgba(74,16,28,.10);
          border-color: rgba(181,150,90,.55);
        }

        .ito-onion-page .ito-card h3 {
          margin-top: 48px;
          font-size: clamp(26px, 2.4vw, 32px);
          line-height: 1.05;
        }

        /* DOMESTIC / EXPORT */
        .ito-onion-page .ito-split-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          margin-top: 48px;
        }

        .ito-onion-page .ito-split-card {
          min-width: 0;
          padding: clamp(28px, 3.5vw, 46px);
          border-radius: 18px;
        }

        .ito-onion-page .ito-split-card h3 {
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1;
          margin-bottom: 18px;
        }

        .ito-onion-page .ito-split-card p {
          font-size: 14px;
          line-height: 1.8;
        }

        .ito-onion-page .ito-split-card .ito-button {
          margin-top: 28px;
        }

        /* PROCESS */
        .ito-onion-page .ito-process {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: clamp(30px, 6vw, 80px);
          row-gap: 0;
          margin-top: 50px;
        }

        .ito-onion-page .ito-process-item {
          min-width: 0;
          grid-template-columns: 48px minmax(0, 1fr);
          gap: 16px;
          min-height: 88px;
          padding: 20px 0;
        }

        .ito-onion-page .ito-process-item span {
          font-size: 14px;
          line-height: 1.6;
        }

        /* MARKETS / SIZES */
        .ito-onion-page .ito-markets {
          justify-content: flex-start;
          align-items: flex-start;
          gap: 10px;
          margin-top: 36px;
        }

        .ito-onion-page .ito-market {
          max-width: 100%;
          white-space: normal;
        }

        /* PACKAGING */
        .ito-onion-page .ito-packaging {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-top: 48px;
        }

        .ito-onion-page .ito-pack-card {
          min-width: 0;
          padding: clamp(26px, 3vw, 40px);
          border-radius: 18px;
        }

        /* BUYER PERSONAS */
        .ito-onion-page .ito-persona-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 48px;
        }

        .ito-onion-page .ito-persona-card {
          min-width: 0;
          padding: 28px;
          border-radius: 16px;
        }

        /* EXPORT */
        .ito-onion-page .ito-export-grid {
          grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
          gap: 22px;
        }

        .ito-onion-page .ito-export-column,
        .ito-onion-page .ito-export-step {
          min-width: 0;
        }

        /* BULLETS */
        .ito-onion-page .ito-bullet-list {
          width: 100%;
          max-width: 760px;
          margin: 22px auto 0;
          padding-left: 22px;
          text-align: left;
        }

        .ito-onion-page .ito-bullet-list li {
          margin: 7px 0;
          padding-left: 4px;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }

        .ito-onion-page .ito-bullet-list li::marker {
          color: var(--gold);
          font-size: .82em;
        }

        /* TABLES */
        .ito-onion-page .ito-rate-table-wrap,
        .ito-onion-page .ito-table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ito-onion-page .ito-table,
        .ito-onion-page .ito-rate-table {
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
        }

        .ito-onion-page .ito-table th,
        .ito-onion-page .ito-table td,
        .ito-onion-page .ito-rate-table th,
        .ito-onion-page .ito-rate-table td {
          vertical-align: middle;
          overflow-wrap: anywhere;
        }

        /* CTA */
        .ito-onion-page .ito-cta {
          padding-top: clamp(72px, 9vw, 120px);
          padding-bottom: clamp(78px, 9vw, 120px);
        }

        .ito-onion-page .ito-cta-inner {
          grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr);
          gap: clamp(40px, 7vw, 100px);
          align-items: center;
        }

        .ito-onion-page .ito-cta h2 {
          font-size: clamp(42px, 5.8vw, 80px);
          line-height: .95;
        }

        .ito-onion-page .ito-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .ito-onion-page .ito-button {
          min-height: 48px;
          padding: 13px 20px;
          border-radius: 10px;
        }

        /* FAQ */
        .ito-onion-page .ito-faq {
          max-width: 980px;
          margin-inline: auto;
        }

        .ito-onion-page .ito-faq-item {
          padding: 22px 0;
        }

        .ito-onion-page .ito-faq-q,
        .ito-onion-page .ito-faq-a {
          text-align: left !important;
        }

        .ito-onion-page .ito-faq-q {
          font-size: clamp(16px, 1.4vw, 19px);
          line-height: 1.45;
        }

        .ito-onion-page .ito-faq-a {
          max-width: 860px;
          font-size: 14px;
          line-height: 1.8;
        }

        /* TABLET */
        @media (max-width: 1024px) {
          .ito-onion-page .ito-hero-inner {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-spec-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ito-onion-page .ito-persona-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ito-onion-page .ito-export-grid,
          .ito-onion-page .ito-cta-inner {
            grid-template-columns: 1fr;
          }
        }

        /* MOBILE */
        @media (max-width: 800px) {
          .ito-onion-page {
            --premium-x: 18px;
            --premium-y: 68px;
          }

          .ito-onion-page .ito-hero {
            min-height: 760px;
          }

          .ito-onion-page .ito-hero-inner {
            min-height: 760px;
            padding-top: 105px;
            padding-bottom: 52px;
          }

          .ito-onion-page .ito-hero-title {
            font-size: clamp(42px, 12vw, 64px);
            line-height: .94;
          }

          .ito-onion-page .ito-hero-subtitle {
            line-height: 1.72;
          }

          .ito-onion-page .ito-intro,
          .ito-onion-page .ito-split-grid,
          .ito-onion-page .ito-grade-grid,
          .ito-onion-page .ito-packaging,
          .ito-onion-page .ito-export-grid {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-process {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-spec-grid,
          .ito-onion-page .ito-persona-grid {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-spec {
            min-height: auto;
          }

          .ito-onion-page .ito-section-title {
            font-size: clamp(36px, 10vw, 56px);
          }

          .ito-onion-page .ito-cta h2 {
            font-size: clamp(38px, 10vw, 56px);
          }

          .ito-onion-page .ito-actions {
            width: 100%;
            flex-direction: column;
          }

          .ito-onion-page .ito-actions .ito-button {
            width: 100%;
          }
        }

        @media (max-width: 430px) {
          .ito-onion-page {
            --premium-x: 15px;
            --premium-y: 58px;
          }

          .ito-onion-page .ito-hero-inner {
            padding-top: 94px;
            padding-bottom: 44px;
          }

          .ito-onion-page .ito-hero-title {
            font-size: clamp(38px, 11.5vw, 52px);
          }

          .ito-onion-page .ito-section-title {
            font-size: clamp(34px, 10.5vw, 48px);
          }

          .ito-onion-page .ito-split-card,
          .ito-onion-page .ito-pack-card,
          .ito-onion-page .ito-persona-card,
          .ito-onion-page .ito-card {
            padding: 22px;
          }

          .ito-onion-page .ito-bullet-list {
            padding-left: 20px;
          }

          .ito-onion-page .ito-bullet-list li {
            margin: 6px 0;
            line-height: 1.58;
          }

          .ito-onion-page .ito-table th {
            font-size: 11px;
            padding: 9px 7px;
          }

          .ito-onion-page .ito-table td {
            padding: 9px 7px;
          }
        }


        /* ============================================================
           FINAL PREMIUM RESTRUCTURE
           - Keeps all existing React state, API calls, routes,
             requirement builder and pricing flow unchanged.
           - Removes the "everything inside a floating box" look.
           - Gives each section its own visual rhythm and whitespace.
           - Keeps cards only where they represent actual content groups.
           ============================================================ */

        .ito-onion-page {
          --premium-max: 1240px;
          --premium-gutter: clamp(20px, 5vw, 72px);
          --premium-section-y: clamp(82px, 9vw, 148px);
          --premium-section-y-small: clamp(64px, 8vw, 104px);
          --premium-rule: rgba(74, 16, 28, 0.14);
          --premium-muted: rgba(34, 33, 31, 0.68);
          overflow-x: clip;
        }

        /* Sections are now full-width canvases rather than floating cards. */
        .ito-onion-page .ito-section {
          width: 100%;
          padding: var(--premium-section-y) var(--premium-gutter);
          background: var(--ivory);
          border-top: 1px solid rgba(74, 16, 28, 0.055);
        }

        .ito-onion-page .ito-section:nth-of-type(even) {
          background: #F3EEE4;
        }

        .ito-onion-page .ito-section.ito-dark {
          background:
            radial-gradient(circle at 86% 12%, rgba(181,150,90,.10), transparent 28%),
            linear-gradient(180deg, #4A101C 0%, #3B0D17 100%);
          color: var(--ivory);
        }

        .ito-onion-page .ito-section.ito-cta {
          background:
            radial-gradient(circle at 15% 20%, rgba(181,150,90,.13), transparent 30%),
            #F3EEE4;
        }

        /* The old section-inner was visually acting like a giant card.
           It is now only a layout container. */
        .ito-onion-page .ito-section .ito-section-inner,
        .ito-onion-page .ito-section.ito-dark .ito-section-inner,
        .ito-onion-page .ito-section.ito-cta .ito-section-inner,
        .ito-onion-page .ito-section--pt .ito-section-inner {
          width: min(var(--premium-max), 100%);
          max-width: var(--premium-max);
          margin: 0 auto;
          padding: 0 !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        .ito-onion-page .ito-section-inner::before,
        .ito-onion-page .ito-section-inner::after {
          display: none !important;
        }

        /* Consistent section header rhythm. */
        .ito-onion-page .ito-intro {
          grid-template-columns: minmax(220px, .72fr) minmax(0, 1.28fr);
          gap: clamp(42px, 7vw, 110px);
          align-items: start;
        }

        .ito-onion-page .ito-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          line-height: 1;
        }

        .ito-onion-page .ito-eyebrow::before {
          content: "";
          width: 28px;
          height: 1px;
          background: currentColor;
          opacity: .7;
        }

        .ito-onion-page .ito-section-title {
          margin: 0;
          max-width: 920px;
          font-size: clamp(42px, 5.6vw, 78px);
          line-height: .94;
          letter-spacing: -.045em;
        }

        .ito-onion-page .ito-lead {
          max-width: 720px;
          margin: 4px 0 0;
          font-size: clamp(15px, 1.35vw, 18px);
          line-height: 1.8;
        }

        /* Keep content groups separated by whitespace, not nested panels. */
        .ito-onion-page .ito-spec-grid,
        .ito-onion-page .ito-grade-grid,
        .ito-onion-page .ito-process,
        .ito-onion-page .ito-packaging,
        .ito-onion-page .ito-persona-grid,
        .ito-onion-page .ito-split-grid,
        .ito-onion-page .ito-export-grid {
          margin-top: clamp(48px, 6vw, 82px);
        }

        .ito-onion-page .ito-spec-grid {
          gap: 0;
          background: transparent;
          border: 0;
        }

        .ito-onion-page .ito-spec {
          min-height: 170px;
          padding: 30px 28px;
          background: rgba(255,255,255,.56) !important;
          border: 1px solid var(--premium-rule);
          border-radius: 0;
        }

        .ito-onion-page .ito-spec + .ito-spec {
          border-left: 0;
        }

        .ito-onion-page .ito-spec strong {
          margin-bottom: 14px;
          font-size: 23px;
        }

        /* Actual cards remain cards, but become lighter and more editorial. */
        .ito-onion-page .ito-card,
        .ito-onion-page .ito-pack-card,
        .ito-onion-page .ito-persona-card,
        .ito-onion-page .ito-split-card {
          border-radius: 18px;
          border: 1px solid rgba(74,16,28,.12);
          box-shadow: 0 18px 55px rgba(34,33,31,.055);
        }

        .ito-onion-page .ito-card,
        .ito-onion-page .ito-persona-card,
        .ito-onion-page .ito-split-card {
          padding: clamp(26px, 3vw, 36px);
        }

        .ito-onion-page .ito-card {
          min-height: 300px;
        }

        .ito-onion-page .ito-card h3 {
          margin-top: 64px;
        }

        /* Process becomes a clean editorial list instead of a boxed grid. */
        .ito-onion-page .ito-process {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 clamp(42px, 7vw, 100px);
          border-top: 1px solid var(--premium-rule);
        }

        .ito-onion-page .ito-process-item {
          min-height: 86px;
          padding: 22px 0;
          border-bottom: 1px solid var(--premium-rule);
        }

        .ito-onion-page .ito-process-item::before {
          width: 40px;
          height: 40px;
          background: transparent;
          border: 1px solid rgba(74,16,28,.22);
        }

        /* Markets breathe instead of looking like a dense tag cloud. */
        .ito-onion-page .ito-markets {
          gap: 10px;
          margin-top: 42px;
        }

        .ito-onion-page .ito-market {
          padding: 10px 14px;
          background: transparent !important;
          border-color: rgba(74,16,28,.18);
        }

        /* Tables are separated from headings with deliberate whitespace. */
        .ito-onion-page .ito-table {
          margin-top: 30px;
          border: 1px solid rgba(74,16,28,.12);
          border-radius: 14px;
        }

        .ito-onion-page .ito-table th,
        .ito-onion-page .ito-table td {
          padding: 16px 18px;
        }

        .ito-onion-page .ito-sub-heading,
        .ito-onion-page .ito-crm-heading {
          margin-top: clamp(56px, 7vw, 92px);
          margin-bottom: 0;
        }

        .ito-onion-page .ito-quote-box {
          margin-top: 44px;
          border-radius: 14px;
          padding: 24px 26px;
        }

        /* Export section gets a more open 2-column editorial composition. */
        .ito-onion-page .ito-export-grid {
          gap: clamp(40px, 6vw, 88px);
        }

        .ito-onion-page .ito-export-workflow {
          gap: 0 42px;
        }

        .ito-onion-page .ito-export-step {
          min-height: 76px;
          padding: 15px 0;
        }

        .ito-onion-page .ito-export-docs {
          align-self: start;
          padding: 28px;
          border-radius: 18px;
        }

        /* FAQ: no card around the whole section, only simple dividers. */
        .ito-onion-page .ito-faq {
          max-width: 980px;
          margin-top: clamp(48px, 6vw, 78px);
          border-top: 1px solid var(--premium-rule);
        }

        .ito-onion-page .ito-faq-item {
          padding: 24px 0;
          border-top: 0;
          border-bottom: 1px solid var(--premium-rule);
        }

        .ito-onion-page .ito-faq-q {
          margin-bottom: 10px;
          font-size: 16px;
        }

        .ito-onion-page .ito-faq-a {
          max-width: 850px;
          line-height: 1.75;
        }

        /* Final CTA is intentionally spacious and not boxed. */
        .ito-onion-page .ito-cta-inner {
          grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr);
          gap: clamp(50px, 8vw, 120px);
          align-items: center;
        }

        .ito-onion-page .ito-cta-inner > div:first-child,
        .ito-onion-page .ito-cta-inner > div:last-child {
          padding: 0 !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }

        .ito-onion-page .ito-cta h2 {
          max-width: 850px;
          font-size: clamp(46px, 6.2vw, 88px);
          line-height: .94;
        }

        .ito-onion-page .ito-cta-image {
          max-width: 430px;
          margin: 0 0 26px auto;
          border-radius: 18px;
          object-fit: cover;
        }

        .ito-onion-page .ito-cta-copy {
          max-width: 520px;
          margin-left: auto;
          text-align: left;
          line-height: 1.75;
        }

        .ito-onion-page .ito-actions {
          margin-top: 30px;
          justify-content: flex-start;
        }

        /* Keep navigation and hero untouched in structure and behavior. */

        @media (max-width: 900px) {
          .ito-onion-page .ito-intro,
          .ito-onion-page .ito-cta-inner {
            grid-template-columns: 1fr;
            gap: 34px;
          }

          .ito-onion-page .ito-process {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-cta-image {
            margin-left: 0;
            margin-right: auto;
          }

          .ito-onion-page .ito-cta-copy {
            margin-left: 0;
          }
        }

        @media (max-width: 800px) {
          .ito-onion-page .ito-section {
            padding: var(--premium-section-y-small) 20px;
          }

          .ito-onion-page .ito-section-title {
            font-size: clamp(38px, 10vw, 58px);
            line-height: .96;
          }

          .ito-onion-page .ito-lead {
            font-size: 15px;
            line-height: 1.72;
          }

          .ito-onion-page .ito-spec-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .ito-onion-page .ito-spec,
          .ito-onion-page .ito-spec + .ito-spec {
            border: 1px solid var(--premium-rule);
            border-radius: 14px;
          }

          .ito-onion-page .ito-card,
          .ito-onion-page .ito-pack-card,
          .ito-onion-page .ito-persona-card,
          .ito-onion-page .ito-split-card {
            padding: 24px;
          }

          .ito-onion-page .ito-export-grid {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-export-workflow {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-actions {
            justify-content: center;
          }
        }

        @media (max-width: 560px) {
          .ito-onion-page .ito-section {
            padding: 64px 16px;
          }

          .ito-onion-page .ito-intro {
            gap: 24px;
          }

          .ito-onion-page .ito-eyebrow {
            margin-bottom: 12px;
          }

          .ito-onion-page .ito-section-title {
            font-size: clamp(34px, 11vw, 48px);
          }

          .ito-onion-page .ito-spec-grid {
            grid-template-columns: 1fr;
          }

          .ito-onion-page .ito-spec {
            min-height: auto;
            padding: 22px 20px;
          }

          .ito-onion-page .ito-card {
            min-height: auto;
          }

          .ito-onion-page .ito-card h3 {
            margin-top: 38px;
          }

          .ito-onion-page .ito-process-item {
            grid-template-columns: 44px 1fr;
            text-align: left;
          }

          .ito-onion-page .ito-cta h2 {
            font-size: clamp(38px, 11vw, 54px);
          }

          .ito-onion-page .ito-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .ito-onion-page .ito-actions .ito-button,
          .ito-onion-page .ito-actions a {
            width: 100%;
          }
        }


        /* ============================================================
           FINAL CONTRAST PATCH
           Burgundy sections must never use Burgundy as body/heading text.
           Light cards/tables inside dark sections keep their own readable
           Burgundy treatment.
           ============================================================ */

        .ito-onion-page .ito-section.ito-dark .ito-section-title,
        .ito-onion-page .ito-section.ito-dark .ito-section-heading,
        .ito-onion-page .ito-section.ito-dark .ito-crm-heading,
        .ito-onion-page .ito-section.ito-dark .ito-lead,
        .ito-onion-page .ito-section.ito-dark .ito-sub-heading,
        .ito-onion-page .ito-section.ito-dark .ito-faq-q,
        .ito-onion-page .ito-section.ito-dark .ito-faq-a,
        .ito-onion-page .ito-section.ito-dark .ito-process-item span,
        .ito-onion-page .ito-section.ito-dark .ito-process-control,
        .ito-onion-page .ito-section.ito-dark .ito-bullet-list li,
        .ito-onion-page .ito-section.ito-dark .ito-doc-note {
          color: var(--ivory) !important;
        }

        .ito-onion-page #international.ito-section.ito-dark .ito-lead {
          color: rgba(247,243,234,.90) !important;
        }

        .ito-onion-page .ito-section.ito-dark .ito-eyebrow,
        .ito-onion-page .ito-section.ito-dark .ito-process-stage {
          color: var(--gold) !important;
        }

        /* Light cards/tables inside dark sections keep dark text. */
        .ito-onion-page .ito-section.ito-dark .ito-card:not(.ito-card--dark) h3,
        .ito-onion-page .ito-section.ito-dark .ito-pack-card h3,
        .ito-onion-page .ito-section.ito-dark .ito-persona-card .buyer,
        .ito-onion-page .ito-section.ito-dark .ito-split-card h3,
        .ito-onion-page .ito-section.ito-dark .ito-table th {
          color: var(--burgundy) !important;
        }

        .ito-onion-page .ito-section.ito-dark .ito-card:not(.ito-card--dark) p,
        .ito-onion-page .ito-section.ito-dark .ito-pack-card p,
        .ito-onion-page .ito-section.ito-dark .ito-persona-card .need,
        .ito-onion-page .ito-section.ito-dark .ito-split-card p {
          color: rgba(34,33,31,.86) !important;
        }

        .ito-onion-page .ito-section.ito-dark .ito-export-docs {
          background: rgba(255,255,255,.07) !important;
          border-color: rgba(247,243,234,.18) !important;
        }

        .ito-onion-page .ito-section.ito-dark .ito-export-docs .ito-section-heading,
        .ito-onion-page .ito-section.ito-dark .ito-export-docs .ito-bullet-list li,
        .ito-onion-page .ito-section.ito-dark .ito-export-docs .ito-doc-note {
          color: var(--ivory) !important;
        }

        .ito-onion-page .ito-section.ito-dark .ito-quote-box--mt {
          color: var(--ivory) !important;
        }

        /* Size / market pills inside Burgundy sections need light text. */
        .ito-onion-page .ito-section.ito-dark .ito-market,
        .ito-onion-page .ito-section.ito-dark .ito-size-card {
          color: var(--ivory) !important;
          background: rgba(247,243,234,.08) !important;
          border-color: rgba(181,150,90,.34) !important;
        }

        .ito-onion-page .ito-section.ito-dark .ito-market:hover,
        .ito-onion-page .ito-section.ito-dark .ito-size-card:hover {
          color: var(--ivory) !important;
          background: rgba(181,150,90,.16) !important;
          border-color: rgba(181,150,90,.62) !important;
        }

</style>

      {/* HERO */}
      <section className="ito-hero" aria-label="Nashik onion hero">
        <div className="ito-hero-background" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.img
              key={heroIndex}
              src={HERO_IMAGES[heroIndex]}
              alt="Nashik red onion supply"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="ito-hero-image"
            />
          </AnimatePresence>

          <div className="ito-hero-overlay ito-hero-overlay-horizontal" />
          <div className="ito-hero-overlay ito-hero-overlay-bottom" />
        </div>

        <div className="ito-hero-inner">
          <motion.div
            className="ito-hero-text"
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.2,
            }}
          >
            <motion.div
              className="ito-hero-kicker"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <span className="ito-hero-kicker-dot" />
              <span>Domestic India · International Export · Bulk B2B Trade</span>
            </motion.div>

            <motion.h1
              className="ito-display ito-hero-title"
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            >
              <span className="ito-hero-title-line">Nashik Onions</span>
              <span className="ito-hero-title-line">for Domestic</span>
              <span className="ito-hero-title-line">&amp; Global Markets</span>
            </motion.h1>

            <motion.div
              className="ito-hero-accent-line"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ duration: 1, delay: 0.7, ease: "easeInOut" }}
            />

            <motion.p
              className="ito-hero-subtitle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Sourced with Precision. Graded to Specification. Delivered with Coordination.
            </motion.p>

            <motion.div
              className="ito-trust-line"
              role="list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <span role="listitem">Buyer-Defined Grades</span>
              <span role="listitem">Flexible Packaging</span>
              <span role="listitem">Documented Loading</span>
              <span role="listitem">Logistics Coordination</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* MARKET SPLIT */}
      <section className="ito-section ito-dark">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Market entry</div>
          <h2 className="ito-display ito-section-title">Choose Your Supply Route</h2>
          <p className="ito-lead ito-lead-burgundy">
            The page splits domestic and international visitors immediately because their buying questions, commercial terms, documentation and logistics are materially different.
          </p>

          <div className="ito-split-grid">
            <article className="ito-split-card">
              <h3>Domestic Supply</h3>
              <p>Bulk truckload supply for wholesalers, distributors, processors, institutional buyers and retail-chain suppliers across India. Quotations may be prepared on an Ex-Warehouse, FOR or delivered-to-destination basis.</p>
              <button
                className="ito-button"
                type="button"
                onClick={openRequirementBuilder}
              >
                Get Domestic Delivered Rate
              </button>
            </article>
            <article className="ito-split-card">
              <h3>International Export</h3>
              <p>Container-based supply for verified importers, wholesalers, distributors and food-service companies. Every export requirement is assessed against destination regulations, transit time, crop condition, packaging, buyer specifications and the selected Incoterm.</p>
              <a className="ito-button secondary" href="#international">Request Export SCO</a>
            </article>
          </div>
        </div>
      </section>

      {/* CORE VALUE PROPOSITION */}
      <section className="ito-section ito-core-value-section">
        <div className="ito-section-inner">
          <div className="ito-intro">
            <div>
              <div className="ito-eyebrow">One point of coordination</div>
              <h2 className="ito-display ito-section-title">From Nashik to Destination</h2>
            </div>
            <p className="ito-lead">
              Bulk onion procurement involves more than finding a market rate. Size consistency, crop condition, packing strength, bag weight, loading, documentation and transit planning can directly affect the buyer's outcome. India Trade Overseas coordinates these stages under one structured order process.
            </p>
          </div>

          <div className="ito-spec-grid">
            <div className="ito-spec">
              <strong>Sourcing</strong>
              <span>Nashik and approved nearby producing regions of Maharashtra</span>
            </div>
            <div className="ito-spec">
              <strong>Grading</strong>
              <span>Commercial, Standard Export or Premium Export selection</span>
            </div>
            <div className="ito-spec">
              <strong>Packing</strong>
              <span>Domestic 20–50 kg · Export 5–25 kg ventilated mesh</span>
            </div>
            <div className="ito-spec">
              <strong>Logistics</strong>
              <span>Truckload coordination or containerised export execution</span>
            </div>
          </div>
        </div>
      </section>

      {/* GRADE SELECTION */}
      <section className="ito-section ito-dark">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Grade selection</div>
          <h2 className="ito-display ito-section-title">Select the Grade Your Market Requires</h2>

          <div className="ito-grade-grid">
            {GRADES.map((grade, index) => (
              <article className="ito-spec ito-card ito-grade-card" key={grade.name}>
                <div className="ito-card-number">0{index + 1}</div>
                <h3>{grade.name}</h3>
                <p className="positioning">{grade.positioning}</p>
                <p>{grade.control}</p>
              </article>
            ))}
          </div>

          <div style={{ marginTop: 86 }}>
            <div className="ito-eyebrow">Size classifications</div>
            <div className="ito-markets" style={{ marginTop: 22 }}>
              {SIZES.map((size) => (
                <span className="ito-market ito-size-card" key={size}>{size}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEASONAL CROPS */}
      <section className="ito-section">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Seasonal crop categories</div>
          <h2 className="ito-display ito-section-title">Fresh Red Onions from Nashik</h2>
          <p className="ito-lead">
            Fresh red onions will be sourced from Nashik and approved nearby producing regions of Maharashtra. Each commercial offer must identify the crop, lot, grade, size, packaging and destination requirements.
          </p>

          <div className="ito-grade-grid">
            {CROPS.map((crop, index) => (
              <article className="ito-spec ito-card" key={crop.name}>
                <div className="ito-card-number">0{index + 1}</div>
                <h3>{crop.name}</h3>
                <p>{crop.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* MASTER SPECIFICATION */}
      <section className="ito-section ito-dark" id="specifications">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Master product specification</div>
          <h2 className="ito-display ito-section-title">Every Quotation Confirms These Fields</h2>
          <p className="ito-lead">
            Website content is indicative; the signed commercial document is authoritative.
          </p>

          <table className="ito-table alt ito-quality-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Required Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {SPEC_FIELDS.map((field, i) => (
                <tr key={i}>
                  <td>{field.label}</td>
                  <td>{field.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ito-quote-box ito-quote-box--alt">
            <strong>Mandatory quality rule:</strong> The website must never claim zero defects or guarantee a universal shelf life. Crop performance depends on season, curing, weather, handling, storage, temperature, humidity and transit conditions.
          </div>
        </div>
      </section>

      {/* PACKAGING */}
      <section className="ito-section ito-packaging-section" id="packaging">
        <div className="ito-section-inner">
          <div className="ito-intro">
            <div>
              <h2 className="ito-display ito-section-title">Packed for Domestic and Export Markets</h2>
              <div className="ito-eyebrow"></div>
            </div>
            <p className="ito-lead">
              Packaging must protect ventilation, maintain presentation and match the buyer's distribution model. Final net weight, bag tolerance, artwork and shipping marks must be confirmed before production.
            </p>
          </div>

          <div className="ito-packaging">
            <article className="ito-pack-card">
              <small>Domestic India</small>
              <h3>Standard Options</h3>
              <ul className="ito-bullet-list">
                {PACKAGING.domestic.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              <p className="ito-pack-note">
                Buyer-branded bags and institutional pack sizes available
              </p>
            </article>
            <article className="ito-pack-card">
              <small>International Export</small>
              <h3>Standard Options</h3>
              <ul className="ito-bullet-list">
                {PACKAGING.international.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              <p className="ito-pack-note">
                Private label, product labels, barcodes and destination shipping marks
              </p>
            </article>
          </div>

          <div className="ito-quote-box" style={{ marginTop: 32 }}>
            <strong>Packaging control checklist:</strong> Correct net-weight target and written weight tolerance · Adequate ventilation and appropriate bag strength · Secure closure or stitching and accurate bag count · Product, lot and country-of-origin identification where required · Buyer-approved artwork before printing private-label material · Destination-specific markings verified before dispatch
          </div>

          <p className="ito-disclaimer">
            <strong>Product disclaimer:</strong> Colour, skin, firmness, pungency, moisture, shelf life and storage performance vary by crop, season, weather, producing area, curing, storage and individual lot. Final supply is governed by the written specification.
          </p>
        </div>
      </section>

      {/* DOMESTIC TRADE */}
      <section className="ito-section" id="domestic">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Domestic trade</div>
          <h2 className="ito-display ito-section-title">Domestic Supply Operating Model</h2>
          <p className="ito-lead">
            Domestic orders can be offered under an Ex-Warehouse, FOR or delivered-to-destination structure, or through a recurring weekly or monthly supply programme.
          </p>

          <div className="ito-process">
            {[
              "Receive and verify the buyer's company details and requirement",
              "Confirm size, grade, tolerance, packaging, quantity and destination",
              "Check suitable lots and share applicable photographs, video or inspection information",
              "Issue a formal quotation or Proforma Invoice with validity and exclusions",
              "Secure written acceptance and agreed payment terms",
              "Complete procurement, grading, packing and vehicle coordination",
              "Issue dispatch documents, track transit and collect delivery acknowledgement",
              "Schedule the next requirement for recurring buyers",
            ].map((step, i) => (
              <div className="ito-process-item" key={i}>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <table className="ito-table">
            <thead>
              <tr>
                <th>Cost Component</th>
                <th>Quotation Requirement</th>
              </tr>
            </thead>
            <tbody>
              {DOMESTIC_COST_COMPONENTS.map((item, i) => (
                <tr key={i}>
                  <td>{item.component}</td>
                  <td>{item.requirement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* INTERNATIONAL TRADE */}
      <section className="ito-section ito-dark" id="international">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">International trade</div>
          <h2 className="ito-display ito-section-title">Export Operating Model</h2>
          <p className="ito-lead">
            Export quotations may be structured under EXW, FCA, FOB, CFR or CIF, subject to destination feasibility and mutual agreement. The named place or port, included costs, risk point, document responsibility and applicable Incoterms version must be stated.
          </p>

          <div className="ito-export-grid">
            <div className="ito-export-column">
              <h3 className="ito-section-heading">Export Workflow</h3>
              <div className="ito-export-workflow">
                {EXPORT_WORKFLOW.map((item, i) => (
                  <div key={i} className="ito-export-step">
                    <span className="ito-process-stage">{item.stage}</span>
                    <span className="ito-process-control">{item.control}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ito-export-column ito-export-docs">
              <h3 className="ito-section-heading">Export Documentation</h3>
              <ul className="ito-bullet-list ito-bullet-list--alt">
                {EXPORT_DOCS.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
              <p className="ito-doc-note">
                No document should be promised unless it is applicable, obtainable, contractually included and compatible with the destination-country requirement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* QUALITY ASSURANCE */}
      <section className="ito-section" id="quality">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Operations</div>
          <h2 className="ito-display ito-section-title">Quality Assurance, Storage and Logistics</h2>
          <p className="ito-lead">
            The operating system must protect the buyer-approved specification at each handoff — lot selection, grading, packing, loading, transport and documentation.
          </p>

          <h3 className="ito-sub-heading">
            Five-Stage Quality Protocol
          </h3>
          <table className="ito-table ito-table--mt">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Checks</th>
              </tr>
            </thead>
            <tbody>
              {QUALITY_STAGES.map((item, i) => (
                <tr key={i}>
                  <td><strong>{item.stage}</strong></td>
                  <td>{item.checks}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ito-split-grid ito-split-grid--mt">
            <article className="ito-split-card">
              <h3>Storage and Handling</h3>
              <ul className="ito-bullet-list">
                <li>Use dry, clean and ventilated storage protected from rain and standing water</li>
                <li>Avoid excessive stacking pressure and unnecessary handling</li>
                <li>Separate wet, damaged or decayed bulbs and monitor stock condition</li>
                <li>Apply first-in, first-out movement and plan dispatch against crop condition</li>
                <li>Assess storage suitability against curing, humidity, temperature and expected holding period</li>
              </ul>
            </article>
            <article className="ito-split-card">
              <h3>Logistics Controls</h3>
              <ul className="ito-bullet-list">
                <li><strong>Domestic:</strong> Truck selection, freight, route, loading point, driver details, tracking and proof of delivery</li>
                <li><strong>Export:</strong> Container availability and condition, vessel cutoff, customs, loading pattern, seal, Bill of Lading and arrival updates</li>
                <li>Do not guarantee a fixed payload before confirming bag size, product density, container type, legal payload and carrier rules</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* BUYER PERSONAS */}
      <section className="ito-section ito-dark">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Buyer personas</div>
          <h2 className="ito-display ito-section-title">Buyer Segments and Calls to Action</h2>
          <p className="ito-lead">
            The page must address the primary need of each buyer segment with a specific conversion CTA.
          </p>

          <div className="ito-persona-grid">
            {BUYER_PERSONAS.map((persona, i) => (
              <article className="ito-persona-card" key={i}>
                <div className="buyer">{persona.buyer}</div>
                <div className="need">{persona.need}</div>
                <div className="cta">{persona.cta}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="ito-section" id="process">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Process</div>
          <h2 className="ito-display ito-section-title">A Clear Process from Enquiry to Delivery</h2>

          <div className="ito-process">
            {PROCESS_STEPS.map((step, i) => (
              <div className="ito-process-item" key={i}>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="ito-quote-box ito-quote-box--mt">
            <strong>Long-term supply programme:</strong> Qualified buyers requiring weekly, monthly or seasonal supply can request a structured programme covering volume forecasts, specifications, packing, delivery calendar, price review, documentation and performance review.
          </div>

          <p className="ito-market-notice ">
            <strong>Market-price notice:</strong> Onion prices can change according to crop arrivals, quality, size, weather, demand, packaging, labour, transport, port charges, freight and government regulations. Every quotation carries a defined validity period. An enquiry does not lock price or confirm stock.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="ito-section ito-dark" id="faq">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Objection handling</div>
          <h2 className="ito-display ito-section-title">Buyer Questions and Objection Handling</h2>

          <div className="ito-faq">
            {FAQS.map((faq, i) => (
              <div className="ito-faq-item" key={i}>
                <div className="ito-faq-q">Q. {faq.q}</div>
                <div className="ito-faq-a">A. {faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ito-section ito-cta">
        <div className="ito-section-inner ito-cta-inner">
          <div>
            <div className="ito-eyebrow">Final conversion</div>
            <h2 className="ito-display">Share Your Requirement. Receive a Commercial Supply Plan.</h2>
          </div>

          <div>
            <img src="/images/onion_image.png" alt="Nashik onions" className="ito-cta-image" />
            <p className="ito-cta-copy ito-cta-copy-burgundy">
              Tell us the quantity, size, grade, packaging and destination. Our commercial team will check availability, logistics and applicable terms before preparing the offer.
            </p>
            <div className="ito-actions">
              <button
                className="ito-button"
                type="button"
                onClick={openRequirementBuilder}
              >
                Request Bulk Quote
              </button>
              <a className="ito-button secondary" href="#rfq">Request Export SCO</a>
              <a
                className="ito-button secondary ito-whatsapp-button"
                href="https://wa.me/9973218366?text=Hello%20India%20Trade%20Overseas.%20I%20need%20bulk%20onion%20supply.%20Please%20share%20availability%20and%20quotation%20requirements."
                target="_blank"
                rel="noopener noreferrer"
              >
                <IoLogoWhatsapp className="ito-whatsapp-icon" aria-hidden="true" />
                <span>Chat with Export Sales</span>
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* ONION REQUIREMENT BUILDER */}
      <OnionRequirementBuilder
        isOpen={showRequirementBuilder}
        onClose={() => setShowRequirementBuilder(false)}
        onComplete={handleRequirementComplete}
      />

      {/* PERSONAL DETAILS */}
      <AnimatePresence>
        {showPersonalDetails && (
          <motion.div
            className="ito-onion-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !submittingPersonalDetails) {
                setShowPersonalDetails(false);
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="ito-onion-personal-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="onion-personal-details-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="ito-onion-personal-header">
                <div>
                  <small>Step 2 · Buyer details</small>
                  <h2 id="onion-personal-details-title">Tell us who is buying.</h2>
                </div>

                <button
                  type="button"
                  className="ito-onion-modal-close"
                  aria-label="Close"
                  disabled={submittingPersonalDetails}
                  onClick={() => setShowPersonalDetails(false)}
                >
                  ×
                </button>
              </div>

              <form
                className="ito-onion-personal-body"
                onSubmit={handlePersonalDetailsSubmit}
              >
                {builtRequirement && (
                  <div className="ito-onion-requirement-summary">
                    <div>
                      <span>Trade</span>
                      <strong>{builtRequirement.tradeType === "EXPORT" ? "International Export" : "Domestic India"}</strong>
                    </div>
                    <div>
                      <span>Size</span>
                      <strong>{builtRequirement.size}</strong>
                    </div>
                    <div>
                      <span>Grade</span>
                      <strong>{builtRequirement.grade}</strong>
                    </div>
                    <div>
                      <span>Quantity</span>
                      <strong>
                        {Number(builtRequirement.quantityKg || 0).toLocaleString("en-IN")} kg
                      </strong>
                    </div>
                    <div>
                      <span>Packaging</span>
                      <strong>{builtRequirement.packaging}</strong>
                    </div>
                    <div>
                      <span>Destination</span>
                      <strong>{builtRequirement.destination}</strong>
                    </div>
                  </div>
                )}

                <div className="ito-onion-form-grid">
                  <div className="ito-onion-field full">
                    <label htmlFor="onion-full-name">Full Name</label>
                    <input
                      id="onion-full-name"
                      type="text"
                      autoComplete="name"
                      value={personalDetails.fullName}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          fullName: event.target.value,
                        }))
                      }
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="ito-onion-field">
                    <label htmlFor="onion-email">Business Email</label>
                    <input
                      id="onion-email"
                      type="email"
                      autoComplete="email"
                      value={personalDetails.email}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                      placeholder="you@company.com"
                      required
                    />
                  </div>

                  <div className="ito-onion-field">
                    <label htmlFor="onion-mobile">Mobile Number</label>
                    <input
                      id="onion-mobile"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={personalDetails.mobile}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          mobile: event.target.value,
                        }))
                      }
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>

                  <div className="ito-onion-field">
                    <label htmlFor="onion-city">City</label>
                    <input
                      id="onion-city"
                      type="text"
                      autoComplete="address-level2"
                      value={personalDetails.city}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          city: event.target.value,
                        }))
                      }
                      placeholder="City"
                      required
                    />
                  </div>

                  <div className="ito-onion-field">
                    <label htmlFor="onion-state">State / Province</label>
                    <input
                      id="onion-state"
                      type="text"
                      autoComplete="address-level1"
                      value={personalDetails.state}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          state: event.target.value,
                        }))
                      }
                      placeholder="State / Province"
                      required
                    />
                  </div>

                  <div className="ito-onion-field full">
                    <label htmlFor="onion-timeline">Required Timeline</label>
                    <input
                      id="onion-timeline"
                      type="text"
                      value={personalDetails.targetTimeline}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          targetTimeline: event.target.value,
                        }))
                      }
                      placeholder="e.g. Immediate, 7 days, 15 days"
                      required
                    />
                  </div>
                </div>

                <p className="ito-onion-form-note">
                  Your requirement will be validated by the server before the pricing page is opened. No OTP is required for this Onion purchase flow.
                </p>

                <div className="ito-onion-form-actions">
                  <button
                    type="button"
                    className="ito-button secondary"
                    disabled={submittingPersonalDetails}
                    onClick={() => {
                      setShowPersonalDetails(false);
                      setShowRequirementBuilder(true);
                    }}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    className="ito-button"
                    disabled={submittingPersonalDetails}
                  >
                    {submittingPersonalDetails ? "Saving Requirement…" : "Continue to Pricing"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DAILY DOMESTIC / EXPORT ONION RATE CHART */}
      <AnimatePresence>
        {showRateChart && (
          <motion.div
            className="ito-rate-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowRateChart(false);
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="ito-rate-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="onion-rate-chart-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="ito-rate-modal-header">
                <div>
                  <div className="ito-rate-modal-kicker">Prakriti by India Trade Overseas</div>
                  <h2 id="onion-rate-chart-title">Daily Onion Rate Chart</h2>
                  <div className="ito-rate-modal-date">
                    Fresh Fruits &amp; Vegetables Supply &amp; Export · {ONION_RATE_CHART.date}
                  </div>
                </div>

                <button
                  type="button"
                  className="ito-rate-modal-close"
                  aria-label="Close onion rate chart"
                  onClick={() => setShowRateChart(false)}
                >
                  ×
                </button>
              </div>

              <div className="ito-rate-modal-body">
                <div className="ito-rate-intro">
                  <span className="ito-rate-pill">🧅 {ONION_RATE_CHART.product}</span>
                  <span className="ito-rate-pill">🌱 {ONION_RATE_CHART.variety}</span>
                  <span className="ito-rate-pill">🚢 Export Quality · Ex. Godown Price</span>
                </div>

                <h3 className="ito-rate-section-title">Domestic Quality</h3>
                <div className="ito-rate-table-wrap">
                  <table className="ito-rate-table">
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>Rate / KG</th>
                        <th>Packing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ONION_RATE_CHART.domestic.map((item) => (
                        <tr key={item.size}>
                          <td><strong>{item.size}</strong></td>
                          <td className="ito-rate-price">{item.rate}</td>
                          <td>{ONION_RATE_CHART.domesticPacking}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ito-domestic-highlight">
                  <strong>🚚 Transportation:</strong> {ONION_RATE_CHART.transport}
                </div>

                <h3 className="ito-rate-section-title">Export Quality — Ex. Godown Price</h3>
                <div className="ito-rate-table-wrap">
                  <table className="ito-rate-table">
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th>Size</th>
                        <th>Rate / KG</th>
                        <th>Packing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ONION_RATE_CHART.export.map((item) => (
                        <tr key={item.market}>
                          <td><strong>{item.market}</strong></td>
                          <td>{item.size}</td>
                          <td className="ito-rate-price">{item.rate}</td>
                          <td>{item.packing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ito-rate-notes">
                  <div className="ito-rate-note">
                    <span>JNPT Transportation</span>
                    <strong>{ONION_RATE_CHART.jnpt}</strong>
                  </div>
                  <div className="ito-rate-note">
                    <span>Domestic Packing</span>
                    <strong>{ONION_RATE_CHART.domesticPacking}</strong>
                  </div>
                  <div className="ito-rate-note">
                    <span>Rate Date</span>
                    <strong>{ONION_RATE_CHART.date}</strong>
                  </div>
                </div>

                <p className="ito-rate-disclaimer">
                  Rates shown are the supplied rate chart for 22/09/2026. Transportation and
                  final commercial terms are subject to the applicable destination, quantity,
                  logistics and confirmation at the time of order.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

        /* ============================================================
           FINAL HEADING ALIGNMENT
           - Center all section eyebrow headings
           - Remove the decorative line on the left
           - Applies consistently across desktop and mobile
           - Hero structure / backend logic untouched
           ============================================================ */
        .ito-onion-page .ito-eyebrow {
          width: 100%;
          display: flex !important;
          align-items: center;
          justify-content: center !important;
          gap: 0 !important;
          margin-left: auto !important;
          margin-right: auto !important;
          text-align: center !important;
        }

        .ito-onion-page .ito-eyebrow::before {
          display: none !important;
          content: none !important;
        }

      
        /* FINAL: all section labels are centered, with no decorative left line. */
        .ito-onion-page .ito-eyebrow {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
          text-align: center !important;
        }

        .ito-onion-page .ito-eyebrow::before,
        .ito-onion-page .ito-eyebrow::after {
          content: none !important;
          display: none !important;
        }

      
        /* FINAL: only Commercial / Standard Export / Premium Export boxes. */
        .ito-onion-page .ito-grade-grid .ito-card {
          background: #FFFFFF !important;
        }

      
        /* FINAL: give section headings clear breathing room before the lead text. */
        .ito-onion-page .ito-section-title {
          margin-bottom: 28px !important;
        }

        @media (max-width: 800px) {
          .ito-onion-page .ito-section-title {
            margin-bottom: 22px !important;
          }
        }

      `}</style>

      {/* HERO */}
      <section className="ito-hero" aria-label="Nashik onion hero">
        <div className="ito-hero-background" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.img
              key={heroIndex}
              src={HERO_IMAGES[heroIndex]}
              alt="Nashik red onion supply"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="ito-hero-image"
            />
          </AnimatePresence>

          <div className="ito-hero-overlay ito-hero-overlay-horizontal" />
          <div className="ito-hero-overlay ito-hero-overlay-bottom" />
        </div>

        <div className="ito-hero-inner">
          <motion.div
            className="ito-hero-text"
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.2,
            }}
          >
            <motion.div
              className="ito-hero-kicker"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <span className="ito-hero-kicker-dot" />
              <span>Domestic India · International Export · Bulk B2B Trade</span>
            </motion.div>

            <motion.h1
              className="ito-display ito-hero-title"
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            >
              <span className="ito-hero-title-line">Nashik Onions</span>
              <span className="ito-hero-title-line">for Domestic</span>
              <span className="ito-hero-title-line">&amp; Global Markets</span>
            </motion.h1>

            <motion.div
              className="ito-hero-accent-line"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ duration: 1, delay: 0.7, ease: "easeInOut" }}
            />

            <motion.p
              className="ito-hero-subtitle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Sourced with Precision. Graded to Specification. Delivered with Coordination.
            </motion.p>

            <motion.div
              className="ito-trust-line"
              role="list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <span role="listitem">Buyer-Defined Grades</span>
              <span role="listitem">Flexible Packaging</span>
              <span role="listitem">Documented Loading</span>
              <span role="listitem">Logistics Coordination</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* MARKET SPLIT */}
      <section className="ito-section ito-dark">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Market entry</div>
          <h2 className="ito-display ito-section-title">Choose Your Supply Route</h2>
          <p className="ito-lead ito-lead-burgundy">
            The page splits domestic and international visitors immediately because their buying questions, commercial terms, documentation and logistics are materially different.
          </p>

          <div className="ito-split-grid">
            <article className="ito-split-card">
              <h3>Domestic Supply</h3>
              <p>Bulk truckload supply for wholesalers, distributors, processors, institutional buyers and retail-chain suppliers across India. Quotations may be prepared on an Ex-Warehouse, FOR or delivered-to-destination basis.</p>
              <button
                className="ito-button"
                type="button"
                onClick={openRequirementBuilder}
              >
                Get Domestic Delivered Rate
              </button>
            </article>
            <article className="ito-split-card">
              <h3>International Export</h3>
              <p>Container-based supply for verified importers, wholesalers, distributors and food-service companies. Every export requirement is assessed against destination regulations, transit time, crop condition, packaging, buyer specifications and the selected Incoterm.</p>
              <a className="ito-button secondary" href="#international">Request Export SCO</a>
            </article>
          </div>
        </div>
      </section>

      {/* CORE VALUE PROPOSITION */}
      <section className="ito-section ito-core-value-section">
        <div className="ito-section-inner">
          <div className="ito-intro">
            <div>
              <div className="ito-eyebrow">One point of coordination</div>
              <h2 className="ito-display ito-section-title">From Nashik to Destination</h2>
            </div>
            <p className="ito-lead">
              Bulk onion procurement involves more than finding a market rate. Size consistency, crop condition, packing strength, bag weight, loading, documentation and transit planning can directly affect the buyer's outcome. India Trade Overseas coordinates these stages under one structured order process.
            </p>
          </div>

          <div className="ito-spec-grid">
            <div className="ito-spec">
              <strong>Sourcing</strong>
              <span>Nashik and approved nearby producing regions of Maharashtra</span>
            </div>
            <div className="ito-spec">
              <strong>Grading</strong>
              <span>Commercial, Standard Export or Premium Export selection</span>
            </div>
            <div className="ito-spec">
              <strong>Packing</strong>
              <span>Domestic 20–50 kg · Export 5–25 kg ventilated mesh</span>
            </div>
            <div className="ito-spec">
              <strong>Logistics</strong>
              <span>Truckload coordination or containerised export execution</span>
            </div>
          </div>
        </div>
      </section>

      {/* GRADE SELECTION */}
      <section className="ito-section ito-dark">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Grade selection</div>
          <h2 className="ito-display ito-section-title">Select the Grade Your Market Requires</h2>

          <div className="ito-grade-grid">
            {GRADES.map((grade, index) => (
              <article className="ito-spec ito-card ito-grade-card" key={grade.name}>
                <div className="ito-card-number">0{index + 1}</div>
                <h3>{grade.name}</h3>
                <p className="positioning">{grade.positioning}</p>
                <p>{grade.control}</p>
              </article>
            ))}
          </div>

          <div style={{ marginTop: 86 }}>
            <div className="ito-eyebrow">Size classifications</div>
            <div className="ito-markets" style={{ marginTop: 22 }}>
              {SIZES.map((size) => (
                <span className="ito-market ito-size-card" key={size}>{size}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEASONAL CROPS */}
      <section className="ito-section">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Seasonal crop categories</div>
          <h2 className="ito-display ito-section-title">Fresh Red Onions from Nashik</h2>
          <p className="ito-lead">
            Fresh red onions will be sourced from Nashik and approved nearby producing regions of Maharashtra. Each commercial offer must identify the crop, lot, grade, size, packaging and destination requirements.
          </p>

          <div className="ito-grade-grid">
            {CROPS.map((crop, index) => (
              <article className="ito-spec ito-card" key={crop.name}>
                <div className="ito-card-number">0{index + 1}</div>
                <h3>{crop.name}</h3>
                <p>{crop.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* MASTER SPECIFICATION */}
      <section className="ito-section ito-dark" id="specifications">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Master product specification</div>
          <h2 className="ito-display ito-section-title">Every Quotation Confirms These Fields</h2>
          <p className="ito-lead">
            Website content is indicative; the signed commercial document is authoritative.
          </p>

          <table className="ito-table alt ito-quality-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Required Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {SPEC_FIELDS.map((field, i) => (
                <tr key={i}>
                  <td>{field.label}</td>
                  <td>{field.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ito-quote-box ito-quote-box--alt">
            <strong>Mandatory quality rule:</strong> The website must never claim zero defects or guarantee a universal shelf life. Crop performance depends on season, curing, weather, handling, storage, temperature, humidity and transit conditions.
          </div>
        </div>
      </section>

      {/* PACKAGING */}
      <section className="ito-section ito-packaging-section" id="packaging">
        <div className="ito-section-inner">
          <div className="ito-intro">
            <div>
              <h2 className="ito-display ito-section-title">Packed for Domestic and Export Markets</h2>
              <div className="ito-eyebrow">Packaging</div>
            </div>
            <p className="ito-lead">
              Packaging must protect ventilation, maintain presentation and match the buyer's distribution model. Final net weight, bag tolerance, artwork and shipping marks must be confirmed before production.
            </p>
          </div>

          <div className="ito-packaging">
            <article className="ito-pack-card">
              <small>Domestic India</small>
              <h3>Standard Options</h3>
              <ul className="ito-bullet-list">
                {PACKAGING.domestic.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              <p className="ito-pack-note">
                Buyer-branded bags and institutional pack sizes available
              </p>
            </article>
            <article className="ito-pack-card">
              <small>International Export</small>
              <h3>Standard Options</h3>
              <ul className="ito-bullet-list">
                {PACKAGING.international.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              <p className="ito-pack-note">
                Private label, product labels, barcodes and destination shipping marks
              </p>
            </article>
          </div>

          <div className="ito-quote-box" style={{ marginTop: 32 }}>
            <strong>Packaging control checklist:</strong> Correct net-weight target and written weight tolerance · Adequate ventilation and appropriate bag strength · Secure closure or stitching and accurate bag count · Product, lot and country-of-origin identification where required · Buyer-approved artwork before printing private-label material · Destination-specific markings verified before dispatch
          </div>

          <p className="ito-disclaimer">
            <strong>Product disclaimer:</strong> Colour, skin, firmness, pungency, moisture, shelf life and storage performance vary by crop, season, weather, producing area, curing, storage and individual lot. Final supply is governed by the written specification.
          </p>
        </div>
      </section>

      {/* DOMESTIC TRADE */}
      <section className="ito-section" id="domestic">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Domestic trade</div>
          <h2 className="ito-display ito-section-title">Domestic Supply Operating Model</h2>
          <p className="ito-lead">
            Domestic orders can be offered under an Ex-Warehouse, FOR or delivered-to-destination structure, or through a recurring weekly or monthly supply programme.
          </p>

          <div className="ito-process">
            {[
              "Receive and verify the buyer's company details and requirement",
              "Confirm size, grade, tolerance, packaging, quantity and destination",
              "Check suitable lots and share applicable photographs, video or inspection information",
              "Issue a formal quotation or Proforma Invoice with validity and exclusions",
              "Secure written acceptance and agreed payment terms",
              "Complete procurement, grading, packing and vehicle coordination",
              "Issue dispatch documents, track transit and collect delivery acknowledgement",
              "Schedule the next requirement for recurring buyers",
            ].map((step, i) => (
              <div className="ito-process-item" key={i}>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <table className="ito-table">
            <thead>
              <tr>
                <th>Cost Component</th>
                <th>Quotation Requirement</th>
              </tr>
            </thead>
            <tbody>
              {DOMESTIC_COST_COMPONENTS.map((item, i) => (
                <tr key={i}>
                  <td>{item.component}</td>
                  <td>{item.requirement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* INTERNATIONAL TRADE */}
      <section className="ito-section ito-dark" id="international">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">International trade</div>
          <h2 className="ito-display ito-section-title">Export Operating Model</h2>
          <p className="ito-lead">
            Export quotations may be structured under EXW, FCA, FOB, CFR or CIF, subject to destination feasibility and mutual agreement. The named place or port, included costs, risk point, document responsibility and applicable Incoterms version must be stated.
          </p>

          <div className="ito-export-grid">
            <div className="ito-export-column">
              <h3 className="ito-section-heading">Export Workflow</h3>
              <div className="ito-export-workflow">
                {EXPORT_WORKFLOW.map((item, i) => (
                  <div key={i} className="ito-export-step">
                    <span className="ito-process-stage">{item.stage}</span>
                    <span className="ito-process-control">{item.control}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ito-export-column ito-export-docs">
              <h3 className="ito-section-heading">Export Documentation</h3>
              <ul className="ito-bullet-list ito-bullet-list--alt">
                {EXPORT_DOCS.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
              <p className="ito-doc-note">
                No document should be promised unless it is applicable, obtainable, contractually included and compatible with the destination-country requirement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* QUALITY ASSURANCE */}
      <section className="ito-section" id="quality">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Operations</div>
          <h2 className="ito-display ito-section-title">Quality Assurance, Storage and Logistics</h2>
          <p className="ito-lead">
            The operating system must protect the buyer-approved specification at each handoff — lot selection, grading, packing, loading, transport and documentation.
          </p>

          <h3 className="ito-sub-heading">
            Five-Stage Quality Protocol
          </h3>
          <table className="ito-table ito-table--mt">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Checks</th>
              </tr>
            </thead>
            <tbody>
              {QUALITY_STAGES.map((item, i) => (
                <tr key={i}>
                  <td><strong>{item.stage}</strong></td>
                  <td>{item.checks}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ito-split-grid ito-split-grid--mt">
            <article className="ito-split-card">
              <h3>Storage and Handling</h3>
              <ul className="ito-bullet-list">
                <li>Use dry, clean and ventilated storage protected from rain and standing water</li>
                <li>Avoid excessive stacking pressure and unnecessary handling</li>
                <li>Separate wet, damaged or decayed bulbs and monitor stock condition</li>
                <li>Apply first-in, first-out movement and plan dispatch against crop condition</li>
                <li>Assess storage suitability against curing, humidity, temperature and expected holding period</li>
              </ul>
            </article>
            <article className="ito-split-card">
              <h3>Logistics Controls</h3>
              <ul className="ito-bullet-list">
                <li><strong>Domestic:</strong> Truck selection, freight, route, loading point, driver details, tracking and proof of delivery</li>
                <li><strong>Export:</strong> Container availability and condition, vessel cutoff, customs, loading pattern, seal, Bill of Lading and arrival updates</li>
                <li>Do not guarantee a fixed payload before confirming bag size, product density, container type, legal payload and carrier rules</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* BUYER PERSONAS */}
      <section className="ito-section ito-dark">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Buyer personas</div>
          <h2 className="ito-display ito-section-title">Buyer Segments and Calls to Action</h2>
          <p className="ito-lead">
            The page must address the primary need of each buyer segment with a specific conversion CTA.
          </p>

          <div className="ito-persona-grid">
            {BUYER_PERSONAS.map((persona, i) => (
              <article className="ito-persona-card" key={i}>
                <div className="buyer">{persona.buyer}</div>
                <div className="need">{persona.need}</div>
                <div className="cta">{persona.cta}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="ito-section" id="process">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Process</div>
          <h2 className="ito-display ito-section-title">A Clear Process from Enquiry to Delivery</h2>

          <div className="ito-process">
            {PROCESS_STEPS.map((step, i) => (
              <div className="ito-process-item" key={i}>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="ito-quote-box ito-quote-box--mt">
            <strong>Long-term supply programme:</strong> Qualified buyers requiring weekly, monthly or seasonal supply can request a structured programme covering volume forecasts, specifications, packing, delivery calendar, price review, documentation and performance review.
          </div>

          <p className="ito-market-notice ">
            <strong>Market-price notice:</strong> Onion prices can change according to crop arrivals, quality, size, weather, demand, packaging, labour, transport, port charges, freight and government regulations. Every quotation carries a defined validity period. An enquiry does not lock price or confirm stock.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="ito-section ito-dark" id="faq">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Objection handling</div>
          <h2 className="ito-display ito-section-title">Buyer Questions and Objection Handling</h2>

          <div className="ito-faq">
            {FAQS.map((faq, i) => (
              <div className="ito-faq-item" key={i}>
                <div className="ito-faq-q">Q. {faq.q}</div>
                <div className="ito-faq-a">A. {faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ito-section ito-cta">
        <div className="ito-section-inner ito-cta-inner">
          <div>
            <div className="ito-eyebrow">Final conversion</div>
            <h2 className="ito-display">Share Your Requirement. Receive a Commercial Supply Plan.</h2>
          </div>

          <div>
            <img src="/images/onion_image.png" alt="Nashik onions" className="ito-cta-image" />
            <p className="ito-cta-copy ito-cta-copy-burgundy">
              Tell us the quantity, size, grade, packaging and destination. Our commercial team will check availability, logistics and applicable terms before preparing the offer.
            </p>
            <div className="ito-actions">
              <button
                className="ito-button"
                type="button"
                onClick={openRequirementBuilder}
              >
                Request Bulk Quote
              </button>
              <a className="ito-button secondary" href="#rfq">Request Export SCO</a>
              <a
                className="ito-button secondary ito-whatsapp-button"
                href="https://wa.me/9973218366?text=Hello%20India%20Trade%20Overseas.%20I%20need%20bulk%20onion%20supply.%20Please%20share%20availability%20and%20quotation%20requirements."
                target="_blank"
                rel="noopener noreferrer"
              >
                <IoLogoWhatsapp className="ito-whatsapp-icon" aria-hidden="true" />
                <span>Chat with Export Sales</span>
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* ONION REQUIREMENT BUILDER */}
      <OnionRequirementBuilder
        isOpen={showRequirementBuilder}
        onClose={() => setShowRequirementBuilder(false)}
        onComplete={handleRequirementComplete}
      />

      {/* PERSONAL DETAILS */}
      <AnimatePresence>
        {showPersonalDetails && (
          <motion.div
            className="ito-onion-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !submittingPersonalDetails) {
                setShowPersonalDetails(false);
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="ito-onion-personal-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="onion-personal-details-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="ito-onion-personal-header">
                <div>
                  <small>Step 2 · Buyer details</small>
                  <h2 id="onion-personal-details-title">Tell us who is buying.</h2>
                </div>

                <button
                  type="button"
                  className="ito-onion-modal-close"
                  aria-label="Close"
                  disabled={submittingPersonalDetails}
                  onClick={() => setShowPersonalDetails(false)}
                >
                  ×
                </button>
              </div>

              <form
                className="ito-onion-personal-body"
                onSubmit={handlePersonalDetailsSubmit}
              >
                {builtRequirement && (
                  <div className="ito-onion-requirement-summary">
                    <div>
                      <span>Trade</span>
                      <strong>{builtRequirement.tradeType === "EXPORT" ? "International Export" : "Domestic India"}</strong>
                    </div>
                    <div>
                      <span>Size</span>
                      <strong>{builtRequirement.size}</strong>
                    </div>
                    <div>
                      <span>Grade</span>
                      <strong>{builtRequirement.grade}</strong>
                    </div>
                    <div>
                      <span>Quantity</span>
                      <strong>
                        {Number(builtRequirement.quantityKg || 0).toLocaleString("en-IN")} kg
                      </strong>
                    </div>
                    <div>
                      <span>Packaging</span>
                      <strong>{builtRequirement.packaging}</strong>
                    </div>
                    <div>
                      <span>Destination</span>
                      <strong>{builtRequirement.destination}</strong>
                    </div>
                  </div>
                )}

                <div className="ito-onion-form-grid">
                  <div className="ito-onion-field full">
                    <label htmlFor="onion-full-name">Full Name</label>
                    <input
                      id="onion-full-name"
                      type="text"
                      autoComplete="name"
                      value={personalDetails.fullName}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          fullName: event.target.value,
                        }))
                      }
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="ito-onion-field">
                    <label htmlFor="onion-email">Business Email</label>
                    <input
                      id="onion-email"
                      type="email"
                      autoComplete="email"
                      value={personalDetails.email}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                      placeholder="you@company.com"
                      required
                    />
                  </div>

                  <div className="ito-onion-field">
                    <label htmlFor="onion-mobile">Mobile Number</label>
                    <input
                      id="onion-mobile"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={personalDetails.mobile}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          mobile: event.target.value,
                        }))
                      }
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>

                  <div className="ito-onion-field">
                    <label htmlFor="onion-city">City</label>
                    <input
                      id="onion-city"
                      type="text"
                      autoComplete="address-level2"
                      value={personalDetails.city}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          city: event.target.value,
                        }))
                      }
                      placeholder="City"
                      required
                    />
                  </div>

                  <div className="ito-onion-field">
                    <label htmlFor="onion-state">State / Province</label>
                    <input
                      id="onion-state"
                      type="text"
                      autoComplete="address-level1"
                      value={personalDetails.state}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          state: event.target.value,
                        }))
                      }
                      placeholder="State / Province"
                      required
                    />
                  </div>

                  <div className="ito-onion-field full">
                    <label htmlFor="onion-timeline">Required Timeline</label>
                    <input
                      id="onion-timeline"
                      type="text"
                      value={personalDetails.targetTimeline}
                      onChange={(event) =>
                        setPersonalDetails((previous) => ({
                          ...previous,
                          targetTimeline: event.target.value,
                        }))
                      }
                      placeholder="e.g. Immediate, 7 days, 15 days"
                      required
                    />
                  </div>
                </div>

                <p className="ito-onion-form-note">
                  Your requirement will be validated by the server before the pricing page is opened. No OTP is required for this Onion purchase flow.
                </p>

                <div className="ito-onion-form-actions">
                  <button
                    type="button"
                    className="ito-button secondary"
                    disabled={submittingPersonalDetails}
                    onClick={() => {
                      setShowPersonalDetails(false);
                      setShowRequirementBuilder(true);
                    }}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    className="ito-button"
                    disabled={submittingPersonalDetails}
                  >
                    {submittingPersonalDetails ? "Saving Requirement…" : "Continue to Pricing"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DAILY DOMESTIC / EXPORT ONION RATE CHART */}
      <AnimatePresence>
        {showRateChart && (
          <motion.div
            className="ito-rate-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowRateChart(false);
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="ito-rate-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="onion-rate-chart-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="ito-rate-modal-header">
                <div>
                  <div className="ito-rate-modal-kicker">Prakriti by India Trade Overseas</div>
                  <h2 id="onion-rate-chart-title">Daily Onion Rate Chart</h2>
                  <div className="ito-rate-modal-date">
                    Fresh Fruits &amp; Vegetables Supply &amp; Export · {ONION_RATE_CHART.date}
                  </div>
                </div>

                <button
                  type="button"
                  className="ito-rate-modal-close"
                  aria-label="Close onion rate chart"
                  onClick={() => setShowRateChart(false)}
                >
                  ×
                </button>
              </div>

              <div className="ito-rate-modal-body">
                <div className="ito-rate-intro">
                  <span className="ito-rate-pill">🧅 {ONION_RATE_CHART.product}</span>
                  <span className="ito-rate-pill">🌱 {ONION_RATE_CHART.variety}</span>
                  <span className="ito-rate-pill">🚢 Export Quality · Ex. Godown Price</span>
                </div>

                <h3 className="ito-rate-section-title">Domestic Quality</h3>
                <div className="ito-rate-table-wrap">
                  <table className="ito-rate-table">
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>Rate / KG</th>
                        <th>Packing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ONION_RATE_CHART.domestic.map((item) => (
                        <tr key={item.size}>
                          <td><strong>{item.size}</strong></td>
                          <td className="ito-rate-price">{item.rate}</td>
                          <td>{ONION_RATE_CHART.domesticPacking}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ito-domestic-highlight">
                  <strong>🚚 Transportation:</strong> {ONION_RATE_CHART.transport}
                </div>

                <h3 className="ito-rate-section-title">Export Quality — Ex. Godown Price</h3>
                <div className="ito-rate-table-wrap">
                  <table className="ito-rate-table">
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th>Size</th>
                        <th>Rate / KG</th>
                        <th>Packing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ONION_RATE_CHART.export.map((item) => (
                        <tr key={item.market}>
                          <td><strong>{item.market}</strong></td>
                          <td>{item.size}</td>
                          <td className="ito-rate-price">{item.rate}</td>
                          <td>{item.packing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ito-rate-notes">
                  <div className="ito-rate-note">
                    <span>JNPT Transportation</span>
                    <strong>{ONION_RATE_CHART.jnpt}</strong>
                  </div>
                  <div className="ito-rate-note">
                    <span>Domestic Packing</span>
                    <strong>{ONION_RATE_CHART.domesticPacking}</strong>
                  </div>
                  <div className="ito-rate-note">
                    <span>Rate Date</span>
                    <strong>{ONION_RATE_CHART.date}</strong>
                  </div>
                </div>

                <p className="ito-rate-disclaimer">
                  Rates shown are the supplied rate chart for 22/09/2026. Transportation and
                  final commercial terms are subject to the applicable destination, quantity,
                  logistics and confirmation at the time of order.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
