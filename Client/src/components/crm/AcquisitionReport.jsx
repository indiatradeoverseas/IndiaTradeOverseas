import SalesPolicy from './SalesPolicy';
import React, { useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiClock,
  FiDownload,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
} from 'react-icons/fi';

import axios from '../../api/axiosInstance';

const cardStyle = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-raised)',
  boxShadow: 'var(--crm-shadow)',
};

const sunkenStyle = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-sunken)',
};

const INPUT =
  'mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2';

function toIsoOrUndefined(value) {
  if (!value) return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatGeneratedAt(value) {
  if (!value) return 'Unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return date.toLocaleString('en-IN');
}

function formatMoney(currency, value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Unavailable';
  }

  return `${currency || ''} ${value}`.trim();
}

function prettify(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={cardStyle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{
              color: 'var(--crm-ink-faint)',
            }}
          >
            {label}
          </div>

          <div
            className="mt-2 break-words text-xl font-semibold"
            style={{
              color: 'var(--crm-heading)',
            }}
          >
            {value}
          </div>

          {hint && (
            <div
              className="mt-1 text-[11px] leading-5"
              style={{
                color: 'var(--crm-ink-faint)',
              }}
            >
              {hint}
            </div>
          )}
        </div>

        <div
          className="shrink-0 rounded-lg border p-2"
          style={{
            borderColor: 'var(--crm-line)',
            background: 'var(--crm-bg-sunken)',
            color: 'var(--crm-accent)',
          }}
        >
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="rounded-lg border p-2"
        style={{
          borderColor: 'var(--crm-line)',
          background: 'var(--crm-bg-sunken)',
          color: 'var(--crm-accent)',
        }}
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <h3
          className="text-sm font-semibold"
          style={{
            color: 'var(--crm-heading)',
          }}
        >
          {title}
        </h3>

        {description && (
          <p
            className="mt-1 text-xs leading-5"
            style={{
              color: 'var(--crm-ink-faint)',
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AcquisitionReport() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] =
    useState(false);

  const campaigns = safeArray(data?.campaigns);
  const funnel = safeArray(data?.funnel);
  const leadBreakdown =
    safeArray(data?.leadBreakdown);
  const diagnostics =
    safeArray(data?.diagnostics);

  const summary = useMemo(() => {
    return campaigns.reduce(
      (acc, item) => {
        const observed =
          item?.observed?.overall || {};

        acc.leads +=
          Number(observed.leads) || 0;

        acc.qualified +=
          Number(observed.qualifiedLeads) || 0;

        acc.quotes +=
          Number(observed.quotes) || 0;

        acc.orders +=
          Number(observed.orders) || 0;

        return acc;
      },
      {
        leads: 0,
        qualified: 0,
        quotes: 0,
        orders: 0,
      }
    );
  }, [campaigns]);

  function getParams(extra = {}) {
    return {
      from:
        toIsoOrUndefined(from),
      to:
        toIsoOrUndefined(to),
      ...extra,
    };
  }

  async function load() {
    setBusy(true);
    setError('');

    try {
      const response =
        await axios.get(
          '/reports/acquisition',
          {
            params: getParams(),
          }
        );

      setData(
        response?.data?.data ?? null
      );
    } catch (loadError) {
      setError(
        loadError?.response?.data?.message ||
          loadError?.message ||
          'Unable to load the acquisition report.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setDownloading(true);
    setError('');

    try {
      const response =
        await axios.get(
          '/reports/acquisition',
          {
            params: getParams({
              export: 'true',
            }),
          }
        );

      const payload =
        response?.data?.data ?? null;

      const url =
        URL.createObjectURL(
          new Blob(
            [
              JSON.stringify(
                payload,
                null,
                2
              ),
            ],
            {
              type: 'application/json',
            }
          )
        );

      const anchor =
        document.createElement('a');

      anchor.href = url;
      anchor.download =
        'acquisition-report.json';

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        1000
      );
    } catch (downloadError) {
      setError(
        downloadError?.response?.data?.message ||
          downloadError?.message ||
          'Unable to download the acquisition report.'
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section
      className="my-5 overflow-hidden rounded-2xl border"
      style={cardStyle}
    >
      <div
        className="border-b px-4 py-4 sm:px-5"
        style={{
          borderColor: 'var(--crm-line)',
          background:
            'var(--crm-bg-raised)',
        }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{
                color:
                  'var(--crm-accent)',
              }}
            >
              Acquisition Oversight
            </div>

            <h2
              className="mt-1 text-lg font-semibold sm:text-xl"
              style={{
                color:
                  'var(--crm-heading)',
              }}
            >
              Acquisition Command Center
            </h2>

            <p
              className="mt-1 max-w-3xl text-xs leading-5 sm:text-sm"
              style={{
                color:
                  'var(--crm-ink-faint)',
              }}
            >
              Review controlled-campaign funnel quality,
              response-time signals and evidenced commercial
              outcomes for the selected period.
            </p>
          </div>

          <div
            className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[11px]"
            style={sunkenStyle}
          >
            <FiTarget
              style={{
                color:
                  'var(--crm-accent)',
              }}
            />

            <span
              style={{
                color:
                  'var(--crm-ink-faint)',
              }}
            >
              Campaign economics remain evidence-based.
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <SalesPolicy />

        <div
          className="rounded-xl border p-4"
          style={sunkenStyle}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span
                  className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    color:
                      'var(--crm-ink-faint)',
                  }}
                >
                  <FiCalendar />
                  Period from
                </span>

                <input
                  type="datetime-local"
                  value={from}
                  onChange={(event) =>
                    setFrom(
                      event.target.value
                    )
                  }
                  className={INPUT}
                  style={{
                    borderColor:
                      'var(--crm-line)',
                    background:
                      'var(--crm-bg-raised)',
                    color:
                      'var(--crm-ink)',
                  }}
                />
              </label>

              <label className="block">
                <span
                  className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    color:
                      'var(--crm-ink-faint)',
                  }}
                >
                  <FiClock />
                  Through
                </span>

                <input
                  type="datetime-local"
                  value={to}
                  onChange={(event) =>
                    setTo(
                      event.target.value
                    )
                  }
                  className={INPUT}
                  style={{
                    borderColor:
                      'var(--crm-line)',
                    background:
                      'var(--crm-bg-raised)',
                    color:
                      'var(--crm-ink)',
                  }}
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={load}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor:
                    'var(--crm-line)',
                  background:
                    'var(--crm-bg-raised)',
                  color:
                    'var(--crm-heading)',
                }}
              >
                <FiRefreshCw
                  className={
                    busy
                      ? 'animate-spin'
                      : ''
                  }
                />

                {busy
                  ? 'Loading…'
                  : 'Refresh report'}
              </button>

              <button
                type="button"
                disabled={downloading}
                onClick={download}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background:
                    'var(--crm-accent)',
                  color: '#fff',
                }}
              >
                <FiDownload />

                {downloading
                  ? 'Preparing…'
                  : 'Download period report'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border p-4 text-sm"
            style={{
              borderColor:
                'var(--crm-danger)',
              background:
                'var(--crm-danger-bg)',
              color:
                'var(--crm-danger)',
            }}
          >
            <FiAlertTriangle
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>
        )}

        {!data && !busy && !error && (
          <div
            className="rounded-xl border px-5 py-8 text-center"
            style={sunkenStyle}
          >
            <FiBarChart2
              size={24}
              className="mx-auto"
              style={{
                color:
                  'var(--crm-accent)',
              }}
            />

            <div
              className="mt-3 text-sm font-semibold"
              style={{
                color:
                  'var(--crm-heading)',
              }}
            >
              Acquisition report not loaded yet
            </div>

            <p
              className="mx-auto mt-1 max-w-xl text-xs leading-5"
              style={{
                color:
                  'var(--crm-ink-faint)',
              }}
            >
              Select an optional reporting period and refresh
              the report. Leaving both fields empty requests the
              backend default reporting range.
            </p>
          </div>
        )}

        {data && (
          <>
            <div
              className="rounded-xl border p-4 text-xs leading-5 sm:text-sm"
              style={sunkenStyle}
            >
              <span
                className="font-semibold"
                style={{
                  color:
                    'var(--crm-heading)',
                }}
              >
                Generated{' '}
                {formatGeneratedAt(
                  data.generatedAt
                )}.
              </span>{' '}

              <span
                style={{
                  color:
                    'var(--crm-ink-faint)',
                }}
              >
                Funnel and lead breakdowns use the selected
                period. Campaign economics show cumulative
                lifetime results. Financial values remain
                unavailable until evidenced.
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                icon={FiTarget}
                label="Campaigns"
                value={campaigns.length}
                hint="Controlled campaigns in report"
              />

              <MetricCard
                icon={FiActivity}
                label="Leads"
                value={summary.leads}
                hint="Observed acquisition leads"
              />

              <MetricCard
                icon={FiTrendingUp}
                label="Qualified"
                value={summary.qualified}
                hint="CRM-qualified leads"
              />

              <MetricCard
                icon={FiBarChart2}
                label="Quotes"
                value={summary.quotes}
                hint="Observed quotations"
              />

              <MetricCard
                icon={FiTarget}
                label="Orders"
                value={summary.orders}
                hint="Observed orders"
              />
            </div>

            <div
              className="overflow-hidden rounded-xl border"
              style={sunkenStyle}
            >
              <div className="border-b p-4" style={{ borderColor: 'var(--crm-line)' }}>
                <SectionHeader
                  icon={FiBarChart2}
                  title="Campaign Acquisition Outcomes"
                  description="Observed funnel and evidenced financial values by governed campaign."
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead>
                    <tr
                      className="border-b"
                      style={{
                        borderColor:
                          'var(--crm-line)',
                        color:
                          'var(--crm-ink-faint)',
                      }}
                    >
                      {[
                        'Campaign',
                        'Leads',
                        'Qualified',
                        'Quotes',
                        'Orders',
                        'Actual spend',
                        'CPL',
                        'CPQL',
                      ].map((heading) => (
                        <th
                          className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                          key={heading}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {campaigns.length > 0 ? (
                      campaigns.map(
                        (campaignRow) => {
                          const campaignInfo =
                            campaignRow?.campaign ||
                            {};

                          const observed =
                            campaignRow?.observed
                              ?.overall || {};

                          const financial =
                            campaignRow?.financial ||
                            {};

                          return (
                            <tr
                              key={
                                campaignInfo.id ||
                                campaignInfo.utmCampaign
                              }
                              className="border-b last:border-b-0"
                              style={{
                                borderColor:
                                  'var(--crm-line)',
                                color:
                                  'var(--crm-ink)',
                              }}
                            >
                              <td
                                className="px-4 py-3 font-mono font-semibold"
                                style={{
                                  color:
                                    'var(--crm-heading)',
                                }}
                              >
                                {campaignInfo.utmCampaign ||
                                  '—'}
                              </td>

                              <td className="px-4 py-3">
                                {observed.leads ?? 0}
                              </td>

                              <td className="px-4 py-3">
                                {observed.qualifiedLeads ??
                                  0}
                              </td>

                              <td className="px-4 py-3">
                                {observed.quotes ?? 0}
                              </td>

                              <td className="px-4 py-3">
                                {observed.orders ?? 0}
                              </td>

                              <td className="px-4 py-3">
                                {financial.actualSpend
                                  ? formatMoney(
                                      financial.currency,
                                      financial.actualSpend
                                        .amount
                                    )
                                  : 'Unavailable'}
                              </td>

                              <td className="px-4 py-3">
                                {financial.cpl ??
                                  'Unavailable'}
                              </td>

                              <td className="px-4 py-3">
                                {financial.cpql ??
                                  'Unavailable'}
                              </td>
                            </tr>
                          );
                        }
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center"
                          style={{
                            color:
                              'var(--crm-ink-faint)',
                          }}
                        >
                          No campaign rows are available for this
                          reporting period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {campaigns.map(
              (campaignRow) => {
                const campaignInfo =
                  campaignRow?.campaign ||
                  {};

                const byCurrency =
                  campaignRow?.financial
                    ?.byCurrency || {};

                return (
                  <div
                    key={`financial-${
                      campaignInfo.id ||
                      campaignInfo.utmCampaign
                    }`}
                    className="rounded-xl border p-4"
                    style={sunkenStyle}
                  >
                    <SectionHeader
                      icon={FiTrendingUp}
                      title={`${
                        campaignInfo.utmCampaign ||
                        'Campaign'
                      } — actual financial outcomes by currency`}
                      description="Only evidenced revenue and gross-profit values are shown."
                    />

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(
                        byCurrency
                      ).length > 0 ? (
                        Object.entries(
                          byCurrency
                        ).map(
                          ([
                            currency,
                            values,
                          ]) => (
                            <div
                              key={currency}
                              className="rounded-lg border p-3"
                              style={cardStyle}
                            >
                              <div
                                className="text-xs font-semibold"
                                style={{
                                  color:
                                    'var(--crm-heading)',
                                }}
                              >
                                {currency}
                              </div>

                              <div
                                className="mt-2 space-y-1 text-xs leading-5"
                                style={{
                                  color:
                                    'var(--crm-ink-faint)',
                                }}
                              >
                                <div>
                                  Revenue:{' '}
                                  {values?.revenue ??
                                    'Unavailable'}
                                </div>

                                <div>
                                  Gross profit:{' '}
                                  {values?.grossProfit ??
                                    'Unavailable'}
                                </div>

                                <div>
                                  Evidenced orders:{' '}
                                  {values?.observedOrders ??
                                    0}
                                </div>
                              </div>
                            </div>
                          )
                        )
                      ) : (
                        <div
                          className="text-xs"
                          style={{
                            color:
                              'var(--crm-ink-faint)',
                          }}
                        >
                          No evidenced financial outcomes are
                          available for this campaign.
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}

            <div
              className="rounded-xl border p-4"
              style={sunkenStyle}
            >
              <SectionHeader
                icon={FiClock}
                title="Response Time & Follow-up"
                description="Current sales-response signals derived from persisted CRM activity."
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={FiClock}
                  label="Still New"
                  value={
                    data?.responseTime
                      ?.stillNewLeads ?? 0
                  }
                />

                <MetricCard
                  icon={FiAlertTriangle}
                  label="Untouched Hot Leads"
                  value={
                    data?.responseTime
                      ?.untouchedHotLeads ?? 0
                  }
                />

                <MetricCard
                  icon={FiCalendar}
                  label="Overdue Follow-ups"
                  value={
                    data?.responseTime
                      ?.overdueFollowups ?? 0
                  }
                />

                <MetricCard
                  icon={FiTrendingUp}
                  label="Avg. First Response"
                  value={
                    data?.responseTime
                      ?.responseTime
                      ?.averageMinutes !==
                      null &&
                    data?.responseTime
                      ?.responseTime
                      ?.averageMinutes !==
                      undefined
                      ? `${data.responseTime.responseTime.averageMinutes} min`
                      : 'Unavailable'
                  }
                />
              </div>
            </div>

            <details
              className="group overflow-hidden rounded-xl border"
              style={sunkenStyle}
            >
              <summary
                className="cursor-pointer list-none px-4 py-4 text-sm font-semibold"
                style={{
                  color:
                    'var(--crm-heading)',
                }}
              >
                Funnel, segments and lost-reason breakdown
              </summary>

              <div
                className="space-y-5 border-t p-4"
                style={{
                  borderColor:
                    'var(--crm-line)',
                }}
              >
                <div>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color:
                        'var(--crm-heading)',
                    }}
                  >
                    Funnel events
                  </h3>

                  <ul
                    className="mt-2 space-y-1.5 text-xs"
                    style={{
                      color:
                        'var(--crm-ink-faint)',
                    }}
                  >
                    {funnel.length > 0 ? (
                      funnel.map(
                        (row, index) => (
                          <li key={index}>
                            {row?._id?.vertical ||
                              'Unspecified product'}{' '}
                            ·{' '}
                            {prettify(
                              row?._id?.event
                            )}{' '}
                            · {row?.count ?? 0}
                          </li>
                        )
                      )
                    ) : (
                      <li>
                        No funnel events in this period.
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color:
                        'var(--crm-heading)',
                    }}
                  >
                    Lead outcomes
                  </h3>

                  <ul
                    className="mt-2 space-y-1.5 text-xs"
                    style={{
                      color:
                        'var(--crm-ink-faint)',
                    }}
                  >
                    {leadBreakdown.length >
                    0 ? (
                      leadBreakdown.map(
                        (row, index) => (
                          <li key={index}>
                            {Object.values(
                              row?._id || {}
                            )
                              .filter(Boolean)
                              .join(' · ') ||
                              'Unspecified'}{' '}
                            · {row?.count ?? 0}
                          </li>
                        )
                      )
                    ) : (
                      <li>
                        No lead-outcome breakdown is available.
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color:
                        'var(--crm-heading)',
                    }}
                  >
                    Journey segments
                  </h3>

                  <ul
                    className="mt-2 space-y-1.5 text-xs"
                    style={{
                      color:
                        'var(--crm-ink-faint)',
                    }}
                  >
                    {Object.entries(
                      data?.audiences || {}
                    ).map(
                      ([
                        label,
                        count,
                      ]) => (
                        <li key={label}>
                          {prettify(label)} ·{' '}
                          {count}
                        </li>
                      )
                    )}
                  </ul>

                  {data?.audienceUse && (
                    <p
                      className="mt-3 text-xs leading-5"
                      style={{
                        color:
                          'var(--crm-ink-faint)',
                      }}
                    >
                      {data.audienceUse}
                    </p>
                  )}
                </div>
              </div>
            </details>

            {diagnostics.length > 0 && (
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor:
                    'var(--crm-warning)',
                  background:
                    'var(--crm-warning-bg)',
                }}
              >
                <div
                  className="flex items-center gap-2 text-xs font-semibold"
                  style={{
                    color:
                      'var(--crm-warning)',
                  }}
                >
                  <FiAlertTriangle />
                  Diagnostics
                </div>

                <ul
                  className="mt-3 space-y-1.5 text-xs leading-5"
                  style={{
                    color:
                      'var(--crm-ink-soft)',
                  }}
                >
                  {diagnostics.map(
                    (
                      diagnostic,
                      index
                    ) => {
                      const [
                        stage,
                        reason,
                      ] =
                        Array.isArray(
                          diagnostic
                        )
                          ? diagnostic
                          : [
                              `Item ${
                                index + 1
                              }`,
                              String(
                                diagnostic
                              ),
                            ];

                      return (
                        <li key={`${stage}-${index}`}>
                          <span className="font-semibold">
                            {stage}:
                          </span>{' '}
                          {reason}
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
