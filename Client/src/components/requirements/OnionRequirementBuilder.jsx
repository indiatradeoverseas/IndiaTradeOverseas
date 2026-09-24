import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = [
  {
    key: "tradeType",
    label: "Trade",
    title: "Where are you buying from?",
    description:
      "Choose whether this requirement is for domestic India supply or international export.",
  },
  {
    key: "size",
    label: "Size",
    title: "What onion size do you need?",
    description:
      "Select the preferred bulb size. Final availability is subject to lot verification.",
  },
  {
    key: "grade",
    label: "Grade",
    title: "Choose the quality grade",
    description:
      "Select the commercial quality level required for your order.",
  },
  {
    key: "quantity",
    label: "Quantity",
    title: "How much do you need?",
    description:
      "Tell us the approximate quantity required for this purchase.",
  },
  {
    key: "packaging",
    label: "Packing",
    title: "How should it be packed?",
    description:
      "Select the preferred packaging format for your requirement.",
  },
  {
    key: "destination",
    label: "Destination",
    title: "Where should we supply?",
    description:
      "Choose the destination for delivery or export.",
  },
  {
    key: "timeline",
    label: "Timeline",
    title: "When do you need the onions?",
    description:
      "Choose the required procurement timeline.",
  },
];

const TRADE_TYPES = [
  {
    value: "DOMESTIC",
    title: "Domestic India",
    description: "Supply within India.",
  },
  {
    value: "EXPORT",
    title: "International Export",
    description: "Export shipment from India.",
  },
];

const SIZE_OPTIONS = [
  {
    value: "35mm+",
    title: "35mm+",
    description: "Commercial mixed / smaller export-oriented sizing.",
  },
  {
    value: "40mm+",
    title: "40mm+",
    description: "Standard commercial size.",
  },
  {
    value: "45mm+",
    title: "45mm+",
    description: "Larger bulb specification.",
  },
  {
    value: "50mm+",
    title: "50mm+",
    description: "Premium larger-size requirement.",
  },
  {
    value: "55mm+",
    title: "55mm+",
    description: "Extra-large bulb specification.",
  },
];

const DOMESTIC_SIZE_OPTIONS = SIZE_OPTIONS.filter(
  (option) =>
    ["40mm+", "45mm+", "50mm+"].includes(
      option.value
    )
);

const EXPORT_SIZE_OPTIONS = SIZE_OPTIONS;

const GRADE_OPTIONS = [
  {
    value: "COMMERCIAL",
    title: "Commercial",
    description:
      "Commercial-grade onions suitable for bulk domestic requirements.",
  },
  {
    value: "STANDARD_EXPORT",
    title: "Standard Export",
    description:
      "Export-oriented grading with agreed size, tolerance and packing.",
  },
  {
    value: "PREMIUM_EXPORT",
    title: "Premium Export",
    description:
      "Higher-spec selection for buyers requiring tighter parameters.",
  },
];

const QUANTITY_OPTIONS = [
  {
    value: 30000,
    title: "30 MT",
    description: "30,000 kg",
  },
  {
    value: 40000,
    title: "40 MT",
    description: "40,000 kg",
  },
  {
    value: 60000,
    title: "60 MT",
    description: "60,000 kg",
  },
  {
    value: 100000,
    title: "100 MT",
    description: "100,000 kg",
  },
  {
    value: "CUSTOM",
    title: "Custom",
    description: "Enter your own quantity.",
  },
];

const PACKAGING_OPTIONS = [
  {
    value: "20 KG MESH",
    title: "20 kg Mesh",
    description: "Ventilated mesh bag.",
  },
  {
    value: "9 KG MESH",
    title: "9 kg Mesh",
    description: "Smaller export-oriented mesh pack.",
  },
  {
    value: "10 KG MESH",
    title: "10 kg Mesh",
    description: "Compact export mesh pack.",
  },
  {
    value: "25 KG JUTE",
    title: "25 kg Jute",
    description: "Jute bag packaging.",
  },
  {
    value: "50 KG JUTE",
    title: "50 kg Jute",
    description: "Bulk jute packaging.",
  },
  {
    value: "50 KG MESH",
    title: "50 kg Mesh",
    description: "Bulk ventilated mesh packaging.",
  },
  {
    value: "CUSTOM",
    title: "Custom",
    description: "Specify another packaging requirement.",
  },
];

const EXPORT_DESTINATIONS = [
  "Dubai",
  "Malaysia",
  "Sri Lanka",
  "Bangladesh",
  "Vietnam",
  "Nepal",
];

const DOMESTIC_DESTINATIONS = [
  "India - Domestic",
  "Mumbai",
  "Delhi NCR",
  "Lucknow",
  "Kolkata",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Other India",
];

const TIMELINE_OPTIONS = [
  {
    value: "Immediate",
    title: "Immediate",
    description: "Requirement is ready to proceed.",
  },
  {
    value: "3 days",
    title: "Within 3 days",
    description: "Required within the next few days.",
  },
  {
    value: "7 days",
    title: "Within 7 days",
    description: "Required within one week.",
  },
  {
    value: "15 days",
    title: "Within 15 days",
    description: "Required within two weeks.",
  },
  {
    value: "Future",
    title: "Future requirement",
    description: "Planning for a later purchase.",
  },
];

const INITIAL_REQUIREMENT = {
  tradeType: "",
  size: "",
  grade: "",
  quantityKg: "",
  packaging: "",
  destination: "",
  timeline: "",
};

function formatNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  return Number(value).toLocaleString("en-IN");
}

export default function OnionRequirementBuilder({
  isOpen,
  open,
  onClose,
  onComplete,
}) {
  /*
    IMPORTANT:
    `isOpen` is the official prop.

    `open` is accepted as a compatibility fallback so that even if an
    older Onion.jsx passes `open={...}`, the component still works.

    Most importantly, there is NO default `true`.
  */
  const visible = Boolean(isOpen ?? open ?? false);

  const [currentStep, setCurrentStep] = useState(0);

  const [requirement, setRequirement] = useState(
    INITIAL_REQUIREMENT
  );

  const [customQuantity, setCustomQuantity] = useState("");

  const [customPackaging, setCustomPackaging] = useState("");

  const [customDestination, setCustomDestination] = useState("");

  const step = STEPS[currentStep];

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const destinationOptions = useMemo(() => {
    if (requirement.tradeType === "EXPORT") {
      return EXPORT_DESTINATIONS;
    }

    if (requirement.tradeType === "DOMESTIC") {
      return DOMESTIC_DESTINATIONS;
    }

    return [];
  }, [requirement.tradeType]);

  const sizeOptions = useMemo(() => {
    if (requirement.tradeType === "DOMESTIC") {
      return DOMESTIC_SIZE_OPTIONS;
    }

    if (requirement.tradeType === "EXPORT") {
      return EXPORT_SIZE_OPTIONS;
    }

    return [];
  }, [requirement.tradeType]);

  const updateRequirement = (field, value) => {
    setRequirement((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleTradeTypeChange = (value) => {
    setRequirement((previous) => ({
      ...previous,
      tradeType: value,
      size: "",
      destination: "",
    }));

    setCustomDestination("");
  };

  const handleQuantityChange = (value) => {
    updateRequirement("quantityKg", value);

    if (value !== "CUSTOM") {
      setCustomQuantity("");
    }
  };

  const handlePackagingChange = (value) => {
    updateRequirement("packaging", value);

    if (value !== "CUSTOM") {
      setCustomPackaging("");
    }
  };

  const handleDestinationChange = (value) => {
    updateRequirement("destination", value);

    if (value !== "Other India") {
      setCustomDestination("");
    }
  };

  const isStepComplete = () => {
    switch (step.key) {
      case "tradeType":
        return Boolean(requirement.tradeType);

      case "size":
        return Boolean(requirement.size);

      case "grade":
        return Boolean(requirement.grade);

      case "quantity":
        if (requirement.quantityKg === "CUSTOM") {
          return Number(customQuantity) > 0;
        }

        return Number(requirement.quantityKg) > 0;

      case "packaging":
        if (requirement.packaging === "CUSTOM") {
          return Boolean(customPackaging.trim());
        }

        return Boolean(requirement.packaging);

      case "destination":
        if (!requirement.destination) {
          return false;
        }

        if (
          requirement.tradeType === "DOMESTIC" &&
          requirement.destination === "Other India"
        ) {
          return Boolean(customDestination.trim());
        }

        return true;

      case "timeline":
        return Boolean(requirement.timeline);

      default:
        return false;
    }
  };

  const closeBuilder = () => {
    setCurrentStep(0);
    setRequirement(INITIAL_REQUIREMENT);
    setCustomQuantity("");
    setCustomPackaging("");
    setCustomDestination("");

    if (typeof onClose === "function") {
      onClose();
    }
  };

  const goBack = () => {
    if (currentStep === 0) {
      closeBuilder();
      return;
    }

    setCurrentStep((previous) => previous - 1);
  };

  const goNext = () => {
    if (!isStepComplete()) {
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((previous) => previous + 1);
      return;
    }

    const finalQuantity =
      requirement.quantityKg === "CUSTOM"
        ? Number(customQuantity)
        : Number(requirement.quantityKg);

    const finalPackaging =
      requirement.packaging === "CUSTOM"
        ? customPackaging.trim()
        : requirement.packaging;

    const finalDestination =
      requirement.destination === "Other India"
        ? customDestination.trim()
        : requirement.destination;

    const finalRequirement = {
      ...requirement,
      quantityKg: finalQuantity,
      packaging: finalPackaging,
      destination: finalDestination,
    };

    if (typeof onComplete === "function") {
      onComplete(finalRequirement);
    }
  };

  const renderOptionCards = (options, field, onSelect) => {
    return (
      <div className="ito-onion-builder-options">
        {options.map((option) => {
          const selected = requirement[field] === option.value;

          return (
            <button
              key={String(option.value)}
              type="button"
              className={`ito-onion-builder-option ${
                selected ? "is-selected" : ""
              }`}
              onClick={() => onSelect(option.value)}
            >
              <span className="ito-onion-builder-option-check">
                {selected ? "✓" : ""}
              </span>

              <span className="ito-onion-builder-option-content">
                <strong>{option.title}</strong>

                <small>{option.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step.key) {
      case "tradeType":
        return renderOptionCards(
          TRADE_TYPES,
          "tradeType",
          handleTradeTypeChange
        );

      case "size":
        if (!requirement.tradeType) {
          return (
            <div className="ito-onion-builder-empty">
              Please select Domestic India or International Export first.
            </div>
          );
        }

        return renderOptionCards(
          sizeOptions,
          "size",
          (value) => updateRequirement("size", value)
        );

      case "grade":
        return renderOptionCards(
          GRADE_OPTIONS,
          "grade",
          (value) => updateRequirement("grade", value)
        );

      case "quantity":
        return (
          <>
            {renderOptionCards(
              QUANTITY_OPTIONS,
              "quantityKg",
              handleQuantityChange
            )}

            <AnimatePresence>
              {requirement.quantityKg === "CUSTOM" && (
                <motion.div
                  className="ito-onion-builder-custom-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label htmlFor="onion-custom-quantity">
                    Custom quantity
                  </label>

                  <div className="ito-onion-builder-input-row">
                    <input
                      id="onion-custom-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={customQuantity}
                      onChange={(event) =>
                        setCustomQuantity(event.target.value)
                      }
                      placeholder="Enter quantity"
                    />

                    <span>kg</span>
                  </div>

                  {customQuantity && (
                    <small>
                      {formatNumber(customQuantity)} kg
                    </small>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );

      case "packaging":
        return (
          <>
            {renderOptionCards(
              PACKAGING_OPTIONS,
              "packaging",
              handlePackagingChange
            )}

            <AnimatePresence>
              {requirement.packaging === "CUSTOM" && (
                <motion.div
                  className="ito-onion-builder-custom-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label htmlFor="onion-custom-packaging">
                    Custom packaging
                  </label>

                  <input
                    id="onion-custom-packaging"
                    type="text"
                    value={customPackaging}
                    onChange={(event) =>
                      setCustomPackaging(event.target.value)
                    }
                    placeholder="e.g. 10 kg printed mesh bags"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );

      case "destination":
        if (!requirement.tradeType) {
          return (
            <div className="ito-onion-builder-empty">
              Please select Domestic India or International Export first.
            </div>
          );
        }

        return (
          <>
            <div className="ito-onion-builder-destination-grid">
              {destinationOptions.map((destination) => {
                const selected =
                  requirement.destination === destination;

                return (
                  <button
                    key={destination}
                    type="button"
                    className={`ito-onion-builder-destination ${
                      selected ? "is-selected" : ""
                    }`}
                    onClick={() =>
                      handleDestinationChange(destination)
                    }
                  >
                    <span>{destination}</span>

                    {selected && <strong>✓</strong>}
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {requirement.destination === "Other India" && (
                <motion.div
                  className="ito-onion-builder-custom-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label htmlFor="onion-custom-destination">
                    Destination city
                  </label>

                  <input
                    id="onion-custom-destination"
                    type="text"
                    value={customDestination}
                    onChange={(event) =>
                      setCustomDestination(event.target.value)
                    }
                    placeholder="Enter destination city"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );

      case "timeline":
        return renderOptionCards(
          TIMELINE_OPTIONS,
          "timeline",
          (value) => updateRequirement("timeline", value)
        );

      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        .ito-onion-builder-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(122, 35, 50, 0.16),
              transparent 42%
            ),
            rgba(10, 8, 8, 0.78);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          overflow-y: auto;
        }

        .ito-onion-builder-modal {
          width: min(920px, 100%);
          max-height: min(820px, calc(100vh - 40px));
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 24px;
          background:
            linear-gradient(
              145deg,
              rgba(52, 23, 29, 0.98),
              rgba(25, 18, 20, 0.99)
            );
          box-shadow:
            0 40px 100px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.025);
          color: #fff;
        }

        .ito-onion-builder-header {
          flex-shrink: 0;
          padding: 26px 30px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }

        .ito-onion-builder-header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .ito-onion-builder-kicker {
          display: block;
          margin-bottom: 7px;
          color: #d9b85c;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .ito-onion-builder-header h2 {
          margin: 0;
          color: #fff9ec;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(27px, 4vw, 42px);
          line-height: 1.05;
          font-weight: 500;
        }

        .ito-onion-builder-close {
          flex: 0 0 auto;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.055);
          color: #fff;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        .ito-onion-builder-close:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: rotate(4deg);
        }

        .ito-onion-builder-progress {
          margin-top: 22px;
        }

        .ito-onion-builder-progress-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
        }

        .ito-onion-builder-progress-track {
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
        }

        .ito-onion-builder-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #7a2332,
            #d9b85c
          );
          transition: width 0.3s ease;
        }

        .ito-onion-builder-steps {
          display: flex;
          gap: 8px;
          margin-top: 15px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .ito-onion-builder-steps::-webkit-scrollbar {
          display: none;
        }

        .ito-onion-builder-step {
          flex: 0 0 auto;
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ito-onion-builder-step.active {
          color: #fff;
        }

        .ito-onion-builder-step.completed {
          color: #d9b85c;
        }

        .ito-onion-builder-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 30px;
        }

        .ito-onion-builder-step-heading {
          margin-bottom: 24px;
        }

        .ito-onion-builder-step-heading h3 {
          margin: 0 0 8px;
          color: #fff9ec;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 500;
        }

        .ito-onion-builder-step-heading p {
          max-width: 680px;
          margin: 0;
          color: rgba(255, 255, 255, 0.58);
          font-size: 14px;
          line-height: 1.65;
        }

        .ito-onion-builder-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .ito-onion-builder-option {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          min-height: 94px;
          padding: 17px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.035);
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .ito-onion-builder-option:hover {
          transform: translateY(-1px);
          border-color: rgba(217, 184, 92, 0.45);
          background: rgba(255, 255, 255, 0.06);
        }

        .ito-onion-builder-option.is-selected {
          border-color: rgba(217, 184, 92, 0.85);
          background: rgba(122, 35, 50, 0.3);
          box-shadow: inset 0 0 0 1px rgba(217, 184, 92, 0.1);
        }

        .ito-onion-builder-option-check {
          flex: 0 0 auto;
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          color: #1b1715;
          background: transparent;
          font-size: 13px;
          font-weight: 900;
        }

        .ito-onion-builder-option.is-selected
          .ito-onion-builder-option-check {
          border-color: #d9b85c;
          background: #d9b85c;
        }

        .ito-onion-builder-option-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ito-onion-builder-option-content strong {
          color: #fff9ec;
          font-size: 15px;
        }

        .ito-onion-builder-option-content small {
          color: rgba(255, 255, 255, 0.53);
          font-size: 12px;
          line-height: 1.5;
        }

        .ito-onion-builder-destination-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 11px;
        }

        .ito-onion-builder-destination {
          min-height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.035);
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ito-onion-builder-destination:hover,
        .ito-onion-builder-destination.is-selected {
          border-color: rgba(217, 184, 92, 0.8);
          background: rgba(122, 35, 50, 0.28);
        }

        .ito-onion-builder-destination strong {
          color: #d9b85c;
        }

        .ito-onion-builder-custom-field {
          margin-top: 16px;
          padding: 17px;
          border: 1px solid rgba(217, 184, 92, 0.2);
          border-radius: 15px;
          background: rgba(217, 184, 92, 0.05);
        }

        .ito-onion-builder-custom-field label {
          display: block;
          margin-bottom: 8px;
          color: #fff9ec;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .ito-onion-builder-custom-field input {
          width: 100%;
          box-sizing: border-box;
          min-height: 46px;
          padding: 11px 13px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 10px;
          outline: none;
          background: rgba(0, 0, 0, 0.22);
          color: #fff;
          font: inherit;
        }

        .ito-onion-builder-custom-field input:focus {
          border-color: rgba(217, 184, 92, 0.75);
        }

        .ito-onion-builder-custom-field small {
          display: block;
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.5);
        }

        .ito-onion-builder-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ito-onion-builder-input-row input {
          flex: 1;
        }

        .ito-onion-builder-input-row span {
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
        }

        .ito-onion-builder-empty {
          padding: 30px;
          border: 1px dashed rgba(255, 255, 255, 0.16);
          border-radius: 15px;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
        }

        .ito-onion-builder-footer {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(0, 0, 0, 0.16);
        }

        .ito-onion-builder-footer-note {
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
          line-height: 1.5;
        }

        .ito-onion-builder-actions {
          display: flex;
          gap: 10px;
        }

        .ito-onion-builder-btn {
          min-height: 44px;
          padding: 0 20px;
          border: 1px solid transparent;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ito-onion-builder-btn.secondary {
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .ito-onion-builder-btn.primary {
          background: #7a2332;
          color: #fff;
        }

        .ito-onion-builder-btn.primary:hover:not(:disabled) {
          background: #8e3347;
          transform: translateY(-1px);
        }

        .ito-onion-builder-btn:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        @media (max-width: 700px) {
          .ito-onion-builder-backdrop {
            align-items: flex-end;
            padding: 0;
          }

          .ito-onion-builder-modal {
            width: 100%;
            max-height: 94vh;
            border-radius: 22px 22px 0 0;
          }

          .ito-onion-builder-header {
            padding: 20px 18px 16px;
          }

          .ito-onion-builder-body {
            padding: 22px 18px;
          }

          .ito-onion-builder-footer {
            padding: 14px 18px;
            align-items: stretch;
            flex-direction: column;
          }

          .ito-onion-builder-footer-note {
            text-align: center;
          }

          .ito-onion-builder-actions {
            width: 100%;
          }

          .ito-onion-builder-btn {
            flex: 1;
          }

          .ito-onion-builder-options {
            grid-template-columns: 1fr;
          }

          .ito-onion-builder-destination-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 430px) {
          .ito-onion-builder-destination-grid {
            grid-template-columns: 1fr;
          }

          .ito-onion-builder-header h2 {
            font-size: 27px;
          }
        }
      `}</style>

      <AnimatePresence>
        {visible && (
          <motion.div
            className="ito-onion-builder-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeBuilder();
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="ito-onion-builder-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="onion-requirement-builder-title"
              initial={{
                opacity: 0,
                y: 30,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 30,
                scale: 0.97,
              }}
              transition={{
                duration: 0.24,
                ease: "easeOut",
              }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="ito-onion-builder-header">
                <div className="ito-onion-builder-header-top">
                  <div>
                    <span className="ito-onion-builder-kicker">
                      Step {currentStep + 1} of {STEPS.length}
                    </span>

                    <h2 id="onion-requirement-builder-title">
                      Build Your Onion Requirement
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="ito-onion-builder-close"
                    aria-label="Close requirement builder"
                    onClick={closeBuilder}
                  >
                    ×
                  </button>
                </div>

                <div className="ito-onion-builder-progress">
                  <div className="ito-onion-builder-progress-meta">
                    <span>{step.label}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>

                  <div className="ito-onion-builder-progress-track">
                    <motion.div
                      className="ito-onion-builder-progress-fill"
                      animate={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="ito-onion-builder-steps">
                    {STEPS.map((item, index) => (
                      <span
                        key={item.key}
                        className={`ito-onion-builder-step ${
                          index === currentStep ? "active" : ""
                        } ${
                          index < currentStep ? "completed" : ""
                        }`}
                      >
                        {index + 1}. {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ito-onion-builder-body">
                <motion.div
                  key={step.key}
                  initial={{
                    opacity: 0,
                    x: 16,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -16,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                >
                  <div className="ito-onion-builder-step-heading">
                    <h3>{step.title}</h3>

                    <p>{step.description}</p>
                  </div>

                  {renderStepContent()}
                </motion.div>
              </div>

              <div className="ito-onion-builder-footer">
                <div className="ito-onion-builder-footer-note">
                  No OTP is required. Pricing is calculated by the backend
                  and rechecked again before payment.
                </div>

                <div className="ito-onion-builder-actions">
                  <button
                    type="button"
                    className="ito-onion-builder-btn secondary"
                    onClick={goBack}
                  >
                    {currentStep === 0 ? "Cancel" : "Back"}
                  </button>

                  <button
                    type="button"
                    className="ito-onion-builder-btn primary"
                    disabled={!isStepComplete()}
                    onClick={goNext}
                  >
                    {currentStep === STEPS.length - 1
                      ? "Continue to Buyer Details"
                      : "Continue"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}