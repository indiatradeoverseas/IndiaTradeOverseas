import React, { useEffect, useMemo, useRef, useState } from "react";

/*
  Onion.jsx — Nashik Onion Vertical
  India Trade Overseas
  
  Scroll-linked cinematic frame sequence (240 frames) with full DPR content.
  Frames at: public/images/onion-frames/frames/ezgif-frame-001.jpg ... ezgif-frame-240.jpg
*/

const TOTAL_FRAMES = 240;

const FRAME_BASE = "/images/onion-frames/frames";
const FRAME_NAME = (index) =>
  `${FRAME_BASE}/ezgif-frame-${String(index + 1).padStart(3, "0")}.jpg`;

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function scrollToFrameProgress(t) {
  // The old ease-in/out kept the first part of the sequence almost frozen.
  // This curve deliberately advances the animation much earlier so the onion
  // peeling begins during the second major scroll instead of several scrolls later.
  const stops = [
    [0, 0],
    [0.16, 0.28],
    [0.36, 0.55],
    [0.62, 0.79],
    [1, 1],
  ];

  for (let i = 1; i < stops.length; i += 1) {
    const [x1, y1] = stops[i - 1];
    const [x2, y2] = stops[i];
    if (t <= x2) {
      const local = (t - x1) / (x2 - x1);
      return y1 + (y2 - y1) * local;
    }
  }

  return 1;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [query]);

  return matches;
}

export default function Onion() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const framesRef = useRef([]);
  const rafRef = useRef(0);
  const targetFrameRef = useRef(0);
  const renderedFrameRef = useRef(-1);

  const [loaded, setLoaded] = useState(0);
  const [activeFrame, setActiveFrame] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const frameUrls = useMemo(
    () => Array.from({ length: TOTAL_FRAMES }, (_, i) => FRAME_NAME(i)),
    []
  );

  // Preload the full sequence once. Drawing remains canvas-only while scrolling.
  useEffect(() => {
    let cancelled = false;
    const frames = new Array(TOTAL_FRAMES);
    let completed = 0;

    frameUrls.forEach((src, index) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;

      image.onload = () => {
        if (cancelled) return;
        frames[index] = image;
        completed += 1;
        setLoaded(completed);
      };

      image.onerror = () => {
        if (cancelled) return;
        completed += 1;
        setLoaded(completed);
      };
    });

    framesRef.current = frames;

    return () => {
      cancelled = true;
      framesRef.current = [];
    };
  }, [frameUrls]);

  // Canvas setup and high-DPI rendering.
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      drawFrame(renderedFrameRef.current >= 0 ? renderedFrameRef.current : 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    function drawFrame(index) {
      const frame = framesRef.current[index];
      const rect = canvas.getBoundingClientRect();
      if (!frame || !rect.width || !rect.height) return;

      // Cinematic "cover" fit without stretching the source image.
      const scale = Math.max(
        rect.width / frame.naturalWidth,
        rect.height / frame.naturalHeight
      );

      const drawWidth = frame.naturalWidth * scale;
      const drawHeight = frame.naturalHeight * scale;
      const x = (rect.width - drawWidth) / 2;
      const y = (rect.height - drawHeight) / 2;

      ctx.fillStyle = COLORS.ivory;
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(frame, 0, 0, frame.naturalWidth, frame.naturalHeight, x, y, drawWidth, drawHeight);

      renderedFrameRef.current = index;
    }

    window.__drawOnionFrame = drawFrame;

    return () => {
      observer.disconnect();
      delete window.__drawOnionFrame;
    };
  }, []);

  // Scroll -> frame index. The entire page controls one cinematic pinned sequence.
  useEffect(() => {
    const update = () => {
      const stage = stageRef.current;
      if (!stage) return;

      // Map the 240-frame sequence to the ENTIRE document, not just the hero.
      // Frame 001 is shown at the top of the page and Frame 240 is reached
      // at the absolute bottom of the page.
      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const travel = Math.max(documentHeight - window.innerHeight, 1);
      const raw = clamp(window.scrollY / travel, 0, 1);
      const frameProgress = scrollToFrameProgress(raw);

      setScrollProgress(frameProgress);

      const frame = reducedMotion
        ? 0
        : Math.round(frameProgress * (TOTAL_FRAMES - 1));

      targetFrameRef.current = frame;
      setActiveFrame(frame);

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (window.__drawOnionFrame) {
          window.__drawOnionFrame(targetFrameRef.current);
        }
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [reducedMotion]);

  // If the first frames finish loading after mount, paint immediately.
  useEffect(() => {
    if (loaded > 0 && window.__drawOnionFrame) {
      window.__drawOnionFrame(targetFrameRef.current);
    }
  }, [loaded]);

  const loadPercent = Math.round((loaded / TOTAL_FRAMES) * 100);

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

        .ito-nav {
          position: fixed;
          z-index: 50;
          top: 0;
          left: 0;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px clamp(20px, 4vw, 64px);
          mix-blend-mode: normal;
          pointer-events: none;
        }

        .ito-brand {
          color: var(--burgundy);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          pointer-events: auto;
        }

        .ito-nav-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(74, 16, 28, .18);
          border-radius: 999px;
          padding: 9px 14px;
          color: var(--burgundy);
          background: rgba(247,243,234,.72);
          backdrop-filter: blur(12px);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          pointer-events: auto;
        }

        .ito-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--onion-red);
          box-shadow: 0 0 0 4px rgba(122,35,50,.10);
        }

        .ito-sequence {
          position: relative;
          height: 100vh;
          min-height: 640px;
        }

        .ito-sticky {
          position: fixed;
          z-index: 0;
          inset: 0;
          width: 100%;
          height: 100vh;
          min-height: 640px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: var(--ivory);
          pointer-events: none;
        }

        .ito-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }

        .ito-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          /* Keep the frame fully visible. This is only a very light readability
             gradient around the hero copy, not a full-screen image overlay. */
          background:
            linear-gradient(90deg, rgba(247,243,234,.20) 0%, rgba(247,243,234,.08) 24%, transparent 48%),
            linear-gradient(180deg, rgba(247,243,234,.10) 0%, transparent 22%, transparent 78%, rgba(34,33,31,.04) 100%);
        }

        .ito-hero-copy {
          position: relative;
          z-index: 2;
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding-top: 8vh;
          pointer-events: none;
          text-shadow: 0 1px 12px rgba(247,243,234,.55);
        }

        .ito-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          color: var(--olive);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .17em;
          text-transform: uppercase;
        }

        .ito-kicker::before {
          content: "";
          width: 34px;
          height: 1px;
          background: var(--gold);
        }

        .ito-hero-title {
          max-width: 720px;
          margin: 0;
          color: var(--burgundy);
          font-size: clamp(48px, 7vw, 96px);
          line-height: .92;
        }

        .ito-hero-subtitle {
          max-width: 560px;
          margin: 25px 0 0;
          color: rgba(34,33,31,.78);
          font-size: clamp(15px, 1.6vw, 20px);
          line-height: 1.65;
        }

        .ito-trust-line {
          display: flex;
          flex-wrap: wrap;
          gap: 40px;
          margin-top: 40px;
          color: rgba(34,33,31,.85);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: .06em;
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

        .ito-scroll-note {
          position: absolute;
          z-index: 3;
          left: clamp(20px, 4vw, 64px);
          bottom: 28px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(34,33,31,.85);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .ito-scroll-line {
          width: 54px;
          height: 1px;
          background: var(--gold);
        }

        .ito-progress {
          position: absolute;
          z-index: 4;
          right: clamp(20px, 4vw, 64px);
          bottom: 28px;
          width: 150px;
          height: 2px;
          overflow: hidden;
          background: rgba(74,16,28,.14);
        }

        .ito-progress > span {
          display: block;
          height: 100%;
          transform-origin: left center;
          background: var(--onion-red);
        }

        .ito-frame-counter {
          position: absolute;
          z-index: 4;
          right: clamp(20px, 4vw, 64px);
          bottom: 38px;
          color: var(--burgundy);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .ito-loading {
          position: absolute;
          z-index: 10;
          inset: auto 50% 24px auto;
          transform: translateX(50%);
          color: var(--burgundy);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          opacity: ${loaded === TOTAL_FRAMES ? 0 : 1};
          transition: opacity .35s ease;
        }

        .ito-section {
          position: relative;
          z-index: 2;
          padding: clamp(90px, 11vw, 160px) clamp(20px, 6vw, 96px);
          /* The fixed Canvas remains visible through the entire page. */
          background: transparent;
        }

        .ito-section.ito-dark,
        .ito-section.ito-cta {
          background: transparent;
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
          background: rgba(255,255,255,.035);
          border-color: rgba(247,243,234,.14);
        }

        .ito-dark .ito-spec-grid {
          background: rgba(247,243,234,.14);
          border-color: rgba(247,243,234,.14);
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
          border: 1px solid rgba(247,243,234,.18);
          border-radius: 999px;
          padding: 11px 15px;
          color: rgba(247,243,234,.82);
          background: rgba(247,243,234,.035);
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
          background: rgba(255,255,255,.70);
          border: 1px solid var(--sand);
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
          background: transparent;
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
          background: rgba(247,243,234,.08);
          border-color: rgba(247,243,234,.18);
        }

        .ito-disclaimer {
          margin-top: 16px;
          font-size: 13px;
          color: rgba(34,33,31,.70);
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

        /* Compact export operating model — keep the section visually short so the
           scroll-linked onion remains visible across the page. */
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
          color: rgba(34,33,31,.70);
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
          background: rgba(74,16,28,.05);
          border: 1px solid var(--sand);
          border-radius: 12px;
          padding: 28px;
          margin-top: 32px;
          font-style: italic;
          color: rgba(34,33,31,.88);
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

        @media (max-width: 800px) {
          .ito-sequence {
            height: 100vh;
            min-height: 560px;
          }

          .ito-sticky {
            min-height: 560px;
          }

          .ito-vignette {
            background:
              linear-gradient(180deg, rgba(247,243,234,.84) 0%, rgba(247,243,234,.38) 35%, transparent 67%, rgba(34,33,31,.10) 100%);
          }

          /* Top branding/nav stays fixed; give hero copy room beneath it */
          .ito-nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 60;
            background: rgba(247,243,234,.95);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid var(--sand);
          }

          .ito-hero-copy {
            padding-top: calc(6vh + 100px); /* space for fixed nav + extra breathing room */
            width: min(1180px, calc(100% - 24px));
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
            align-items: flex-start;
            margin-top: 16px;
            gap: 10px;
            font-size: 12px;
          }

          .ito-trust-line span {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .ito-scroll-note {
            bottom: 16px;
            left: clamp(16px, 4vw, 24px);
          }

          .ito-frame-counter,
          .ito-progress {
            right: clamp(16px, 4vw, 24px);
            bottom: 16px;
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
        }

        @media (prefers-reduced-motion: reduce) {
          .ito-button {
            transition: none;
          }
        }

        /*
         * IMPORTANT: the fixed Canvas is the visual layer for the entire page.
         * Do NOT put opaque section backgrounds over it. Content gets readability
         * treatment locally instead, so the onion/peeling sequence remains fully
         * visible from top to bottom.
         */
        .ito-section:not(.ito-dark):not(.ito-cta) {
          background: transparent;
        }

        .ito-section.ito-dark,
        .ito-section.ito-cta {
          background: transparent;
        }

        /* Local reading surfaces only where text/cards need extra contrast. */
        .ito-section:not(.ito-dark):not(.ito-cta) .ito-section-inner {
          position: relative;
        }

        .ito-section:not(.ito-dark):not(.ito-cta) .ito-intro > div:last-child {
          padding: 24px 28px;
          border-radius: 16px;
          background: rgba(247,243,234,.72);
          box-shadow: 0 12px 35px rgba(34,33,31,.08);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
        }

        .ito-section:not(.ito-dark):not(.ito-cta) .ito-section-title {
          text-shadow: 0 2px 18px rgba(247,243,234,.85), 0 1px 3px rgba(255,255,255,.7);
        }

        .ito-section:not(.ito-dark):not(.ito-cta) .ito-eyebrow,
        .ito-section:not(.ito-dark):not(.ito-cta) .ito-lead {
          text-shadow: 0 1px 9px rgba(247,243,234,.95);
        }

        /* Cards remain solid enough to keep all detailed information readable,
           while the space between cards stays transparent so the animation shows. */
        .ito-spec,
        .ito-pack-card,
        .ito-market,
        .ito-quote-box,
        .ito-crm-panel,
        .ito-table-wrap {
          box-shadow: 0 10px 28px rgba(34,33,31,.10);
        }

        /* CRM section: no full-section overlay. Only the actual content surfaces
           receive contrast, leaving the onion animation unobstructed around them. */
        .ito-section--pt {
          position: relative;
          isolation: isolate;
          background: transparent;
          color: var(--ivory);
        }

        .ito-section--pt .ito-section-inner {
          position: relative;
          z-index: 1;
        }

        .ito-section--pt .ito-intro > div:last-child {
          background: rgba(34,33,31,.72);
          color: var(--ivory);
          border: 1px solid rgba(181,150,90,.55);
          box-shadow: 0 14px 36px rgba(0,0,0,.16);
        }

        .ito-section--pt .ito-eyebrow {
          color: var(--gold);
        }

        .ito-section--pt .ito-section-title,
        .ito-section--pt .ito-crm-heading {
          color: var(--ivory);
          text-shadow: 0 2px 18px rgba(0,0,0,.55);
        }

        .ito-section--pt .ito-lead {
          color: rgba(247,243,234,.96);
          text-shadow: 0 2px 10px rgba(0,0,0,.45);
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

        /* CTA: keep the canvas visible. Give the heading/copy their own compact
           reading surfaces instead of covering the whole section with burgundy. */
        .ito-cta-inner {
          position: relative;
        }

        .ito-cta-inner > div:first-child {
          padding: 22px 26px 26px;
          border-radius: 16px;
          background: rgba(74,16,28,.76);
          border: 1px solid rgba(247,243,234,.16);
          box-shadow: 0 14px 38px rgba(0,0,0,.18);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
        }

        .ito-cta-inner > div:last-child {
          padding: 22px;
          border-radius: 16px;
          background: rgba(34,33,31,.72);
          border: 1px solid rgba(247,243,234,.14);
          box-shadow: 0 14px 38px rgba(0,0,0,.18);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
        }

        .ito-cta h2 {
          text-shadow: 0 3px 18px rgba(0,0,0,.55);
        }

        /* Keep text controls readable without putting a page-wide overlay over the Canvas. */
        .ito-frame-counter {
          background: rgba(34,33,31,.55);
          padding: 4px 8px;
          border: 1px solid rgba(247,243,234,.24);
          border-radius: 5px;
          color: var(--ivory);
          text-shadow: 0 1px 4px rgba(0,0,0,.30);
        }

        /* Requested treatment:
           ONLY the text is Burgundy. No Burgundy content/background panels.
           A soft white text-shadow keeps the Burgundy text readable over the
           moving onion Canvas. */
        .ito-section .ito-section-title,
        .ito-section .ito-lead,
        .ito-section .ito-section-heading,
        .ito-section--pt .ito-crm-heading {
          color: var(--burgundy);
          text-shadow:
            0 1px 0 rgba(255,255,255,.98),
            0 2px 7px rgba(255,255,255,.95),
            0 4px 16px rgba(255,255,255,.78);
        }

        /* Dark sections still use Burgundy text for the requested headings,
           with no filled panel behind them. */
        .ito-section.ito-dark .ito-section-title,
        .ito-section.ito-dark .ito-lead,
        .ito-section.ito-dark .ito-section-heading {
          color: var(--burgundy);
          background: transparent;
          border: 0;
          box-shadow: none;
          text-shadow:
            0 1px 0 rgba(255,255,255,1),
            0 2px 8px rgba(255,255,255,.98),
            0 4px 18px rgba(255,255,255,.82);
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

        .ito-section--pt .ito-section-title,
        .ito-section--pt .ito-lead,
        .ito-section--pt .ito-crm-heading {
          background: transparent;
          border: 0;
          box-shadow: none;
          color: var(--burgundy);
          text-shadow:
            0 1px 0 rgba(255,255,255,1),
            0 2px 8px rgba(255,255,255,.98),
            0 4px 18px rgba(255,255,255,.82);
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

        /* Process steps: all ten labels must be bright white. */
        .ito-process-item span {
          color: #FFFFFF !important;
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

        /* Market-price notice: white text. */
        .ito-market-notice,
        .ito-market-notice * {
          color: #FFFFFF !important;
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

        /* CTA buttons: white background + white text, including links and nested text. */
        .ito-actions .ito-button,
        .ito-actions .ito-button *,
        .ito-actions a {
          background: #FFFFFF !important;
          color: #FFFFFF !important;
          border-color: #FFFFFF !important;
          text-shadow: none !important;
        }

        .ito-actions .ito-button:hover,
        .ito-actions .ito-button:focus-visible {
          background: #FFFFFF !important;
          color: #FFFFFF !important;
          border-color: #FFFFFF !important;
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
          color: #FFFFFF !important;
          text-shadow: none !important;
        }

        .ito-actions .ito-button,
        .ito-actions .ito-button *,
        .ito-actions a {
          background: #FFFFFF !important;
          color: var(--burgundy) !important;
          border-color: var(--burgundy) !important;
          text-shadow: none !important;
        }

        .ito-actions .ito-button:hover,
        .ito-actions .ito-button:focus-visible,
        .ito-actions a:hover,
        .ito-actions a:focus-visible {
          background: #FFFFFF !important;
          color: var(--burgundy) !important;
          border-color: var(--burgundy) !important;
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

          .ito-hero-copy {
            padding-top: 92px;
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



`}</style>

      <nav className="ito-nav" aria-label="Primary">
        <a className="ito-nav-brand" href="#top" aria-label="India Trade Overseas — Nashik Onion">
          <span className="ito-nav-mark" aria-hidden="true">ITO</span>
          <span className="ito-nav-brand-copy">
            <strong>India Trade Overseas</strong>
            <small>Nashik Onion Vertical</small>
          </span>
        </a>

        <div className="ito-nav-links" aria-label="Page sections">
          <a href="#specifications">Specifications</a>
          <a href="#quality">Quality</a>
          <a href="#process">Process</a>
          <a href="#international">Export</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="ito-nav-actions">
          <a className="ito-nav-cta" href="#rfq">Request Supply</a>
          <button
            className={`ito-nav-menu ${navOpen ? "is-open" : ""}`}
            type="button"
            aria-label={navOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>

        <div className={`ito-mobile-menu ${navOpen ? "is-open" : ""}`}>
          <a href="#specifications" onClick={() => setNavOpen(false)}>Specifications</a>
          <a href="#quality" onClick={() => setNavOpen(false)}>Quality Control</a>
          <a href="#process" onClick={() => setNavOpen(false)}>Process</a>
          <a href="#international" onClick={() => setNavOpen(false)}>Export</a>
          <a href="#faq" onClick={() => setNavOpen(false)}>FAQ</a>
          <a className="ito-mobile-menu-cta" href="#rfq" onClick={() => setNavOpen(false)}>
            Request Supply
          </a>
        </div>
      </nav>

      {/* CINEMATIC HERO SEQUENCE */}
      <section ref={stageRef} className="ito-sequence" aria-label="Nashik onion cinematic sequence">
        {/* The canvas is the only element pinned to the viewport. */}
        <div className="ito-sticky" aria-hidden="true">
          <canvas
            ref={canvasRef}
            className="ito-canvas"
            aria-label="Frame-by-frame Nashik onion product sequence"
          />
          <div className="ito-vignette" />
          <div className="ito-frame-counter">
            {String(activeFrame + 1).padStart(3, "0")} / {TOTAL_FRAMES}
          </div>
          <div className="ito-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${scrollProgress})` }} />
          </div>
          <div className="ito-loading" aria-live="polite">
            Loading sequence · {loadPercent}%
          </div>
        </div>

        {/* Hero copy is normal document content, so it scrolls away naturally. */}
        <div className="ito-hero-content">
          <div className="ito-hero-copy">
            <div className="ito-kicker">Domestic India · International Export · Bulk B2B Trade</div>
            <h1 className="ito-display ito-hero-title">
              Nashik Onions
              <br />
              for Domestic
              <br />
              & Global Markets
            </h1>
            <p className="ito-hero-subtitle">
              Sourced with Precision. Graded to Specification. Delivered with Coordination.
            </p>
            <div className="ito-trust-line" role="list">
              <span role="listitem">Buyer-Defined Grades</span>
              <span role="listitem">Flexible Packaging</span>
              <span role="listitem">Documented Loading</span>
              <span role="listitem">Logistics Coordination</span>
            </div>
          </div>
          <div className="ito-scroll-note">
            <span className="ito-scroll-line" />
            Scroll to explore
          </div>
        </div>
      </section>

      {/* MARKET SPLIT */}
      <section className="ito-section ito-dark">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Market entry</div>
          <h2 className="ito-display ito-section-title">Choose Your Supply Route</h2>
          <p className="ito-lead">
            The page splits domestic and international visitors immediately because their buying questions, commercial terms, documentation and logistics are materially different.
          </p>

          <div className="ito-split-grid">
            <article className="ito-split-card">
              <h3>Domestic Supply</h3>
              <p>Bulk truckload supply for wholesalers, distributors, processors, institutional buyers and retail-chain suppliers across India. Quotations may be prepared on an Ex-Warehouse, FOR or delivered-to-destination basis.</p>
              <a className="ito-button" href="#domestic">Get Domestic Delivered Rate</a>
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
      <section className="ito-section">
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
      <section className="ito-section" id="packaging">
        <div className="ito-section-inner">
          <div className="ito-intro">
            <div>
              <div className="ito-eyebrow">Packaging</div>
              <h2 className="ito-display ito-section-title">Packed for Domestic and Export Markets</h2>
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

          <p className="ito-market-notice">
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
            <p className="ito-cta-copy">
              Tell us the quantity, size, grade, packaging and destination. Our commercial team will check availability, logistics and applicable terms before preparing the offer.
            </p>
            <div className="ito-actions">
              <a className="ito-button" href="#rfq">Request Domestic Rate</a>
              <a className="ito-button secondary" href="#rfq">Request Export SCO</a>
              <a className="ito-button secondary" href="https://wa.me/91XXXXXXXXXX" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* CRM & LEAD INFO - Reference section */}
      <section className="ito-section ito-section--pt">
        <div className="ito-section-inner">
          <div className="ito-eyebrow">Sales operations</div>
          <h2 className="ito-display ito-section-title">CRM Pipeline and Automation</h2>
          <p className="ito-lead">
            The CRM pipeline tracks every lead from enquiry through to repeat order, with automated WhatsApp acknowledgement and internal response standards.
          </p>

          <h3 className="ito-crm-heading">
            CRM Stages ({CRM_STAGES.length} stages)
          </h3>
          <div className="ito-markets ito-markets--mt">
            {CRM_STAGES.map((stage, i) => (
              <span className="ito-market ito-market--crm" key={i}>
                {String(i + 1).padStart(2, "0")}. {stage}
              </span>
            ))}
          </div>

          <div className="ito-quote-box ito-quote-box--mt">
            <strong>Automated WhatsApp acknowledgement:</strong> "Welcome to India Trade Overseas. Thank you for contacting us regarding Nashik onions. Please share whether the requirement is domestic or international, your company, quantity, size, grade, packaging, destination, required date, preferred trade term and payment method. Our team will verify current availability, logistics and pricing before sharing the applicable offer."
          </div>
        </div>
      </section>

      <footer className="ito-footer">
        <span>India Trade Overseas · Nashik Onion Vertical</span>
        <span>Where Quality Meets Global Demand</span>
      </footer>
    </main>
  );
}
