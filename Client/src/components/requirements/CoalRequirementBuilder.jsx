import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";

const STEPS = [
  {
    key: "coal",
    title: "Coal",
    subtitle: "Select the coal origin, type and GCV basis.",
  },
  {
    key: "requirement",
    title: "Requirement",
    subtitle: "Enter quantity, valuation and delivery details.",
  },
  {
    key: "review",
    title: "Review",
    subtitle: "Review the requirement before entering your contact details.",
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

  // Kept for backend/schema compatibility. These are not required
  // in the simplified buyer-facing flow.
  buyerType: "",
  industry: "",
  plant: "",
  use: "",

  origin: "",
  coalType: "",
  gcv: "",
  basis: "",
  rejVal: "",
  ash: "",
  sulphur: "",
  tm: "",
  vm: "",
  fc: "",
  hgiAft: "",

  orderQty: "",
  trialQty: "",
  monthly: "",
  targetQty: "",
  estValuation: "",

  dest: "",
  tMode: "",
  incoterm: "",
  reqDate: "",

  specFileName: "",
  notes: "",
  privacy: false,
};

export default function CoalRequirementBuilder({
  isOpen,
  open,
  onClose,
  onComplete,
}) {
  const visible = Boolean(isOpen ?? open ?? false);

  const todayDate = (() => {
    const now = new Date();
    const local = new Date(
      now.getTime() -
        now.getTimezoneOffset() * 60000
    );

    return local
      .toISOString()
      .split("T")[0];
  })();

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

  const resetBuilder = () => {
    setStepIndex(0);
    setFormData(INITIAL_FORM);
  };

  const closeBuilder = () => {
    resetBuilder();
    onClose?.();
  };

  const validateCurrentStep = () => {
    if (step.key === "coal") {
      if (!formData.company.trim()) {
        toast.error("Please enter the company / buyer name.");
        return false;
      }

      if (!formData.origin) {
        toast.error("Please select the coal origin.");
        return false;
      }

      if (!formData.coalType) {
        toast.error("Please select the coal type.");
        return false;
      }

      if (!formData.basis) {
        toast.error("Please select the GCV basis.");
        return false;
      }

      if (
        formData.gcv !== "" &&
        (!Number.isFinite(Number(formData.gcv)) ||
          Number(formData.gcv) <= 0)
      ) {
        toast.error("Please enter a valid GCV value.");
        return false;
      }
    }

    if (step.key === "requirement") {
      const quantity = Number(formData.targetQty);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error("Please enter a valid quantity in MT.");
        return false;
      }

      const valuation = Number(formData.estValuation);

      if (!Number.isFinite(valuation) || valuation <= 0) {
        toast.error("Please enter the estimated valuation.");
        return false;
      }

      if (!formData.dest.trim()) {
        toast.error("Please enter the delivery destination.");
        return false;
      }

      if (!formData.tMode) {
        toast.error("Please select the transport mode.");
        return false;
      }
    }

    if (step.key === "review" && !formData.privacy) {
      toast.error("Please accept the privacy policy to continue.");
      return false;
    }

    return true;
  };

  const buildRequirement = () => ({
    ...formData,

    vertical: "COAL",

    // Existing backend expects these original field names.
    gcv:
      formData.gcv === ""
        ? null
        : Number(formData.gcv),

    targetQty: Number(formData.targetQty),
    orderQty: Number(formData.targetQty),

    estValuation: Number(formData.estValuation),

    // Compatibility aliases retained for any CRM/reporting code
    // that already consumes the newer normalized names.
    gcvKcalKg:
      formData.gcv === ""
        ? null
        : Number(formData.gcv),

    targetQtyMT: Number(formData.targetQty),
    orderQtyMT: Number(formData.targetQty),

    estimatedValuationINR: Number(
      formData.estValuation
    ),

    privacy: true,
  });

  const next = () => {
    if (!validateCurrentStep()) return;

    if (isLast) {
      const requirement = buildRequirement();

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
              width: min(900px, 100%);
              max-height: min(92vh, 900px);
              overflow: hidden;
              border-radius: 26px;
              background:
                radial-gradient(
                  circle at top right,
                  rgba(212,168,79,.12),
                  transparent 30%
                ),
                #101214;
              border: 1px solid rgba(212,168,79,.28);
              box-shadow:
                0 40px 120px rgba(0,0,0,.55),
                inset 0 1px 0 rgba(255,255,255,.05);
              color: #F4F0E7;
              display: flex;
              flex-direction: column;
            }

            .coal-builder-header {
              padding: 24px 28px 18px;
              border-bottom: 1px solid rgba(244,240,231,.10);
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
              font-family: Georgia, 'Times New Roman', serif;
              font-size: clamp(30px, 5vw, 46px);
              line-height: .98;
              font-weight: 500;
              letter-spacing: -.04em;
            }

            .coal-builder-header p {
              margin: 0;
              color: rgba(244,240,231,.62);
              font-size: 13px;
              line-height: 1.6;
            }

            .coal-builder-close {
              flex: 0 0 auto;
              width: 42px;
              height: 42px;
              border-radius: 50%;
              border: 1px solid rgba(244,240,231,.18);
              background: rgba(255,255,255,.04);
              color: #F4F0E7;
              font-size: 24px;
              cursor: pointer;
            }

            .coal-builder-progress {
              height: 3px;
              background: rgba(244,240,231,.08);
            }

            .coal-builder-progress span {
              display: block;
              height: 100%;
              background: #D4A84F;
              transition: width .3s ease;
            }

            .coal-builder-steps {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              padding: 14px 28px;
              border-bottom: 1px solid rgba(244,240,231,.08);
            }

            .coal-builder-step {
              padding: 9px 11px;
              border-radius: 999px;
              border: 1px solid rgba(244,240,231,.12);
              color: rgba(244,240,231,.45);
              font-size: 10px;
              font-weight: 800;
              letter-spacing: .06em;
              text-align: center;
              text-transform: uppercase;
            }

            .coal-builder-step.active {
              color: #D4A84F;
              border-color: rgba(212,168,79,.45);
              background: rgba(212,168,79,.08);
            }

            .coal-builder-body {
              overflow-y: auto;
              padding: 28px;
            }

            .coal-builder-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
            }

            .coal-builder-grid.three {
              grid-template-columns: repeat(3, minmax(0, 1fr));
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
              color: rgba(244,240,231,.82);
              font-size: 11px;
              font-weight: 800;
              letter-spacing: .04em;
            }

            .coal-builder-field input,
            .coal-builder-field select,
            .coal-builder-field textarea {
              width: 100%;
              min-height: 46px;
              padding: 11px 13px;
              border-radius: 10px;
              border: 1px solid rgba(244,240,231,.16);
              background: rgba(7,24,38,.58);
              color: #F4F0E7;
              outline: none;
              font-size: 13px;
              box-sizing: border-box;
            }

            .coal-builder-field textarea {
              min-height: 100px;
              resize: vertical;
            }

            .coal-builder-field input:focus,
            .coal-builder-field select:focus,
            .coal-builder-field textarea:focus {
              border-color: #D4A84F;
              box-shadow: 0 0 0 3px rgba(212,168,79,.10);
            }

            .coal-builder-field option {
              background: #071826;
              color: #F4F0E7;
            }

            .coal-builder-help {
              margin: 0 0 20px;
              padding: 13px 15px;
              border-left: 2px solid #D4A84F;
              background: rgba(212,168,79,.05);
              color: rgba(244,240,231,.62);
              font-size: 11px;
              line-height: 1.65;
            }

            .coal-builder-review {
              display: grid;
              grid-template-columns: repeat(2, minmax(0,1fr));
              gap: 12px;
            }

            .coal-builder-review-item {
              padding: 13px 14px;
              border: 1px solid rgba(244,240,231,.10);
              border-radius: 12px;
              background: rgba(255,255,255,.025);
            }

            .coal-builder-review-item small {
              display: block;
              color: #D4A84F;
              font-size: 9px;
              font-weight: 900;
              letter-spacing: .11em;
              text-transform: uppercase;
            }

            .coal-builder-review-item strong {
              display: block;
              margin-top: 5px;
              color: rgba(244,240,231,.86);
              font-size: 13px;
              overflow-wrap: anywhere;
            }

            .coal-builder-consent {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              margin-top: 20px;
              color: rgba(244,240,231,.75);
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
              padding: 18px 28px;
              border-top: 1px solid rgba(244,240,231,.10);
              background: rgba(0,0,0,.12);
            }

            .coal-builder-btn {
              min-height: 46px;
              padding: 0 20px;
              border-radius: 999px;
              border: 1px solid rgba(244,240,231,.20);
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

            .coal-date-field {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .coal-date-label-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }

            .coal-date-label-row label {
              color: rgba(244,240,231,.82);
              font-size: 11px;
              font-weight: 800;
              letter-spacing: .04em;
            }

            .coal-date-label-row span {
              color: rgba(212,168,79,.78);
              font-size: 9px;
              font-weight: 800;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .coal-date-input-wrap {
              position: relative;
            }

            .coal-date-input-wrap input {
              width: 100%;
              min-height: 52px;
              padding: 12px 48px 12px 14px;
              border-radius: 12px;
              border: 1px solid rgba(212,168,79,.28);
              background:
                linear-gradient(
                  145deg,
                  rgba(7,24,38,.92),
                  rgba(16,18,20,.96)
                );
              color: #F4F0E7;
              outline: none;
              font-size: 14px;
              color-scheme: dark;
              transition:
                border-color .2s ease,
                box-shadow .2s ease,
                background .2s ease;
            }

            .coal-date-input-wrap input:focus {
              border-color: #D4A84F;
              box-shadow: 0 0 0 3px rgba(212,168,79,.12);
              background: rgba(7,24,38,.98);
            }

            .coal-date-input-wrap input::-webkit-calendar-picker-indicator {
              cursor: pointer;
              opacity: .9;
              filter: invert(82%) sepia(34%) saturate(844%) hue-rotate(356deg) brightness(92%) contrast(88%);
            }

            .coal-date-icon {
              position: absolute;
              right: 14px;
              top: 50%;
              transform: translateY(-50%);
              pointer-events: none;
              color: #D4A84F;
              font-size: 15px;
              opacity: .9;
            }

            .coal-date-help {
              margin: 0;
              color: rgba(244,240,231,.48);
              font-size: 10px;
              line-height: 1.55;
            }

            @media(max-width: 700px) {
              .coal-builder-backdrop {
                padding: 8px;
              }

              .coal-builder-modal {
                max-height: 96vh;
                border-radius: 18px;
              }

              .coal-builder-header,
              .coal-builder-body,
              .coal-builder-footer {
                padding-left: 16px;
                padding-right: 16px;
              }

              .coal-builder-steps {
                padding-left: 16px;
                padding-right: 16px;
                grid-template-columns: 1fr;
              }

              .coal-builder-grid,
              .coal-builder-grid.three,
              .coal-builder-review {
                grid-template-columns: 1fr;
              }

              .coal-builder-field.full {
                grid-column: auto;
              }

              .coal-builder-btn {
                padding: 0 16px;
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
                {step.key === "coal" && (
                  <>
                    <p className="coal-builder-help">
                      Enter the commercial buyer name and the core coal
                      specification. Optional technical values can be added
                      later through notes or the commercial team.
                    </p>

                    <div className="coal-builder-grid">
                      <Field
                        label="Company / Buyer"
                        value={formData.company}
                        onChange={(value) =>
                          update("company", value)
                        }
                        placeholder="Company name"
                      />

                      <SelectField
                        label="Coal Origin"
                        value={formData.origin}
                        onChange={(value) =>
                          update("origin", value)
                        }
                        options={ORIGINS}
                      />

                      <SelectField
                        label="Coal Type"
                        value={formData.coalType}
                        onChange={(value) =>
                          update("coalType", value)
                        }
                        options={COAL_TYPES}
                      />

                      <Field
                        label="GCV (kcal/kg)"
                        value={formData.gcv}
                        onChange={(value) =>
                          update("gcv", value)
                        }
                        type="number"
                        placeholder="Optional"
                      />

                      <SelectField
                        label="GCV Basis"
                        value={formData.basis}
                        onChange={(value) =>
                          update("basis", value)
                        }
                        options={BASES}
                      />
                    </div>
                  </>
                )}

                {step.key === "requirement" && (
                  <>
                    <p className="coal-builder-help">
                      Estimated valuation is used by the backend to calculate
                      GST and the total payable amount. Enter the total
                      commercial valuation before GST.
                    </p>

                    <div className="coal-builder-grid">
                      <Field
                        label="Quantity (MT)"
                        value={formData.targetQty}
                        onChange={(value) =>
                          update("targetQty", value)
                        }
                        type="number"
                        min="0"
                        placeholder="e.g. 100"
                      />

                      <Field
                        label="Estimated Valuation (INR)"
                        value={formData.estValuation}
                        onChange={(value) =>
                          update("estValuation", value)
                        }
                        type="number"
                        min="0"
                        placeholder="Required"
                      />

                      <Field
                        full
                        label="Destination"
                        value={formData.dest}
                        onChange={(value) =>
                          update("dest", value)
                        }
                        placeholder="City / Plant / Port / Country"
                      />

                      <SelectField
                        label="Transport Mode"
                        value={formData.tMode}
                        onChange={(value) =>
                          update("tMode", value)
                        }
                        options={TRANSPORT_MODES}
                      />

                      <Field
                        label="Incoterm"
                        value={formData.incoterm}
                        onChange={(value) =>
                          update("incoterm", value)
                        }
                        placeholder="Optional - FOB / CIF / CFR / EXW"
                      />

                      <div className="coal-date-field">
                        <div className="coal-date-label-row">
                          <label htmlFor="coal-required-by">
                            Required By
                          </label>

                          <span>
                            Optional
                          </span>
                        </div>

                        <div className="coal-date-input-wrap">
                          <input
                            id="coal-required-by"
                            type="date"
                            value={formData.reqDate}
                            min={todayDate}
                            onChange={(event) =>
                              update(
                                "reqDate",
                                event.target.value
                              )
                            }
                            aria-describedby="coal-required-by-help"
                          />

                          <span
                            className="coal-date-icon"
                            aria-hidden="true"
                          >
                            ◫
                          </span>
                        </div>

                        <p
                          id="coal-required-by-help"
                          className="coal-date-help"
                        >
                          Select the expected delivery or dispatch date.
                          Past dates are disabled.
                        </p>
                      </div>

                      <Field
                        full
                        textarea
                        label="Additional Notes"
                        value={formData.notes}
                        onChange={(value) =>
                          update("notes", value)
                        }
                        placeholder="Optional technical, inspection, sampling or commercial requirement."
                      />
                    </div>
                  </>
                )}

                {step.key === "review" && (
                  <>
                    <div className="coal-builder-review">
                      {[
                        ["Company / Buyer", formData.company],
                        ["Origin", formData.origin],
                        ["Coal Type", formData.coalType],
                        [
                          "GCV",
                          formData.gcv
                            ? `${formData.gcv} kcal/kg`
                            : "Not specified",
                        ],
                        ["Basis", formData.basis],
                        [
                          "Quantity",
                          `${formData.targetQty || 0} MT`,
                        ],
                        [
                          "Estimated Valuation",
                          formData.estValuation
                            ? `₹${Number(
                                formData.estValuation
                              ).toLocaleString("en-IN")}`
                            : "Not specified",
                        ],
                        ["Destination", formData.dest],
                        ["Transport", formData.tMode],
                        [
                          "Incoterm",
                          formData.incoterm ||
                            "Not specified",
                        ],
                        [
                          "Required By",
                          formData.reqDate ||
                            "Not specified",
                        ],
                        [
                          "Notes",
                          formData.notes ||
                            "Not specified",
                        ],
                      ].map(([label, value]) => (
                        <div
                          className="coal-builder-review-item"
                          key={label}
                        >
                          <small>{label}</small>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>

                    <label className="coal-builder-consent">
                      <input
                        type="checkbox"
                        checked={formData.privacy}
                        onChange={(event) =>
                          update(
                            "privacy",
                            event.target.checked
                          )
                        }
                      />

                      <span>
                        I acknowledge the privacy policy and allow India Trade
                        Overseas to contact me regarding this Coal requirement.
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
  type = "text",
  placeholder = "",
  textarea = false,
  full = false,
  min,
}) {
  return (
    <div
      className={`coal-builder-field ${
        full ? "full" : ""
      }`}
    >
      <label>{label}</label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          min={min}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
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
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
