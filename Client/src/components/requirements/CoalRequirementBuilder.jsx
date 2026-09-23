import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = [
  {
    key: "product",
    title: "Coal",
    subtitle: "Tell us what coal you need.",
  },
  {
    key: "commercial",
    title: "Requirement",
    subtitle: "Add quantity and delivery details.",
  },
  {
    key: "review",
    title: "Review",
    subtitle: "Review your requirement before continuing.",
  },
];

const ORIGINS = [
  "Assam",
  "Jharkhand",
  "Indonesia",
  "U.S.",
  "Other domestic",
  "Other imported",
];

const COAL_TYPES = [
  "Non-coking thermal",
  "Steam",
  "Coking",
  "Metallurgical",
  "Anthracite",
  "Sub-bituminous",
  "Lignite",
  "Not sure",
];

const BASES = [
  "GAR",
  "NAR",
  "ARB",
  "ADB",
  "DB",
  "DAF",
  "Other",
];

const TRANSPORT_MODES = [
  "Road",
  "Rail",
  "Port",
  "Vessel",
  "Multimodal",
  "To be advised",
];

const INITIAL_FORM = {
  company: "",
  origin: "",
  coalType: "",
  gcv: "",
  basis: "",
  orderQty: "",
  estValuation: "",
  dest: "",
  tMode: "",
  incoterm: "",
  reqDate: "",
  notes: "",
  privacy: false,

  // Preserved for compatibility with the existing backend/data shape.
  buyerType: "",
  industry: "",
  plant: "",
  use: "",
  rejVal: "",
  ash: "",
  sulphur: "",
  tm: "",
  vm: "",
  fc: "",
  hgiAft: "",
  trialQty: "",
  monthly: "",
  targetQty: "",
  specFileName: "",
};

export default function CoalRequirementBuilder({
  isOpen,
  open,
  onClose,
  onComplete,
}) {
  const visible = Boolean(isOpen ?? open ?? false);

  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const progress = useMemo(
    () => ((stepIndex + 1) / STEPS.length) * 100,
    [stepIndex]
  );

  const update = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const closeBuilder = () => {
    setStepIndex(0);
    setFormData(INITIAL_FORM);
    onClose?.();
  };

  const validateCurrentStep = () => {
    if (step.key === "product") {
      if (!formData.company.trim()) {
        alert("Please enter your company / organization name.");
        return false;
      }

      if (!formData.origin) {
        alert("Please select the coal origin.");
        return false;
      }

      if (!formData.coalType) {
        alert("Please select the coal type.");
        return false;
      }

      if (!formData.basis) {
        alert("Please select the GCV basis.");
        return false;
      }
    }

    if (step.key === "commercial") {
      const quantity = Number(formData.orderQty);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity in MT.");
        return false;
      }

      const valuation = Number(formData.estValuation);

      if (!Number.isFinite(valuation) || valuation <= 0) {
        alert("Please enter a valid estimated valuation.");
        return false;
      }

      if (!formData.dest.trim()) {
        alert("Please enter the delivery destination.");
        return false;
      }

      if (!formData.tMode) {
        alert("Please select the transport mode.");
        return false;
      }
    }

    if (step.key === "review" && !formData.privacy) {
      alert("Please accept the privacy policy to continue.");
      return false;
    }

    return true;
  };

  const next = () => {
    if (!validateCurrentStep()) return;

    if (isLast) {
      const requirement = {
        ...formData,

        vertical: "COAL",

        gcv:
          formData.gcv === ""
            ? null
            : Number(formData.gcv),

        gcvKcalKg:
          formData.gcv === ""
            ? null
            : Number(formData.gcv),

        orderQty: Number(formData.orderQty),
        orderQtyMT: Number(formData.orderQty),

        estimatedValuationINR: Number(formData.estValuation),
        estValuation: Number(formData.estValuation),

        // Legacy/downstream-compatible defaults.
        trialQty: null,
        trialQtyMT: 0,
        monthly: null,
        monthlyDemandMT: 0,
        targetQty: null,
        targetQtyMT: 0,

        rejVal: null,
        rejectionValueKcalKg: null,
        ash: null,
        ashPercent: null,
        sulphur: null,
        sulphurPercent: null,
        tm: null,
        totalMoisturePercent: null,
        vm: null,
        volatileMatterPercent: null,
        fc: null,
        fixedCarbonPercent: null,
        hgiAft: "",
        specFileName: "",
      };

      onComplete?.(requirement);
      return;
    }

    setStepIndex((previous) =>
      Math.min(previous + 1, STEPS.length - 1)
    );
  };

  const back = () => {
    setStepIndex((previous) =>
      Math.max(previous - 1, 0)
    );
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="coal-builder-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeBuilder();
          }
        }}
      >
        <motion.div
          className="coal-builder-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coal-builder-title"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{
            duration: 0.28,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <style>{`
            .coal-builder-backdrop {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              background: rgba(3, 8, 12, .78);
              backdrop-filter: blur(14px);
              -webkit-backdrop-filter: blur(14px);
            }

            .coal-builder-modal {
              width: min(760px, 100%);
              max-height: min(92vh, 850px);
              overflow: hidden;
              border-radius: 24px;
              background:
                radial-gradient(
                  circle at top right,
                  rgba(212, 168, 79, .12),
                  transparent 30%
                ),
                #101214;
              border: 1px solid rgba(212, 168, 79, .28);
              box-shadow: 0 40px 120px rgba(0, 0, 0, .55);
              color: #F4F0E7;
              display: flex;
              flex-direction: column;
            }

            .coal-builder-header {
              padding: 24px 26px 18px;
              border-bottom: 1px solid rgba(244, 240, 231, .10);
            }

            .coal-builder-header-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
            }

            .coal-builder-kicker {
              color: #D4A84F;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: .18em;
              text-transform: uppercase;
            }

            .coal-builder-header h2 {
              margin: 8px 0 5px;
              font-family: Georgia, "Times New Roman", serif;
              font-size: clamp(30px, 5vw, 44px);
              line-height: 1;
              font-weight: 500;
              letter-spacing: -.04em;
            }

            .coal-builder-header p {
              margin: 0;
              color: rgba(244, 240, 231, .62);
              font-size: 13px;
              line-height: 1.6;
            }

            .coal-builder-close {
              width: 42px;
              height: 42px;
              flex: 0 0 42px;
              border-radius: 50%;
              border: 1px solid rgba(244, 240, 231, .18);
              background: rgba(255, 255, 255, .04);
              color: #F4F0E7;
              font-size: 24px;
              cursor: pointer;
            }

            .coal-builder-progress {
              height: 3px;
              background: rgba(244, 240, 231, .08);
            }

            .coal-builder-progress span {
              display: block;
              height: 100%;
              background: #D4A84F;
              transition: width .3s ease;
            }

            .coal-builder-steps {
              display: flex;
              gap: 8px;
              padding: 13px 26px;
              overflow-x: auto;
              border-bottom: 1px solid rgba(244, 240, 231, .08);
            }

            .coal-builder-step {
              flex: 1 0 auto;
              text-align: center;
              padding: 8px 11px;
              border-radius: 999px;
              border: 1px solid rgba(244, 240, 231, .12);
              color: rgba(244, 240, 231, .45);
              font-size: 10px;
              font-weight: 800;
              letter-spacing: .06em;
              text-transform: uppercase;
            }

            .coal-builder-step.active {
              color: #D4A84F;
              border-color: rgba(212, 168, 79, .45);
              background: rgba(212, 168, 79, .08);
            }

            .coal-builder-body {
              overflow-y: auto;
              padding: 26px;
            }

            .coal-builder-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
            }

            .coal-builder-field {
              display: flex;
              flex-direction: column;
              gap: 7px;
            }

            .coal-builder-field.full {
              grid-column: 1 / -1;
            }

            .coal-builder-field label {
              color: rgba(244, 240, 231, .82);
              font-size: 11px;
              font-weight: 800;
              letter-spacing: .04em;
            }

            .coal-builder-field input,
            .coal-builder-field select,
            .coal-builder-field textarea {
              width: 100%;
              min-height: 48px;
              padding: 11px 13px;
              border-radius: 10px;
              border: 1px solid rgba(244, 240, 231, .16);
              background: rgba(7, 24, 38, .58);
              color: #F4F0E7;
              outline: none;
              font-size: 13px;
            }

            .coal-builder-field textarea {
              min-height: 96px;
              resize: vertical;
            }

            .coal-builder-field input:focus,
            .coal-builder-field select:focus,
            .coal-builder-field textarea:focus {
              border-color: #D4A84F;
              box-shadow: 0 0 0 3px rgba(212, 168, 79, .10);
            }

            .coal-builder-field option {
              background: #071826;
              color: #F4F0E7;
            }

            .coal-builder-help {
              margin: 0 0 20px;
              padding: 13px 15px;
              border-left: 2px solid #D4A84F;
              background: rgba(212, 168, 79, .05);
              color: rgba(244, 240, 231, .62);
              font-size: 11px;
              line-height: 1.65;
            }

            .coal-builder-review {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }

            .coal-builder-review-item {
              padding: 14px;
              border: 1px solid rgba(244, 240, 231, .10);
              border-radius: 12px;
              background: rgba(255, 255, 255, .03);
            }

            .coal-builder-review-item span {
              display: block;
              margin-bottom: 5px;
              color: rgba(244, 240, 231, .42);
              font-size: 9px;
              font-weight: 800;
              letter-spacing: .1em;
              text-transform: uppercase;
            }

            .coal-builder-review-item strong {
              color: #F4F0E7;
              font-size: 13px;
              overflow-wrap: anywhere;
            }

            .coal-builder-consent {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              margin-top: 20px;
              color: rgba(244, 240, 231, .75);
              font-size: 12px;
              line-height: 1.6;
            }

            .coal-builder-consent input {
              margin-top: 3px;
              accent-color: #D4A84F;
            }

            .coal-builder-footer {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 17px 26px;
              border-top: 1px solid rgba(244, 240, 231, .10);
              background: rgba(0, 0, 0, .12);
            }

            .coal-builder-btn {
              min-height: 46px;
              padding: 0 20px;
              border-radius: 999px;
              border: 1px solid rgba(244, 240, 231, .20);
              background: transparent;
              color: #F4F0E7;
              cursor: pointer;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: .10em;
              text-transform: uppercase;
            }

            .coal-builder-btn.primary {
              background: #D4A84F;
              border-color: #D4A84F;
              color: #071826;
            }

            @media (max-width: 700px) {
              .coal-builder-backdrop {
                align-items: flex-end;
                padding: 0;
              }

              .coal-builder-modal {
                width: 100%;
                max-height: 94dvh;
                border-radius: 22px 22px 0 0;
              }

              .coal-builder-header {
                padding: 20px 18px 15px;
              }

              .coal-builder-steps {
                padding: 11px 18px;
              }

              .coal-builder-body {
                padding: 20px 18px;
              }

              .coal-builder-footer {
                padding: 14px 18px;
                flex-direction: column-reverse;
              }

              .coal-builder-grid,
              .coal-builder-review {
                grid-template-columns: 1fr;
              }

              .coal-builder-field.full {
                grid-column: auto;
              }

              .coal-builder-btn {
                width: 100%;
              }
            }
          `}</style>

          <div className="coal-builder-header">
            <div className="coal-builder-header-top">
              <div>
                <div className="coal-builder-kicker">
                  India Trade Overseas · Coal
                </div>

                <h2 id="coal-builder-title">
                  Build Your Coal Requirement
                </h2>

                <p>{step.subtitle}</p>
              </div>

              <button
                type="button"
                className="coal-builder-close"
                onClick={closeBuilder}
                aria-label="Close coal requirement builder"
              >
                ×
              </button>
            </div>
          </div>

          <div className="coal-builder-progress">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="coal-builder-steps">
            {STEPS.map((item, index) => (
              <div
                key={item.key}
                className={`coal-builder-step ${
                  index === stepIndex ? "active" : ""
                }`}
              >
                {index + 1}. {item.title}
              </div>
            ))}
          </div>

          <div className="coal-builder-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                {step.key === "product" && (
                  <>
                    <p className="coal-builder-help">
                      Select the basic coal specification. Detailed lab parameters can be discussed later if required.
                    </p>

                    <div className="coal-builder-grid">
                      <Field
                        label="Company / Organization"
                        value={formData.company}
                        onChange={(value) => update("company", value)}
                        placeholder="Company name"
                      />

                      <SelectField
                        label="Coal Origin"
                        value={formData.origin}
                        onChange={(value) => update("origin", value)}
                        options={ORIGINS}
                      />

                      <SelectField
                        label="Coal Type"
                        value={formData.coalType}
                        onChange={(value) => update("coalType", value)}
                        options={COAL_TYPES}
                      />

                      <Field
                        label="GCV (kcal/kg)"
                        value={formData.gcv}
                        onChange={(value) => update("gcv", value)}
                        type="number"
                        placeholder="e.g. 5500"
                      />

                      <SelectField
                        label="GCV Basis"
                        value={formData.basis}
                        onChange={(value) => update("basis", value)}
                        options={BASES}
                      />
                    </div>
                  </>
                )}

                {step.key === "commercial" && (
                  <>
                    <p className="coal-builder-help">
                      Enter the quantity, delivery destination and commercial value for this requirement.
                    </p>

                    <div className="coal-builder-grid">
                      <Field
                        label="Quantity (MT)"
                        value={formData.orderQty}
                        onChange={(value) => update("orderQty", value)}
                        type="number"
                        placeholder="e.g. 100"
                      />

                      <Field
                        label="Estimated Valuation (₹)"
                        value={formData.estValuation}
                        onChange={(value) => update("estValuation", value)}
                        type="number"
                        placeholder="e.g. 500000"
                      />

                      <Field
                        label="Destination"
                        value={formData.dest}
                        onChange={(value) => update("dest", value)}
                        placeholder="City / plant / delivery location"
                      />

                      <SelectField
                        label="Transport Mode"
                        value={formData.tMode}
                        onChange={(value) => update("tMode", value)}
                        options={TRANSPORT_MODES}
                      />

                      <Field
                        label="Incoterm"
                        value={formData.incoterm}
                        onChange={(value) => update("incoterm", value)}
                        placeholder="Optional"
                      />

                      <Field
                        label="Required By"
                        value={formData.reqDate}
                        onChange={(value) => update("reqDate", value)}
                        type="date"
                      />

                      <Field
                        full
                        textarea
                        label="Additional Notes"
                        value={formData.notes}
                        onChange={(value) => update("notes", value)}
                        placeholder="Optional requirement details"
                      />
                    </div>
                  </>
                )}

                {step.key === "review" && (
                  <>
                    <p className="coal-builder-help">
                      Review the requirement. Your personal contact details will be collected in the next step.
                    </p>

                    <div className="coal-builder-review">
                      <ReviewItem label="Company" value={formData.company} />
                      <ReviewItem label="Origin" value={formData.origin} />
                      <ReviewItem label="Coal Type" value={formData.coalType} />

                      <ReviewItem
                        label="GCV"
                        value={
                          formData.gcv
                            ? `${formData.gcv} kcal/kg ${formData.basis}`
                            : formData.basis
                        }
                      />

                      <ReviewItem
                        label="Quantity"
                        value={`${formData.orderQty} MT`}
                      />

                      <ReviewItem
                        label="Destination"
                        value={formData.dest}
                      />

                      <ReviewItem
                        label="Transport"
                        value={formData.tMode}
                      />

                      <ReviewItem
                        label="Estimated Valuation"
                        value={
                          formData.estValuation
                            ? `₹${Number(
                                formData.estValuation
                              ).toLocaleString("en-IN")}`
                            : ""
                        }
                      />
                    </div>

                    <label className="coal-builder-consent">
                      <input
                        type="checkbox"
                        checked={formData.privacy}
                        onChange={(event) =>
                          update("privacy", event.target.checked)
                        }
                      />

                      <span>
                        I agree to the privacy policy and allow India Trade Overseas to process this requirement for commercial communication and order processing.
                      </span>
                    </label>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="coal-builder-footer">
            <button
              type="button"
              className="coal-builder-btn"
              onClick={isFirst ? closeBuilder : back}
            >
              {isFirst ? "Cancel" : "Back"}
            </button>

            <button
              type="button"
              className="coal-builder-btn primary"
              onClick={next}
            >
              {isLast
                ? "Continue to Personal Details"
                : "Continue"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  textarea = false,
  full = false,
}) {
  return (
    <div className={`coal-builder-field ${full ? "full" : ""}`}>
      <label>{label}</label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div className="coal-builder-field">
      <label>{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReviewItem({
  label,
  value,
}) {
  return (
    <div className="coal-builder-review-item">
      <span>{label}</span>
      <strong>{value || "Not specified"}</strong>
    </div>
  );
}
