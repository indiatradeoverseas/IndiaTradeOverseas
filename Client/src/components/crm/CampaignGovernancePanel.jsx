import React, { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiSave,
  FiShield,
  FiTarget,
  FiUsers,
} from 'react-icons/fi';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const INPUT_CLASS =
  'mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--crm-accent)]/25';

const FIELD_STYLE = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-sunken)',
  color: 'var(--crm-ink)',
};

const CARD_STYLE = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-raised)',
  boxShadow: 'var(--crm-shadow)',
};

const SUNKEN_STYLE = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-sunken)',
};

const VERIFICATION_TYPES = [
  'LANDING_EXPERIENCE',
  'CREATIVE_CLAIMS',
  'WEBSITE_ATTRIBUTION',
  'META_INSTANT_FORM_ATTRIBUTION',
];

const DELIVERY_STATUSES = [
  'RUNNING',
  'PAUSED',
  'STOPPED',
];

const EXPERIMENT_DECISIONS = [
  'TEST',
  'HOLD',
  'STOP',
];

function prettify(value) {
  if (!value) return '—';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value, dateOnly = false) {
  if (!value) return '—';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return dateOnly
    ? parsed.toLocaleDateString('en-IN')
    : parsed.toLocaleString('en-IN');
}

function Field({ label, children, hint }) {
  return (
    <label className="block min-w-0">
      <span
        className="block text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: 'var(--crm-ink-faint)' }}
      >
        {label}
      </span>

      {children}

      {hint && (
        <span
          className="mt-1.5 block text-[11px] leading-5"
          style={{ color: 'var(--crm-ink-faint)' }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function StatusPill({ children, tone = 'neutral' }) {
  const palette = {
    positive: {
      color: 'var(--crm-positive)',
      background: 'var(--crm-positive-bg)',
    },
    warning: {
      color: 'var(--crm-warning)',
      background: 'var(--crm-warning-bg)',
    },
    danger: {
      color: 'var(--crm-danger)',
      background: 'var(--crm-danger-bg)',
    },
    info: {
      color: 'var(--crm-info)',
      background: 'var(--crm-info-bg)',
    },
    neutral: {
      color: 'var(--crm-ink-faint)',
      background: 'var(--crm-bg-sunken)',
    },
  };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
      style={palette[tone] || palette.neutral}
    >
      {children}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, tone = 'neutral' }) {
  const toneColor = {
    positive: 'var(--crm-positive)',
    warning: 'var(--crm-warning)',
    danger: 'var(--crm-danger)',
    info: 'var(--crm-info)',
    neutral: 'var(--crm-accent)',
  }[tone];

  return (
    <div
      className="min-w-0 rounded-xl border p-4"
      style={SUNKEN_STYLE}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
          style={{
            borderColor: 'var(--crm-line)',
            background: 'var(--crm-bg-raised)',
            color: toneColor,
          }}
        >
          <Icon size={16} />
        </div>

        <div className="min-w-0">
          <div
            className="text-[9px] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--crm-ink-faint)' }}
          >
            {label}
          </div>

          <div
            className="mt-1 break-words text-sm font-semibold"
            style={{ color: 'var(--crm-heading)' }}
          >
            {value}
          </div>

          {detail && (
            <div
              className="mt-1 break-words text-[11px] leading-5"
              style={{ color: 'var(--crm-ink-faint)' }}
            >
              {detail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CampaignGovernancePanel({
  campaign,
  user,
  budget,
  setBudget,
  onSaved,
}) {
  const role = String(user?.role || '').toUpperCase();
  const department = String(user?.department || '').toUpperCase();

  const management =
    ['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'SUPER_ADMIN'].includes(role) ||
    ['ADMIN', 'MANAGEMENT'].includes(department);

  const [checks, setChecks] = useState([]);

  const [kind, setKind] = useState(
    management || department === 'IT'
      ? 'release'
      : 'verification'
  );

  const [form, setForm] = useState({
    status: 'RUNNING',
    observedAt: '',
    reference: '',
    notes: '',
    key: '',
    currency: '',
    amount: '',
    through: '',
    decision: 'TEST',
    hypothesis: '',
    salesFeedback: '',
    economicsAccepted: false,
    scope: '',
    rationale: '',
    requiredForGenericAcquisition: true,
    applied: false,
    verificationType:
      department === 'OPERATIONS'
        ? 'CREATIVE_CLAIMS'
        : department === 'MARKETING'
        ? 'LANDING_EXPERIENCE'
        : 'WEBSITE_ATTRIBUTION',
  });

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    axios
      .get('/marketing/controlled-campaigns/release-checks')
      .then((response) => {
        if (!active) return;

        const loadedChecks = response?.data?.data?.checks;

        setChecks(
          Array.isArray(loadedChecks)
            ? loadedChecks
            : []
        );
      })
      .catch(() => {
        if (active) {
          setChecks([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const availableVerificationTypes = useMemo(
    () =>
      VERIFICATION_TYPES.filter(
        (key) =>
          management ||
          (department === 'MARKETING' &&
            key === 'LANDING_EXPERIENCE') ||
          (department === 'OPERATIONS' &&
            key === 'CREATIVE_CLAIMS') ||
          (department === 'IT' &&
            key.includes('ATTRIBUTION'))
      ),
    [department, management]
  );

  const recordOptions = useMemo(() => {
    const options = [];

    if (management || department === 'IT') {
      options.push({
        value: 'release',
        label: 'Release QA evidence',
      });
    }

    options.push({
      value: 'verification',
      label: 'Attribution / landing / claims verification',
    });

    if (management || department === 'MARKETING') {
      options.push(
        {
          value: 'audience',
          label: 'Audience exclusion decision',
        },
        {
          value: 'performance',
          label: 'Actual cumulative spend',
        },
        {
          value: 'delivery',
          label: 'Observed external delivery',
        },
        {
          value: 'experiment',
          label: 'Experiment and sales feedback',
        }
      );
    }

    return options;
  }, [department, management]);

  const verifiedReleaseChecks = Array.isArray(campaign?.releaseChecks)
    ? campaign.releaseChecks.length
    : 0;

  const releaseCheckTotal = checks.length;

  const deliverySummary = campaign?.observedDelivery
    ? `${prettify(campaign.observedDelivery.status)} · ${formatDateTime(
        campaign.observedDelivery.observedAt
      )}`
    : 'No live observation recorded';

  const spendSummary = campaign?.actualPerformance
    ? `${campaign.actualPerformance.currency || '—'} ${
        campaign.actualPerformance.amount ?? '—'
      }`
    : 'Unavailable';

  const spendDetail = campaign?.actualPerformance
    ? `Observed through ${formatDateTime(
        campaign.actualPerformance.through,
        true
      )}`
    : 'Planned budget remains separate from actual spend.';

  const input = (key, label, type = 'text', options = {}) => (
    <Field label={label} hint={options.hint}>
      <input
        className={INPUT_CLASS}
        style={FIELD_STYLE}
        type={type}
        value={form[key]}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            [key]: event.target.value,
          }))
        }
        placeholder={options.placeholder}
        min={options.min}
        step={options.step}
      />
    </Field>
  );

  async function save(event) {
    event.preventDefault();
    setBusy(true);

    try {
      const base =
        `/marketing/controlled-campaigns/${campaign._id}`;

      if (kind === 'audience') {
        await axios.patch(
          `${base}/audience-exclusion`,
          {
            scope: form.scope,
            rationale: form.rationale,
            requiredForGenericAcquisition:
              form.requiredForGenericAcquisition,
            applied: form.applied,
            evidenceReference: form.reference,
          }
        );
      } else if (kind === 'verification') {
        await axios.patch(
          `${base}/prelaunch-verification`,
          {
            verificationType:
              form.verificationType,
            verified: true,
            verificationEvidence: {
              reference: form.reference,
              notes: form.notes,
            },
          }
        );
      } else {
        await axios.patch(
          `${base}/evidence/${kind}`,
          {
            ...form,
            amount:
              form.amount === ''
                ? null
                : Number(form.amount),
            verified: true,
          }
        );
      }

      toast.success('Evidence recorded.');

      if (typeof onSaved === 'function') {
        await onSaved();
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to record campaign evidence.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="my-5 overflow-hidden rounded-2xl border"
      style={CARD_STYLE}
    >
      <div
        className="border-b px-4 py-4 sm:px-5"
        style={{ borderColor: 'var(--crm-line)' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'var(--crm-line)',
                background: 'var(--crm-bg-sunken)',
                color: 'var(--crm-accent)',
              }}
            >
              <FiShield size={17} />
            </div>

            <div className="min-w-0">
              <div
                className="text-[9px] font-bold uppercase tracking-[0.18em]"
                style={{ color: 'var(--crm-accent)' }}
              >
                Governed evidence ledger
              </div>

              <h3
                className="mt-1 text-base font-semibold sm:text-lg"
                style={{ color: 'var(--crm-heading)' }}
              >
                Campaign governance & observed economics
              </h3>

              <p
                className="mt-1 max-w-3xl text-xs leading-5"
                style={{ color: 'var(--crm-ink-faint)' }}
              >
                Record only checks, observations and commercial evidence that have actually been verified. This panel records evidence; it does not launch, pause or stop external advertising.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              tone={
                campaign?.operationsInputsConfirmedAt
                  ? 'positive'
                  : 'warning'
              }
            >
              Operations {campaign?.operationsInputsConfirmedAt ? 'Confirmed' : 'Pending'}
            </StatusPill>

            <StatusPill
              tone={
                campaign?.managementApprovalAt
                  ? 'positive'
                  : 'neutral'
              }
            >
              Management {campaign?.managementApprovalAt ? 'Approved' : 'Pending'}
            </StatusPill>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            icon={FiCheckCircle}
            label="Verified release checks"
            value={`${verifiedReleaseChecks}/${releaseCheckTotal || '—'}`}
            detail="Record a release check only after the underlying QA step has been performed."
            tone={
              releaseCheckTotal > 0 &&
              verifiedReleaseChecks >= releaseCheckTotal
                ? 'positive'
                : 'warning'
            }
          />

          <SummaryCard
            icon={FiActivity}
            label="External delivery"
            value={deliverySummary}
            detail="Observed state only; no external ad-platform action is triggered here."
            tone={campaign?.observedDelivery ? 'info' : 'neutral'}
          />

          <SummaryCard
            icon={FiDollarSign}
            label="Actual cumulative spend"
            value={spendSummary}
            detail={spendDetail}
            tone={campaign?.actualPerformance ? 'info' : 'neutral'}
          />
        </div>

        {management && (
          <fieldset
            className="rounded-xl border p-4 sm:p-5"
            style={SUNKEN_STYLE}
          >
            <legend
              className="px-2 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--crm-accent)' }}
            >
              Management budget for approval
            </legend>

            <div className="mb-4 flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  borderColor: 'var(--crm-line)',
                  background: 'var(--crm-bg-raised)',
                  color: 'var(--crm-accent)',
                }}
              >
                <FiDollarSign size={15} />
              </div>

              <p
                className="text-xs leading-5"
                style={{ color: 'var(--crm-ink-faint)' }}
              >
                These values are passed to the Management approval action on the controlled-campaign workbench. Planned budget remains separate from observed spend.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['currency', 'Currency', 'text'],
                ['amount', 'Approved amount', 'number'],
                ['basis', 'Budget basis', 'text'],
              ].map(([key, label, type]) => (
                <Field key={key} label={label}>
                  <input
                    className={INPUT_CLASS}
                    style={FIELD_STYLE}
                    type={type}
                    min={type === 'number' ? '0' : undefined}
                    value={budget?.[key] ?? ''}
                    onChange={(event) =>
                      setBudget((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        )}

        <form
          onSubmit={save}
          className="overflow-hidden rounded-xl border"
          style={SUNKEN_STYLE}
        >
          <div
            className="border-b px-4 py-4 sm:px-5"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  borderColor: 'var(--crm-line)',
                  background: 'var(--crm-bg-raised)',
                  color: 'var(--crm-accent)',
                }}
              >
                <FiFileText size={16} />
              </div>

              <div>
                <h4
                  className="text-sm font-semibold"
                  style={{ color: 'var(--crm-heading)' }}
                >
                  Record governance evidence
                </h4>

                <p
                  className="mt-1 text-[11px] leading-5"
                  style={{ color: 'var(--crm-ink-faint)' }}
                >
                  Choose the evidence category first. The form below will show only the fields relevant to that record type.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Record type">
                <select
                  className={INPUT_CLASS}
                  style={FIELD_STYLE}
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value)
                  }
                >
                  {recordOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              {kind === 'release' && (
                <Field label="Release check">
                  <select
                    required
                    value={form.key}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        key: event.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                    style={FIELD_STYLE}
                  >
                    <option value="">Select check</option>
                    {checks.map((key) => (
                      <option key={key} value={key}>
                        {prettify(key)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {kind === 'verification' && (
                <Field label="Verification">
                  <select
                    value={form.verificationType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        verificationType:
                          event.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                    style={FIELD_STYLE}
                  >
                    {availableVerificationTypes.map(
                      (key) => (
                        <option key={key} value={key}>
                          {prettify(key)}
                        </option>
                      )
                    )}
                  </select>
                </Field>
              )}
            </div>

            {kind === 'delivery' && (
              <div
                className="rounded-xl border p-4"
                style={CARD_STYLE}
              >
                <div className="mb-4 flex items-start gap-3">
                  <FiActivity
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--crm-accent)' }}
                  />
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: 'var(--crm-heading)' }}
                    >
                      Observed external delivery
                    </div>
                    <p
                      className="mt-1 text-[11px] leading-5"
                      style={{ color: 'var(--crm-ink-faint)' }}
                    >
                      This records an external observation; it does not launch or stop advertising.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Observed status">
                    <select
                      className={INPUT_CLASS}
                      style={FIELD_STYLE}
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      {DELIVERY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {prettify(status)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {input(
                    'observedAt',
                    'Actually observed at',
                    'datetime-local'
                  )}
                </div>
              </div>
            )}

            {kind === 'performance' && (
              <div
                className="rounded-xl border p-4"
                style={CARD_STYLE}
              >
                <div className="mb-4 flex items-start gap-3">
                  <FiBarChart2
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--crm-accent)' }}
                  />
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: 'var(--crm-heading)' }}
                    >
                      Actual cumulative spend
                    </div>
                    <p
                      className="mt-1 text-[11px] leading-5"
                      style={{ color: 'var(--crm-ink-faint)' }}
                    >
                      Store observed spend only. Do not substitute the planned Management budget.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {input(
                    'amount',
                    'Actual cumulative ad spend',
                    'number',
                    { min: '0', step: 'any' }
                  )}
                  {input(
                    'currency',
                    'Currency code',
                    'text',
                    { placeholder: 'e.g. INR' }
                  )}
                  {input(
                    'through',
                    'Observed through',
                    'datetime-local'
                  )}
                </div>
              </div>
            )}

            {kind === 'audience' && (
              <div
                className="rounded-xl border p-4"
                style={CARD_STYLE}
              >
                <div className="mb-4 flex items-start gap-3">
                  <FiUsers
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--crm-accent)' }}
                  />
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: 'var(--crm-heading)' }}
                    >
                      Audience exclusion decision
                    </div>
                    <p
                      className="mt-1 text-[11px] leading-5"
                      style={{ color: 'var(--crm-ink-faint)' }}
                    >
                      Record the approved exclusion scope and whether it has actually been applied externally.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {input('scope', 'Exclusion scope')}
                  {input('rationale', 'Decision rationale')}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[
                    [
                      'requiredForGenericAcquisition',
                      'Exclusion required',
                      'Marks the exclusion as required for generic acquisition.',
                    ],
                    [
                      'applied',
                      'Applied externally, with evidence',
                      'Use only after the external exclusion has actually been applied.',
                    ],
                  ].map(([key, label, description]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                      style={SUNKEN_STYLE}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0"
                        checked={form[key]}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                      />

                      <span className="min-w-0">
                        <span
                          className="block text-xs font-semibold"
                          style={{ color: 'var(--crm-heading)' }}
                        >
                          {label}
                        </span>
                        <span
                          className="mt-1 block text-[11px] leading-5"
                          style={{ color: 'var(--crm-ink-faint)' }}
                        >
                          {description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {kind === 'experiment' && (
              <div
                className="rounded-xl border p-4"
                style={CARD_STYLE}
              >
                <div className="mb-4 flex items-start gap-3">
                  <FiTarget
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--crm-accent)' }}
                  />
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: 'var(--crm-heading)' }}
                    >
                      Experiment & sales feedback
                    </div>
                    <p
                      className="mt-1 text-[11px] leading-5"
                      style={{ color: 'var(--crm-ink-faint)' }}
                    >
                      Capture the tested hypothesis, observed sales feedback and the evidence-backed decision.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {input(
                    'hypothesis',
                    'Hypothesis / variant comparison'
                  )}
                  {input(
                    'salesFeedback',
                    'Sales feedback'
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Decision">
                    <select
                      value={form.decision}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          decision: event.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                      style={FIELD_STYLE}
                    >
                      {[
                        ...EXPERIMENT_DECISIONS,
                        ...(management ? ['SCALE'] : []),
                      ].map((decision) => (
                        <option
                          key={decision}
                          value={decision}
                        >
                          {prettify(decision)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {management && (
                    <label
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                      style={SUNKEN_STYLE}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0"
                        checked={form.economicsAccepted}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            economicsAccepted:
                              event.target.checked,
                          }))
                        }
                      />

                      <span>
                        <span
                          className="block text-xs font-semibold"
                          style={{ color: 'var(--crm-heading)' }}
                        >
                          Management accepts observed economics
                        </span>
                        <span
                          className="mt-1 block text-[11px] leading-5"
                          style={{ color: 'var(--crm-ink-faint)' }}
                        >
                          Acceptance must be supported by the evidence reference and factual notes below.
                        </span>
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {input(
                'reference',
                'Real evidence reference',
                'text',
                {
                  placeholder:
                    'Approved URL, report key, ticket, screenshot reference or other traceable evidence',
                }
              )}

              <Field label="Factual verification notes">
                <textarea
                  rows={4}
                  className={`${INPUT_CLASS} resize-y`}
                  style={FIELD_STYLE}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Record only what was actually verified or observed."
                />
              </Field>
            </div>

            <div
              className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: 'var(--crm-line)' }}
            >
              <div className="flex items-start gap-2">
                <FiAlertCircle
                  className="mt-0.5 shrink-0"
                  size={14}
                  style={{ color: 'var(--crm-warning)' }}
                />
                <p
                  className="max-w-2xl text-[11px] leading-5"
                  style={{ color: 'var(--crm-ink-faint)' }}
                >
                  Evidence should be traceable and factual. Do not use this panel to infer Meta delivery, spend, commercial economics or campaign success.
                </p>
              </div>

              <button
                disabled={busy}
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: 'var(--crm-accent)',
                  color: '#fff',
                }}
              >
                {busy ? (
                  <>
                    <FiClock className="animate-pulse" />
                    Saving…
                  </>
                ) : (
                  <>
                    <FiSave />
                    Record evidence
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
