import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiGlobe,
  FiPackage,
  FiPhone,
  FiShield,
  FiUser,
} from 'react-icons/fi';

import { leadsApi } from '../api/leads';
import {
  DPR_EVENTS,
  pushDprEvent,
  getAnalyticsConsent,
  getFirstPartyAttribution,
} from '../utils/analytics';

const fields = {
  RICE: [
    ['grade', 'Variety / grade required', 'e.g. 1121 Basmati, PR-11, Sugandha'],
    ['quantity', 'Quantity and unit', 'e.g. 50 MT / 1 container'],
    ['packaging', 'Packaging required', 'e.g. 25 KG PP bags'],
    ['destination', 'Destination / port', 'e.g. Lucknow / Nhava Sheva Port'],
    ['timeline', 'Required timeline', 'e.g. Within 15 days'],
    ['incoterm', 'Incoterm', 'Optional — FOB / CIF / CFR'],
    ['qualityRequirement', 'Quality requirement', 'Optional — broken %, moisture, sortex etc.'],
  ],
  TEA: [
    ['grade', 'Tea type / grade required', 'e.g. CTC / Orthodox / selected grade'],
    ['quantity', 'Quantity and unit', 'e.g. 2 MT / 100 bags'],
    ['packaging', 'Packaging required', 'e.g. Bulk sacks / custom packing'],
    ['destination', 'Destination', 'e.g. Delhi / Dubai'],
    ['timeline', 'Required timeline', 'e.g. Within 30 days'],
    [
      'privateLabelRequirement',
      'Private-label enquiry',
      'Optional — branding / packing requirement',
    ],
  ],
  ITO_ADS: [
    ['businessCategory', 'Business category', 'e.g. Real estate / education / retail'],
    ['destination', 'Target location', 'e.g. Lucknow / Delhi NCR'],
    ['objective', 'Campaign objective', 'e.g. Leads / calls / WhatsApp / sales'],
    ['monthlyAdBudget', 'Monthly ad budget', 'Enter proposed monthly budget'],
    ['budgetCurrency', 'Budget currency', 'e.g. INR / USD'],
    ['marketingStatus', 'Current marketing status', 'Tell us what is already running'],
    ['timeline', 'Required timeline', 'e.g. Start this month'],
  ],
};

const OPTIONAL_FIELDS = new Set([
  'incoterm',
  'qualityRequirement',
  'privateLabelRequirement',
]);

const THEME = {
  RICE: {
    eyebrow: 'Prakriti Rice · Commercial Sourcing',
    title: 'Tell us what you need.',
    subtitle:
      'Share the commercial requirement first. Our team reviews availability, packing, logistics and final quotation before confirming supply.',
    accent: '#D9B85C',
    accentSoft: '#F2E3B4',
    ink: '#5A4422',
    deep: '#3F2D13',
    panel: '#4A3819',
    surface: '#FFF9EC',
    line: '#E7D7B3',
  },
  TEA: {
    eyebrow: 'Prakriti Tea · Commercial Sourcing',
    title: 'Build your tea requirement.',
    subtitle:
      'Share the grade, quantity, packing and destination. Final availability and commercial terms are confirmed after review.',
    accent: '#50C878',
    accentSoft: '#DDF4E5',
    ink: '#0B3D2E',
    deep: '#07291F',
    panel: '#0F2E24',
    surface: '#FAF9F5',
    line: '#D5E5DD',
  },
  ITO_ADS: {
    eyebrow: 'ITO Ads · Campaign Requirement',
    title: 'Share your campaign brief.',
    subtitle:
      'Tell us the objective, market and working budget so the advertising requirement can be reviewed before any commitment.',
    accent: '#C7A24A',
    accentSoft: '#F4E9C9',
    ink: '#111214',
    deep: '#111214',
    panel: '#202226',
    surface: '#F7F4ED',
    line: '#DED8CA',
  },
};

const STEP_LABELS = [
  { number: '01', label: 'Requirement' },
  { number: '02', label: 'Contact' },
  { number: '03', label: 'Business details' },
];

function createSubmissionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web_${crypto.randomUUID()}`;
  }

  return `web_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export default function CommercialRequirement({ category }) {
  const [values, setValues] = useState({
    tradeType: '',
    phone: '',
    contact: false,
    marketing: false,
  });
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submissionId] = useState(createSubmissionId);

  const theme = THEME[category] || THEME.ITO_ADS;
  const categoryFields = fields[category] || [];

  const summary = useMemo(() => {
    const primary =
      category === 'ITO_ADS'
        ? values.businessCategory
        : values.grade;

    return [
      primary,
      values.quantity || values.objective,
      values.destination,
      values.timeline,
    ].filter(Boolean);
  }, [category, values]);

  const event = (name, extra = {}) =>
    pushDprEvent(name, {
      product_vertical: category,
      product_category: category,
      landing_page_type: 'PRODUCT_REQUIREMENT',
      ...extra,
    });

  const markRequirementStarted = () => {
    if (started) return;
    setStarted(true);
    event(DPR_EVENTS.START_REQUIREMENT);
  };

  const fireRequirementSelectionEvents = () => {
    markRequirementStarted();

    event(DPR_EVENTS.SELECT_PRODUCT, {
      ...(category === 'ITO_ADS'
        ? { business_category: values.businessCategory }
        : { variant_size_grade: values.grade }),
    });

    if (values.quantity) {
      event(DPR_EVENTS.SELECT_QUANTITY, {
        quantity_band: values.quantity,
      });
    }

    if (values.destination) {
      event(DPR_EVENTS.ENTER_DESTINATION, {
        destination_city: values.destination,
      });
    }

    if (values.timeline) {
      event(DPR_EVENTS.SELECT_TIMELINE, {
        timeline: values.timeline,
      });
    }

    event(DPR_EVENTS.VIEW_SOFT_GATE);
  };

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (step === 0) {
      fireRequirementSelectionEvents();
      setStep(1);
      return;
    }

    if (step === 1) {
      const phoneDigits = String(values.phone || '').replace(/\D/g, '');

      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        setError('Please enter a valid Mobile / WhatsApp number including country code.');
        return;
      }

      if (!values.contact) {
        setError('Please accept the enquiry-contact consent to continue.');
        return;
      }
    }

    setBusy(true);

    try {
      if (result) {
        await leadsApi.updateWebsiteLeadProfile({
          submissionId,
          leadId: result.leadId,
          customerName: values.name,
          companyName: values.company,
          email: values.email,
        });

        if (values.name || values.company || values.email) {
          event(DPR_EVENTS.QUALIFICATION_COMPLETED);
        }

        setStep(3);
        return;
      }

      event(DPR_EVENTS.SUBMIT_PHONE, {
        submission_id: submissionId,
      });

      const consent = getAnalyticsConsent();
      const data = await leadsApi.createWebsiteLead({
        ...values,
        captureMode: 'REQUIREMENT_BUILDER',
        productCategory: category,
        product: category === 'ITO_ADS' ? 'ITO Ads' : values.grade,
        submissionId,
        consent: {
          contactAllowed: values.contact,
          marketingAllowed: values.marketing,
          analyticsAllowed: consent.analytics,
          advertisingAllowed: consent.advertising,
          privacyVersion: 'privacy-policy-2026-09',
        },
        attribution: getFirstPartyAttribution(),
      });

      const saved = data.data || data;

      if (!saved.persisted || !saved.leadId || !saved.leadCreatedEventId) {
        throw new Error('Lead persistence was not confirmed. Retry using this form.');
      }

      pushDprEvent(
        DPR_EVENTS.LEAD_CREATED,
        {
          product_vertical: category,
          product_category: category,
          landing_page_type: 'PRODUCT_REQUIREMENT',
        },
        { eventId: saved.leadCreatedEventId }
      );

      setResult(saved);
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save the enquiry. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  const updateValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const renderInput = (key, label, placeholder, required = true, type = 'text') => (
    <label key={key} className="group block">
      <span
        className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.13em]"
        style={{ color: theme.ink }}
      >
        {label}
        {!required && (
          <span className="font-medium normal-case tracking-normal text-neutral-400">
            · optional
          </span>
        )}
      </span>

      <input
        required={required}
        type={type}
        value={values[key] || ''}
        placeholder={placeholder}
        onChange={(e) => updateValue(key, e.target.value)}
        className="h-12 w-full rounded-xl border bg-white px-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:ring-2"
        style={{
          borderColor: theme.line,
          '--tw-ring-color': `${theme.accent}55`,
        }}
      />
    </label>
  );

  const activeStep = Math.min(step, 2);

  return (
    <section id="commercial-requirement" className="w-full py-4 sm:py-8 font-sans">
      <div
        className="mx-auto overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(31,24,12,0.12)]"
        style={{ borderColor: theme.line, backgroundColor: theme.surface }}
      >
        <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
          <aside
            className="relative overflow-hidden px-6 py-8 text-white sm:px-9 sm:py-10 lg:min-h-[620px] lg:px-10 lg:py-12"
            style={{ backgroundColor: theme.panel }}
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: theme.accent }}
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full opacity-10 blur-2xl"
              style={{ backgroundColor: theme.accent }}
            />

            <div className="relative flex h-full flex-col">
              <div>
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    color: theme.accent,
                    borderColor: `${theme.accent}66`,
                    backgroundColor: `${theme.accent}12`,
                  }}
                >
                  <FiGlobe size={13} />
                  {theme.eyebrow}
                </span>

                <h2 className="mt-6 max-w-md font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                  {theme.title}
                </h2>

                <p className="mt-4 max-w-md text-sm leading-6 text-white/70 sm:text-[15px]">
                  {theme.subtitle}
                </p>
              </div>

              <div className="mt-8 space-y-3 sm:mt-10">
                {[
                  {
                    icon: FiPackage,
                    title: 'Requirement first',
                    text: 'Product, quantity, destination and timeline are captured before contact details.',
                  },
                  {
                    icon: FiShield,
                    title: 'No blind price promise',
                    text: 'Availability and commercial terms are confirmed only after review.',
                  },
                  {
                    icon: FiPhone,
                    title: 'Sales follow-up',
                    text: 'Your enquiry is routed to the commercial team after successful persistence.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-2xl border p-4"
                    style={{
                      borderColor: 'rgba(255,255,255,0.10)',
                      backgroundColor: 'rgba(255,255,255,0.045)',
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${theme.accent}18`,
                        color: theme.accent,
                      }}
                    >
                      <Icon size={17} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{title}</div>
                      <p className="mt-1 text-xs leading-5 text-white/55">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-8 text-[11px] leading-5 text-white/45">
                Final price, freight, availability and delivery commitment remain subject to commercial review.
              </div>
            </div>
          </aside>

          <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-12">
            <div className="mb-8">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {STEP_LABELS.map((item, index) => {
                  const completed = step > index;
                  const active = activeStep === index;

                  return (
                    <div key={item.number} className="min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                          style={{
                            borderColor: active || completed ? theme.accent : theme.line,
                            backgroundColor: completed
                              ? theme.accent
                              : active
                                ? theme.accentSoft
                                : '#FFFFFF',
                            color: completed ? theme.deep : theme.ink,
                          }}
                        >
                          {completed ? <FiCheck size={13} /> : item.number}
                        </div>
                        <span
                          className="hidden truncate text-[10px] font-bold uppercase tracking-[0.12em] sm:block"
                          style={{ color: active || completed ? theme.ink : '#9CA3AF' }}
                        >
                          {item.label}
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full"
                        style={{
                          backgroundColor: active || completed ? theme.accent : theme.line,
                          opacity: active || completed ? 1 : 0.65,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {result && (
              <div
                role="status"
                className="mb-6 flex gap-3 rounded-2xl border p-4"
                style={{
                  borderColor: `${theme.accent}88`,
                  backgroundColor: theme.accentSoft,
                  color: theme.ink,
                }}
              >
                <FiCheckCircle className="mt-0.5 shrink-0" size={20} />
                <div>
                  <div className="text-sm font-semibold">Enquiry securely saved</div>
                  <p className="mt-1 text-xs leading-5 opacity-75">
                    Reference: <span className="font-bold">{result.leadCode}</span>. Our commercial team can now review the requirement.
                  </p>
                </div>
              </div>
            )}

            {step !== 3 ? (
              <form
                onSubmit={submit}
                onFocusCapture={step === 0 ? markRequirementStarted : undefined}
                className="space-y-6"
              >
                {step === 0 && (
                  <>
                    <div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: theme.accent }}
                      >
                        Step 01
                      </div>
                      <h3
                        className="mt-2 font-serif text-2xl font-semibold sm:text-[28px]"
                        style={{ color: theme.ink }}
                      >
                        Commercial requirement
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        Give us enough information to understand the buying requirement before we ask for your contact details.
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      {categoryFields.map(([key, label, placeholder]) =>
                        renderInput(
                          key,
                          label,
                          placeholder,
                          !OPTIONAL_FIELDS.has(key)
                        )
                      )}
                    </div>

                    {category !== 'ITO_ADS' && (
                      <label className="block">
                        <span
                          className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em]"
                          style={{ color: theme.ink }}
                        >
                          Supply requirement
                        </span>
                        <div className="relative">
                          <select
                            required
                            value={values.tradeType}
                            onChange={(e) => updateValue('tradeType', e.target.value)}
                            className="h-12 w-full appearance-none rounded-xl border bg-white px-4 pr-10 text-sm text-neutral-900 outline-none transition focus:ring-2"
                            style={{
                              borderColor: theme.line,
                              '--tw-ring-color': `${theme.accent}55`,
                            }}
                          >
                            <option value="">Select domestic / export</option>
                            <option value="DOMESTIC">Domestic supply</option>
                            <option value="EXPORT">Export requirement</option>
                          </select>
                          <span
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs"
                            style={{ color: theme.ink }}
                          >
                            ▾
                          </span>
                        </div>
                      </label>
                    )}
                  </>
                )}

                {step === 1 && (
                  <>
                    <div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: theme.accent }}
                      >
                        Step 02
                      </div>
                      <h3
                        className="mt-2 font-serif text-2xl font-semibold sm:text-[28px]"
                        style={{ color: theme.ink }}
                      >
                        Where should our team reach you?
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        We only need a valid mobile or WhatsApp number to create the enquiry. Additional profile details stay optional.
                      </p>
                    </div>

                    {summary.length > 0 && (
                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: theme.line, backgroundColor: `${theme.accentSoft}88` }}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                          Requirement summary
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {summary.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold"
                              style={{ borderColor: theme.line, color: theme.ink }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <div
                        className="pointer-events-none absolute left-4 top-[42px] z-10"
                        style={{ color: theme.ink }}
                      >
                        <FiPhone size={17} />
                      </div>
                      <label className="block">
                        <span
                          className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em]"
                          style={{ color: theme.ink }}
                        >
                          Mobile / WhatsApp including country code
                        </span>
                        <input
                          required
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={values.phone || ''}
                          placeholder="e.g. +91 98765 43210"
                          onChange={(e) => updateValue('phone', e.target.value)}
                          className="h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:ring-2"
                          style={{
                            borderColor: theme.line,
                            '--tw-ring-color': `${theme.accent}55`,
                          }}
                        />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <label
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4"
                        style={{ borderColor: theme.line }}
                      >
                        <input
                          required
                          type="checkbox"
                          checked={values.contact}
                          onChange={(e) => updateValue('contact', e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ accentColor: theme.accent }}
                        />
                        <span className="text-xs leading-5 text-neutral-600">
                          I agree to be contacted by India Trade Overseas regarding this enquiry and acknowledge the{' '}
                          <Link
                            className="font-semibold underline underline-offset-4"
                            style={{ color: theme.ink }}
                            to="/privacy-policy"
                          >
                            Privacy Policy
                          </Link>
                          .
                        </span>
                      </label>

                      <label
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4"
                        style={{ borderColor: theme.line }}
                      >
                        <input
                          type="checkbox"
                          checked={values.marketing}
                          onChange={(e) => updateValue('marketing', e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ accentColor: theme.accent }}
                        />
                        <span className="text-xs leading-5 text-neutral-600">
                          Optional: send me relevant product and promotional updates.
                        </span>
                      </label>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: theme.accent }}
                      >
                        Step 03 · optional
                      </div>
                      <h3
                        className="mt-2 font-serif text-2xl font-semibold sm:text-[28px]"
                        style={{ color: theme.ink }}
                      >
                        Add business details
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        Your enquiry is already saved. These details simply help the team prepare for a better commercial response.
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      {renderInput('name', 'Name', 'Your name', false)}
                      {renderInput('company', 'Company', 'Company / business name', false)}
                      <div className="md:col-span-2">
                        {renderInput('email', 'Email', 'name@company.com', false, 'email')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-sm font-semibold underline underline-offset-4"
                      style={{ color: theme.ink }}
                    >
                      Skip optional details
                    </button>
                  </>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: theme.line }}>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <FiShield size={14} />
                    <span>Secure enquiry · no automatic price commitment</span>
                  </div>

                  <button
                    disabled={busy}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: theme.accent, color: theme.deep }}
                  >
                    {busy
                      ? 'Saving…'
                      : step === 0
                        ? 'Continue to contact'
                        : step === 1
                          ? 'Request commercial review'
                          : 'Save business details'}
                    {!busy && <FiArrowRight size={17} />}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.accentSoft, color: theme.ink }}
                >
                  <FiCheckCircle size={30} />
                </div>

                <h3
                  className="mt-5 font-serif text-3xl font-semibold"
                  style={{ color: theme.ink }}
                >
                  Requirement received.
                </h3>

                <p className="mt-3 max-w-md text-sm leading-6 text-neutral-500">
                  Your enquiry has been saved for commercial review. The team will use the submitted requirement and contact details for follow-up.
                </p>

                {result?.leadCode && (
                  <div
                    className="mt-5 rounded-full border px-4 py-2 text-xs font-bold"
                    style={{ borderColor: theme.line, color: theme.ink }}
                  >
                    Reference · {result.leadCode}
                  </div>
                )}

                <div className="mt-5 flex items-center gap-2 text-xs text-neutral-400">
                  <FiClock size={14} />
                  Commercial availability and pricing are confirmed after review.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
