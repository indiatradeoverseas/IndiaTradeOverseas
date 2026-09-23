import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = [
  {
    key: "identity",
    title: "Buyer",
    subtitle: "Tell us about the buying organization.",
  },
  {
    key: "application",
    title: "Application",
    subtitle: "Tell us how the coal will be used.",
  },
  {
    key: "product",
    title: "Coal Specification",
    subtitle: "Define the coal you need.",
  },
  {
    key: "volume",
    title: "Volume",
    subtitle: "Tell us the required quantity.",
  },
  {
    key: "delivery",
    title: "Delivery",
    subtitle: "Where and how should it be delivered?",
  },
  {
    key: "evidence",
    title: "Final Details",
    subtitle: "Add supporting information.",
  },
];

const BUYER_TYPES = [
  "Thermal power plant",
  "Cement / sponge-iron",
  "Steel / rolling mill",
  "Trader / distributor",
  "Other",
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
    if (step.key === "identity") {
      if (!formData.company.trim()) {
        alert("Please enter your company / organization name.");
        return false;
      }

      if (!formData.buyerType) {
        alert("Please select the buyer type.");
        return false;
      }
    }

    if (step.key === "application") {
      if (!formData.industry.trim()) {
        alert("Please enter the industry.");
        return false;
      }

      if (!formData.plant.trim()) {
        alert("Please enter the plant / process.");
        return false;
      }
    }

    if (step.key === "product") {
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

    if (step.key === "volume") {
      const hasQuantity =
        Number(formData.orderQty) > 0 ||
        Number(formData.targetQty) > 0 ||
        Number(formData.monthly) > 0;

      if (!hasQuantity) {
        alert("Please provide at least one quantity.");
        return false;
      }

      if (
        formData.estValuation !== "" &&
        Number(formData.estValuation) < 0
      ) {
        alert("Estimated valuation cannot be negative.");
        return false;
      }
    }

    if (step.key === "delivery") {
      if (!formData.dest.trim()) {
        alert("Please enter the destination.");
        return false;
      }

      if (!formData.tMode) {
        alert("Please select the transport mode.");
        return false;
      }
    }

    if (step.key === "evidence") {
      if (!formData.privacy) {
        alert("Please accept the privacy policy to continue.");
        return false;
      }
    }

    return true;
  };

  const next = () => {
    if (!validateCurrentStep()) return;

    if (isLast) {
      const requirement = {
        ...formData,

        vertical: "COAL",

        orderQtyMT: Number(formData.orderQty || 0),
        trialQtyMT: Number(formData.trialQty || 0),
        monthlyDemandMT: Number(formData.monthly || 0),
        targetQtyMT: Number(formData.targetQty || 0),

        estimatedValuationINR: Number(
          formData.estValuation || 0
        ),

        gcvKcalKg:
          formData.gcv === ""
            ? null
            : Number(formData.gcv),

        rejectionValueKcalKg:
          formData.rejVal === ""
            ? null
            : Number(formData.rejVal),

        ashPercent:
          formData.ash === ""
            ? null
            : Number(formData.ash),

        sulphurPercent:
          formData.sulphur === ""
            ? null
            : Number(formData.sulphur),

        totalMoisturePercent:
          formData.tm === ""
            ? null
            : Number(formData.tm),

        volatileMatterPercent:
          formData.vm === ""
            ? null
            : Number(formData.vm),

        fixedCarbonPercent:
          formData.fc === ""
            ? null
            : Number(formData.fc),

        hgiAft: formData.hgiAft || "",
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
              width: min(940px, 100%);
              max-height: min(90vh, 900px);
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
              padding: 26px 28px 18px;
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
              font-size: clamp(32px, 5vw, 48px);
              line-height: .95;
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
              display: flex;
              gap: 8px;
              padding: 14px 28px;
              overflow-x: auto;
              border-bottom: 1px solid rgba(244,240,231,.08);
            }

            .coal-builder-step {
              flex: 0 0 auto;
              padding: 8px 11px;
              border-radius: 999px;
              border: 1px solid rgba(244,240,231,.12);
              color: rgba(244,240,231,.45);
              font-size: 10px;
              font-weight: 800;
              letter-spacing: .06em;
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

            @media(max-width: 700px) {
              .coal-builder-backdrop {
                padding: 10px;
              }

              .coal-builder-modal {
                max-height: 95vh;
                border-radius: 20px;
              }

              .coal-builder-header,
              .coal-builder-body,
              .coal-builder-footer {
                padding-left: 18px;
                padding-right: 18px;
              }

              .coal-builder-grid,
              .coal-builder-grid.three {
                grid-template-columns: 1fr;
              }

              .coal-builder-field.full {
                grid-column: auto;
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

                <p>
                  {step.subtitle}
                </p>
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
                {step.key === "identity" && (
                  <>
                    <p className="coal-builder-help">
                      Your personal contact details are collected in the
                      next step. This section is specifically for the
                      buying organization and buyer profile.
                    </p>

                    <div className="coal-builder-grid">
                      <Field
                        label="Company / Organization"
                        value={formData.company}
                        onChange={(value) =>
                          update("company", value)
                        }
                        placeholder="e.g. ABC Power Pvt. Ltd."
                      />

                      <SelectField
                        label="Buyer Type"
                        value={formData.buyerType}
                        onChange={(value) =>
                          update("buyerType", value)
                        }
                        options={BUYER_TYPES}
                      />
                    </div>
                  </>
                )}

                {step.key === "application" && (
                  <div className="coal-builder-grid">
                    <Field
                      label="Industry"
                      value={formData.industry}
                      onChange={(value) =>
                        update("industry", value)
                      }
                      placeholder="e.g. Power, Cement, Steel"
                    />

                    <Field
                      label="Plant / Process"
                      value={formData.plant}
                      onChange={(value) =>
                        update("plant", value)
                      }
                      placeholder="e.g. 2 x 250 MW thermal plant"
                    />

                    <Field
                      full
                      textarea
                      label="Intended Use"
                      value={formData.use}
                      onChange={(value) =>
                        update("use", value)
                      }
                      placeholder="Describe how the coal will be used."
                    />
                  </div>
                )}

                {step.key === "product" && (
                  <>
                    <p className="coal-builder-help">
                      A GCV number is only useful when its basis is
                      specified. Enter the technical information you
                      already have; unknown values can remain blank.
                    </p>

                    <div className="coal-builder-grid three">
                      <SelectField
                        label="Origin"
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
                        placeholder="e.g. 6200"
                      />

                      <SelectField
                        label="GCV Basis"
                        value={formData.basis}
                        onChange={(value) =>
                          update("basis", value)
                        }
                        options={BASES}
                      />

                      <Field
                        label="Rejection Value (kcal/kg)"
                        value={formData.rejVal}
                        onChange={(value) =>
                          update("rejVal", value)
                        }
                        type="number"
                        placeholder="Optional"
                      />

                      <Field
                        label="Ash %"
                        value={formData.ash}
                        onChange={(value) =>
                          update("ash", value)
                        }
                        type="number"
                        placeholder="Optional"
                      />

                      <Field
                        label="Sulphur %"
                        value={formData.sulphur}
                        onChange={(value) =>
                          update("sulphur", value)
                        }
                        type="number"
                        placeholder="Optional"
                      />

                      <Field
                        label="Total Moisture %"
                        value={formData.tm}
                        onChange={(value) =>
                          update("tm", value)
                        }
                        type="number"
                        placeholder="Optional"
                      />

                      <Field
                        label="Volatile Matter %"
                        value={formData.vm}
                        onChange={(value) =>
                          update("vm", value)
                        }
                        type="number"
                        placeholder="Optional"
                      />

                      <Field
                        label="Fixed Carbon %"
                        value={formData.fc}
                        onChange={(value) =>
                          update("fc", value)
                        }
                        type="number"
                        placeholder="Optional"
                      />

                      <Field
                        label="HGI / AFT"
                        value={formData.hgiAft}
                        onChange={(value) =>
                          update("hgiAft", value)
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </>
                )}

                {step.key === "volume" && (
                  <>
                    <p className="coal-builder-help">
                      Enter whichever quantities are relevant to your
                      requirement. You can provide order quantity,
                      trial quantity, recurring monthly demand and/or
                      target quantity.
                    </p>

                    <div className="coal-builder-grid three">
                      <Field
                        label="Order Quantity (MT)"
                        value={formData.orderQty}
                        onChange={(value) =>
                          update("orderQty", value)
                        }
                        type="number"
                      />

                      <Field
                        label="Trial Quantity (MT)"
                        value={formData.trialQty}
                        onChange={(value) =>
                          update("trialQty", value)
                        }
                        type="number"
                      />

                      <Field
                        label="Recurring Monthly Demand (MT)"
                        value={formData.monthly}
                        onChange={(value) =>
                          update("monthly", value)
                        }
                        type="number"
                      />

                      <Field
                        label="Target Quantity (MT)"
                        value={formData.targetQty}
                        onChange={(value) =>
                          update("targetQty", value)
                        }
                        type="number"
                      />

                      <Field
                        label="Estimated Valuation (INR)"
                        value={formData.estValuation}
                        onChange={(value) =>
                          update("estValuation", value)
                        }
                        type="number"
                        placeholder="Optional"
                      />
                    </div>
                  </>
                )}

                {step.key === "delivery" && (
                  <div className="coal-builder-grid">
                    <Field
                      full
                      label="City / Plant / Port / Country"
                      value={formData.dest}
                      onChange={(value) =>
                        update("dest", value)
                      }
                      placeholder="e.g. Mundra Port, Gujarat"
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
                      placeholder="FOB / CIF / CFR / EXW"
                    />

                    <Field
                      label="Required Date"
                      value={formData.reqDate}
                      onChange={(value) =>
                        update("reqDate", value)
                      }
                      type="date"
                    />
                  </div>
                )}

                {step.key === "evidence" && (
                  <>
                    <div className="coal-builder-grid">
                      <div className="coal-builder-field full">
                        <label>
                          Specification Sheet
                        </label>

                        <input
                          type="file"
                          accept=".pdf,.xls,.xlsx"
                          onChange={(event) => {
                            const file =
                              event.target.files?.[0];

                            update(
                              "specFileName",
                              file?.name || ""
                            );
                          }}
                        />

                        {formData.specFileName && (
                          <small
                            style={{
                              color:
                                "rgba(244,240,231,.55)",
                            }}
                          >
                            Selected:{" "}
                            {formData.specFileName}
                          </small>
                        )}
                      </div>

                      <Field
                        full
                        textarea
                        label="Additional Notes"
                        value={formData.notes}
                        onChange={(value) =>
                          update("notes", value)
                        }
                        placeholder="Any additional commercial or technical requirement."
                      />
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
                        I acknowledge the privacy policy and
                        allow India Trade Overseas to contact
                        me regarding this coal requirement.
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
                ? "Continue to Buyer Details"
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
}) {
  return (
    <div className={`coal-builder-field ${full ? "full" : ""}`}>
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