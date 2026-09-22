import AcquisitionReport from '../../components/crm/AcquisitionReport';
import CampaignGovernancePanel from '../../components/crm/CampaignGovernancePanel';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCheckCircle,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiTarget,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import controlledCampaignApi from '../../api/controlledCampaigns';
import { useAuth } from '../../hooks/useAuth';

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.27: Controlled Campaign CRM Workbench
 *
 * Scope:
 * - create/edit one Stone controlled-campaign definition using real inputs;
 * - keep Website + Meta Instant Form as fixed controlled alternatives;
 * - preserve Operations confirmation and Management approval separation;
 * - review readiness, audience overlap and observed business outcomes;
 * - never invent commercial values, Meta IDs, ad spend or campaign success.
 */

const TARGET_MARKET_TYPES = [
  'CITY',
  'DISTRICT',
  'CORRIDOR',
];

const DELIVERY_CAPABILITIES = [
  'AVAILABLE',
  'CONSTRAINED',
  'NOT_SUPPORTED',
];

const PRIORITIES = [
  { value: 'A', label: 'A — Scale' },
  { value: 'B', label: 'B — Test' },
  { value: 'C', label: 'C — Limited' },
  { value: 'D', label: 'D — Do Not Advertise' },
];

const CREATIVE_ANGLES = [
  {
    value: 'PRODUCT_PROOF',
    label: 'Product Proof',
  },
  {
    value: 'LOADING_DISPATCH_PROOF',
    label: 'Loading / Dispatch Proof',
  },
  {
    value: 'SOURCE_PROOF',
    label: 'Source Proof',
  },
  {
    value: 'PRICE_AVAILABILITY_HOOK',
    label: 'Price / Availability Hook',
  },
  {
    value: 'CORPORATE_TRUST',
    label: 'Corporate Trust',
  },
];

const INPUT =
  'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition duration-200 placeholder:opacity-50 focus:ring-2 focus:ring-[var(--crm-accent)]/20 disabled:cursor-not-allowed disabled:opacity-60';

const fieldStyle = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-sunken)',
  color: 'var(--crm-ink)',
};

const cardStyle = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-raised)',
  boxShadow: 'var(--crm-shadow)',
};

const sunkenCardStyle = {
  borderColor: 'var(--crm-line)',
  background: 'var(--crm-bg-sunken)',
};

const primaryButtonStyle = {
  background: 'var(--crm-accent)',
  color: 'var(--crm-bg)',
};

function emptyMoneyRange() {
  return {
    currency: '',
    min: '',
    max: '',
    unit: '',
  };
}

function emptyCreative() {
  return {
    angle: '',
    name: '',
    message: '',
    assetReference: '',
    utmContent: '',
    metaAdId: '',
    metaCreativeId: '',
  };
}

function emptyForm() {
  return {
    acquisitionPaths: ['WEBSITE','META_INSTANT_FORM'],
    marketSelection: {
      product: '',
      source: '',
      targetMarket: {
        type: '',
        name: '',
      },
      minimumCommercialQuantity: {
        value: '',
        unit: '',
      },
      materialEconomics: emptyMoneyRange(),
      freightEconomics: emptyMoneyRange(),
      expectedSellingRange: emptyMoneyRange(),
      marginBand: '',
      deliveryCapability: '',
      priority: '',
    },
    campaignPromise: '',
    landingPage: '',
    buyerContext: '',
    utm: {
      campaign: '',
    },
    metaCampaignId: '',
    metaAdSetId: '',
    creatives: [
      emptyCreative(),
      emptyCreative(),
      emptyCreative(),
    ],
  };
}

function unwrapData(response) {
  return response?.data ?? response ?? {};
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.details?.[0] ||
    error?.message ||
    'Request failed.'
  );
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function prettify(value) {
  if (!value) return '—';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function requiredNumber(value, fieldLabel) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    throw new Error(`${fieldLabel} is required.`);
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${fieldLabel} must be a valid number.`);
  }

  return number;
}

function buildPayload(form) {
  const normalizeRange = (range, fieldLabel) => ({
    currency: String(range.currency || '').trim(),
    min: requiredNumber(
      range.min,
      `${fieldLabel} minimum`
    ),
    max: requiredNumber(
      range.max,
      `${fieldLabel} maximum`
    ),
    unit: String(range.unit || '').trim(),
  });

  return {
    acquisitionPaths: form.acquisitionPaths,
    marketSelection: {
      product:
        String(
          form.marketSelection.product || ''
        ).trim(),
      source:
        String(
          form.marketSelection.source || ''
        ).trim(),
      targetMarket: {
        type:
          form.marketSelection.targetMarket.type,
        name:
          String(
            form.marketSelection.targetMarket.name || ''
          ).trim(),
      },
      minimumCommercialQuantity: {
        value:
          requiredNumber(
            form.marketSelection
              .minimumCommercialQuantity.value,
            'Actual operating MOQ'
          ),
        unit:
          String(
            form.marketSelection
              .minimumCommercialQuantity.unit || ''
          ).trim(),
      },
      materialEconomics:
        normalizeRange(
          form.marketSelection.materialEconomics,
          'Material economics'
        ),
      freightEconomics:
        normalizeRange(
          form.marketSelection.freightEconomics,
          'Freight economics'
        ),
      expectedSellingRange:
        normalizeRange(
          form.marketSelection.expectedSellingRange,
          'Expected selling range'
        ),
      marginBand:
        String(
          form.marketSelection.marginBand || ''
        ).trim(),
      deliveryCapability:
        form.marketSelection.deliveryCapability,
      priority:
        form.marketSelection.priority,
    },
    landingPage:
      String(form.landingPage || '').trim(),
    campaignPromise: String(form.campaignPromise || '').trim(),
    buyerContext:
      String(form.buyerContext || '').trim(),
    utm: {
      campaign:
        String(
          form.utm.campaign || ''
        )
          .trim()
          .toLowerCase(),
    },
    metaCampaignId:
      String(form.metaCampaignId || '').trim(),
    metaAdSetId:
      String(form.metaAdSetId || '').trim(),
    creatives:
      form.creatives.map((creative) => ({
        _id: creative._id,
        angle: creative.angle,
        message: String(creative.message || '').trim(),
        name:
          String(
            creative.name || ''
          ).trim(),
        assetReference:
          String(
            creative.assetReference || ''
          ).trim(),
        utmContent:
          String(
            creative.utmContent || ''
          )
            .trim()
            .toLowerCase(),
        metaAdId:
          String(
            creative.metaAdId || ''
          ).trim(),
        metaCreativeId:
          String(
            creative.metaCreativeId || ''
          ).trim(),
      })),
  };
}

function mapCampaignToForm(campaign) {
  const market =
    campaign?.marketSelection || {};

  return {
    marketSelection: {
      product: market.product || '',
      source: market.source || '',
      targetMarket: {
        type:
          market.targetMarket?.type || '',
        name:
          market.targetMarket?.name || '',
      },
      minimumCommercialQuantity: {
        value:
          market.minimumCommercialQuantity
            ?.value ?? '',
        unit:
          market.minimumCommercialQuantity
            ?.unit || '',
      },
      materialEconomics: {
        currency:
          market.materialEconomics
            ?.currency || '',
        min:
          market.materialEconomics?.min ?? '',
        max:
          market.materialEconomics?.max ?? '',
        unit:
          market.materialEconomics
            ?.unit || '',
      },
      freightEconomics: {
        currency:
          market.freightEconomics
            ?.currency || '',
        min:
          market.freightEconomics?.min ?? '',
        max:
          market.freightEconomics?.max ?? '',
        unit:
          market.freightEconomics
            ?.unit || '',
      },
      expectedSellingRange: {
        currency:
          market.expectedSellingRange
            ?.currency || '',
        min:
          market.expectedSellingRange
            ?.min ?? '',
        max:
          market.expectedSellingRange
            ?.max ?? '',
        unit:
          market.expectedSellingRange
            ?.unit || '',
      },
      marginBand: market.marginBand || '',
      deliveryCapability:
        market.deliveryCapability || '',
      priority: market.priority || '',
    },
    acquisitionPaths: campaign?.acquisitionPaths || ['WEBSITE','META_INSTANT_FORM'],
    campaignPromise: campaign?.campaignPromise || '',
    landingPage: campaign?.landingPage || '',
    buyerContext: campaign?.buyerContext || '',
    utm: {
      campaign:
        campaign?.utm?.campaign || '',
    },
    metaCampaignId:
      campaign?.metaCampaignId || '',
    metaAdSetId:
      campaign?.metaAdSetId || '',
    creatives:
      Array.isArray(campaign?.creatives) &&
      campaign.creatives.length > 0
        ? campaign.creatives.map(
            (creative) => ({
              angle: creative.angle || '',
              message: creative.message || '',
              _id: creative._id,
              name: creative.name || '',
              assetReference:
                creative.assetReference || '',
              utmContent:
                creative.utmContent || '',
              metaAdId:
                creative.metaAdId || '',
              metaCreativeId:
                creative.metaCreativeId || '',
            })
          )
        : [
            emptyCreative(),
            emptyCreative(),
            emptyCreative(),
          ],
  };
}

function canManageCampaign(user) { return canApprove(user) || ['MARKETING','OPERATIONS'].includes(String(user?.department || '').toUpperCase()); }

function canConfirmOperations(user) { return String(user?.department || '').toUpperCase() === 'OPERATIONS'; }

function canApprove(user) { return ['ADMIN','FOUNDER','CO_FOUNDER','SUPER_ADMIN'].includes(String(user?.role || '').toUpperCase()) || ['ADMIN','MANAGEMENT'].includes(String(user?.department || '').toUpperCase()); }

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
        style={{
          borderColor: 'var(--crm-line)',
          background: 'var(--crm-accent-bg)',
          color: 'var(--crm-accent)',
        }}
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <h3
          className="text-[15px] font-semibold tracking-tight"
          style={{
            color: 'var(--crm-heading)',
          }}
        >
          {title}
        </h3>

        {subtitle && (
          <p
            className="mt-1 max-w-4xl text-xs leading-5"
            style={{
              color: 'var(--crm-ink-faint)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}) {
  return (
    <label className="block min-w-0">
      <span
        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{
          color: 'var(--crm-ink-faint)',
        }}
      >
        {label}
      </span>

      {children}

      {hint && (
        <span
          className="mt-1 block text-[11px]"
          style={{
            color: 'var(--crm-ink-faint)',
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function Badge({
  children,
  tone = 'neutral',
}) {
  const palette = {
    success: {
      color: 'var(--crm-positive)',
      background: 'var(--crm-positive-bg)',
      borderColor: 'var(--crm-positive)',
    },
    warning: {
      color: 'var(--crm-warning)',
      background: 'var(--crm-warning-bg)',
      borderColor: 'var(--crm-warning)',
    },
    danger: {
      color: 'var(--crm-danger)',
      background: 'var(--crm-danger-bg)',
      borderColor: 'var(--crm-danger)',
    },
    info: {
      color: 'var(--crm-info)',
      background: 'var(--crm-info-bg)',
      borderColor: 'var(--crm-info)',
    },
    neutral: {
      color: 'var(--crm-ink-faint)',
      background: 'var(--crm-bg-sunken)',
      borderColor: 'var(--crm-line)',
    },
  };

  const style =
    palette[tone] ||
    palette.neutral;

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em]"
      style={style}
    >
      {children}
    </span>
  );
}

function MoneyRangeFields({
  title,
  value,
  onChange,
}) {
  const set = (key, nextValue) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  return (
    <div
      className="rounded-2xl border p-4"
      style={sunkenCardStyle}
    >
      <div
        className="mb-3 text-xs font-semibold tracking-tight"
        style={{
          color: 'var(--crm-heading)',
        }}
      >
        {title}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Currency">
          <input
            required
            value={value.currency}
            onChange={(event) =>
              set(
                'currency',
                event.target.value.toUpperCase()
              )
            }
            className={INPUT}
            style={fieldStyle}
            placeholder="Enter real currency"
          />
        </Field>

        <Field label="Minimum">
          <input
            required
            type="number"
            min="0"
            value={value.min}
            onChange={(event) =>
              set(
                'min',
                event.target.value
              )
            }
            className={INPUT}
            style={fieldStyle}
          />
        </Field>

        <Field label="Maximum">
          <input
            required
            type="number"
            min="0"
            value={value.max}
            onChange={(event) =>
              set(
                'max',
                event.target.value
              )
            }
            className={INPUT}
            style={fieldStyle}
          />
        </Field>

        <Field label="Unit">
          <input
            required
            value={value.unit}
            onChange={(event) =>
              set(
                'unit',
                event.target.value
              )
            }
            className={INPUT}
            style={fieldStyle}
            placeholder="Enter real unit"
          />
        </Field>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
}) {
  return (
    <div
      className="min-h-[92px] rounded-xl border p-4"
      style={sunkenCardStyle}
    >
      <div
        className="text-[9px] font-bold uppercase tracking-[0.14em]"
        style={{
          color: 'var(--crm-ink-faint)',
        }}
      >
        {label}
      </div>

      <div
        className="mt-2 break-words text-lg font-semibold tracking-tight"
        style={{
          color: 'var(--crm-heading)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function ControlledCampaigns() {
  const { user } = useAuth();

  const [campaigns, setCampaigns] =
    useState([]);

  const [selectedId, setSelectedId] =
    useState('');

  const [selected, setSelected] =
    useState(null);

  const [metrics, setMetrics] =
    useState(null);

  const [audienceReview, setAudienceReview] =
    useState(null);

  const [prelaunchReview, setPrelaunchReview] =
    useState(null);

  const [loadingList, setLoadingList] =
    useState(true);

  const [loadingDetail, setLoadingDetail] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState('');

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState('');

  const [form, setForm] =
    useState(emptyForm());

  const selectedCampaign = selected?.campaign || null;
  const [managementBudget, setManagementBudget] = useState({ currency: '', amount: '', basis: '' });
  const writeAllowed =
    canManageCampaign(user);

  const operationsAllowed =
    canConfirmOperations(user);

  const approvalAllowed =
    canApprove(user);

  const managementApprovalBlockedReason =
    !selectedCampaign
      ? 'Select a controlled campaign first.'
      : selectedCampaign.managementApprovalAt
      ? 'Management approval is already recorded. Material edits will reset it.'
      : !selectedCampaign.operationsInputsConfirmedAt
      ? 'Operations inputs must be confirmed before Management approval.'
      : selectedCampaign.marketSelection?.deliveryCapability ===
        'NOT_SUPPORTED'
      ? 'A market marked NOT_SUPPORTED cannot receive Management approval.'
      : selectedCampaign.marketSelection?.priority === 'D'
      ? 'Priority D means Do Not Advertise.'
      : '';

  const canRecordManagementApproval =
    approvalAllowed &&
    !managementApprovalBlockedReason;

  const loadCampaignList =
    useCallback(async () => {
      setLoadingList(true);

      try {
        const response =
          await controlledCampaignApi.list();

        const data =
          unwrapData(response);

        const rows =
          Array.isArray(data?.campaigns)
            ? data.campaigns
            : [];

        setCampaigns(rows);

        setSelectedId((currentId) => {
          const normalizedCurrentId =
            String(currentId || '');

          const currentStillExists =
            rows.some((row) =>
              String(row?.campaign?._id || '') ===
              normalizedCurrentId
            );

          if (currentStillExists) {
            return normalizedCurrentId;
          }

          return String(
            rows[0]?.campaign?._id || ''
          );
        });
      } catch (error) {
        toast.error(
          getErrorMessage(error)
        );
      } finally {
        setLoadingList(false);
      }
    }, []);

  const loadSelectedCampaign =
    useCallback(
      async (campaignId) => {
        if (!campaignId) {
          setSelected(null);
          setMetrics(null);
          setAudienceReview(null);
          setPrelaunchReview(null);
          return;
        }

        setLoadingDetail(true);

        try {
          const detailResponse =
            await controlledCampaignApi.get(
              campaignId
            );

          setSelected(
            unwrapData(detailResponse)
          );

          const secondaryResults =
            await Promise.allSettled([
              controlledCampaignApi.getMetrics(
                campaignId
              ),
              controlledCampaignApi.getAudienceReview(
                campaignId
              ),
              controlledCampaignApi.getPrelaunchReview(
                campaignId
              ),
            ]);

          setMetrics(
            secondaryResults[0].status ===
              'fulfilled'
              ? unwrapData(
                  secondaryResults[0].value
                )
              : null
          );

          setAudienceReview(
            secondaryResults[1].status ===
              'fulfilled'
              ? unwrapData(
                  secondaryResults[1].value
                )
              : null
          );

          setPrelaunchReview(
            secondaryResults[2].status ===
              'fulfilled'
              ? unwrapData(
                  secondaryResults[2].value
                )
              : null
          );
        } catch (error) {
          toast.error(
            getErrorMessage(error)
          );
        } finally {
          setLoadingDetail(false);
        }
      },
      []
    );

  useEffect(() => {
    loadCampaignList();
  }, [loadCampaignList]);

  useEffect(() => {
    loadSelectedCampaign(selectedId);
  }, [
    selectedId,
    loadSelectedCampaign,
  ]);


  const selectedReadiness =
    selected?.readiness || null;

  const metricSummary =
    metrics?.observed?.overall || null;

  const pathMetrics =
    metrics?.observed?.byAcquisitionPath || {};

  const websiteMetrics =
    pathMetrics?.WEBSITE || null;

  const metaInstantFormMetrics =
    pathMetrics?.META_INSTANT_FORM || null;

  const creativeMetrics =
    Array.isArray(
      metrics?.observed?.byCreative
    )
      ? metrics.observed.byCreative
      : [];

  const audienceScopes =
    audienceReview?.reviewScopes || null;

  const openCreateEditor = () => {
    setEditingId('');
    setForm(emptyForm());
    setEditorOpen(true);
  };

  const openEditEditor = () => {
    if (!selectedCampaign) {
      return;
    }

    setEditingId(
      String(selectedCampaign._id)
    );
    setForm(
      mapCampaignToForm(
        selectedCampaign
      )
    );
    setEditorOpen(true);
  };

  const setMarketField = (
    key,
    value
  ) => {
    setForm((current) => ({
      ...current,
      marketSelection: {
        ...current.marketSelection,
        [key]: value,
      },
    }));
  };

  const setNestedMarketField = (
    parent,
    key,
    value
  ) => {
    setForm((current) => ({
      ...current,
      marketSelection: {
        ...current.marketSelection,
        [parent]: {
          ...current.marketSelection[
            parent
          ],
          [key]: value,
        },
      },
    }));
  };

  const updateCreative = (
    index,
    key,
    value
  ) => {
    setForm((current) => ({
      ...current,
      creatives:
        current.creatives.map(
          (creative, creativeIndex) =>
            creativeIndex === index
              ? {
                  ...creative,
                  [key]: value,
                }
              : creative
        ),
    }));
  };

  const addCreative = () => {
    setForm((current) => {
      if (
        current.creatives.length >= 5
      ) {
        return current;
      }

      return {
        ...current,
        creatives: [
          ...current.creatives,
          emptyCreative(),
        ],
      };
    });
  };

  const removeCreative = (index) => {
    setForm((current) => {
      if (
        current.creatives.length <= 3
      ) {
        return current;
      }

      return {
        ...current,
        creatives:
          current.creatives.filter(
            (_, creativeIndex) =>
              creativeIndex !== index
          ),
      };
    });
  };

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    if (!writeAllowed) {
      toast.error(
        'Your role does not have campaign write access.'
      );
      return;
    }

    setSaving(true);

    try {
      const fullPayload = buildPayload(form);
      const payload = String(user?.department).toUpperCase() === 'OPERATIONS' && !canApprove(user) ? { marketSelection: fullPayload.marketSelection } : fullPayload;

      const response =
        editingId
          ? await controlledCampaignApi.update(
              editingId,
              payload
            )
          : await controlledCampaignApi.create(
              payload
            );

      const data =
        unwrapData(response);

      const campaignId =
        String(
          data?.campaign?._id ||
            editingId ||
            ''
        );

      toast.success(
        editingId
          ? 'Campaign updated. Previous confirmation/approval is reset after material edits.'
          : 'Controlled campaign created.'
      );

      setEditorOpen(false);
      setEditingId('');
      setForm(emptyForm());

      await loadCampaignList();

      if (campaignId) {
        setSelectedId(campaignId);
        await loadSelectedCampaign(
          campaignId
        );
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGovernanceAction =
    async (action) => {
      if (!selectedCampaign?._id) {
        return;
      }

      setActionLoading(action);

      try {
        if (action === 'operations') {
          await controlledCampaignApi
            .confirmOperationsInputs(
              selectedCampaign._id
            );

          toast.success(
            'Operations inputs confirmed.'
          );
        }

        if (action === 'management') {
          await controlledCampaignApi
            .recordManagementApproval(
              selectedCampaign._id, { managementBudget: { ...managementBudget, amount: Number(managementBudget.amount) } }
            );

          toast.success(
            'Management approval recorded.'
          );
        }

        await loadCampaignList();

        await loadSelectedCampaign(
          selectedCampaign._id
        );
      } catch (error) {
        toast.error(
          getErrorMessage(error)
        );
      } finally {
        setActionLoading('');
      }
    };

  const readinessTone =
    selectedReadiness?.ready
      ? 'success'
      : 'warning';

  const listRows =
    useMemo(
      () => campaigns,
      [campaigns]
    );

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{
        background: 'var(--crm-bg)',
        color: 'var(--crm-ink)',
      }}
    >
      <div className="mx-auto max-w-[1600px]">
        <header
          className="mb-5 overflow-hidden rounded-2xl border"
          style={cardStyle}
        >
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div
                className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: 'var(--crm-accent)' }}
              >
                ADS CAMPAIGN WORKBENCH
              </div>

              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: 'var(--crm-line)',
                    background: 'var(--crm-accent-bg)',
                    color: 'var(--crm-accent)',
                  }}
                >
                  <FiTarget size={18} />
                </div>

                <div className="min-w-0">
                  <h1
                    className="text-2xl font-semibold tracking-tight sm:text-3xl"
                    style={{ color: 'var(--crm-heading)' }}
                  >
                    Controlled Campaign Workbench
                  </h1>

                  <p
                    className="mt-2 max-w-4xl text-sm leading-6"
                    style={{ color: 'var(--crm-ink-faint)' }}
                  >
                    Govern the controlled Stone campaign with real Operations inputs,
                    Website vs Meta Instant Form comparison, 3–5 distinct creatives and
                    downstream CRM outcome measurement.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  loadCampaignList();
                  if (selectedId) {
                    loadSelectedCampaign(selectedId);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition hover:-translate-y-px hover:opacity-90"
                style={sunkenCardStyle}
              >
                <FiRefreshCw />
                Refresh
              </button>

              {writeAllowed && (
                <button
                  type="button"
                  onClick={openCreateEditor}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition hover:-translate-y-px hover:opacity-90"
                  style={primaryButtonStyle}
                >
                  <FiPlus />
                  New Controlled Campaign
                </button>
              )}
            </div>
          </div>

          <div
            className="grid gap-px border-t sm:grid-cols-3"
            style={{
              borderColor: 'var(--crm-line)',
              background: 'var(--crm-line)',
            }}
          >
            {[
              {
                label: 'Campaign definitions',
                value: loadingList ? '…' : listRows.length,
                meta: 'Governed records',
              },
              {
                label: 'Selected readiness',
                value: selectedCampaign
                  ? selectedReadiness?.ready
                    ? 'READY'
                    : 'BLOCKED'
                  : 'NONE',
                meta: selectedCampaign
                  ? selectedCampaign?.marketSelection?.product || 'Selected campaign'
                  : 'Choose a campaign definition',
              },
              {
                label: 'Phase 4 exit',
                value: metrics?.phase4?.exitCriterionAchieved
                  ? 'ACHIEVED'
                  : 'NOT YET',
                meta: 'Based on observed qualified leads',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4 sm:px-5"
                style={{ background: 'var(--crm-bg-raised)' }}
              >
                <div
                  className="text-[9px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--crm-ink-faint)' }}
                >
                  {item.label}
                </div>
                <div
                  className="mt-1.5 text-base font-semibold"
                  style={{ color: 'var(--crm-heading)' }}
                >
                  {item.value}
                </div>
                <div
                  className="mt-1 truncate text-[11px]"
                  style={{ color: 'var(--crm-ink-faint)' }}
                  title={String(item.meta)}
                >
                  {item.meta}
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className="overflow-hidden rounded-2xl border xl:sticky xl:top-4"
            style={cardStyle}
          >
            <div
              className="border-b p-4 sm:p-5"
              style={{
                borderColor:
                  'var(--crm-line)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{
                      color:
                        'var(--crm-heading)',
                    }}
                  >
                    Campaign Definitions
                  </div>

                  <div
                    className="mt-1 text-xs"
                    style={{
                      color:
                        'var(--crm-ink-faint)',
                    }}
                  >
                    {listRows.length} record
                    {listRows.length === 1
                      ? ''
                      : 's'}
                  </div>
                </div>

                <FiTarget
                  style={{
                    color:
                      'var(--crm-accent)',
                  }}
                />
              </div>
            </div>

            <div className="max-h-[66vh] overflow-y-auto p-2.5">
              {loadingList ? (
                <div
                  className="p-5 text-sm"
                  style={{
                    color:
                      'var(--crm-ink-faint)',
                  }}
                >
                  Loading campaigns…
                </div>
              ) : listRows.length === 0 ? (
                <div
                  className="rounded-xl border border-dashed p-5 text-center text-sm"
                  style={{
                    borderColor:
                      'var(--crm-line)',
                    color:
                      'var(--crm-ink-faint)',
                  }}
                >
                  No controlled campaign has been created yet.
                </div>
              ) : (
                listRows.map((row) => {
                  const campaign =
                    row?.campaign || {};
                  const readiness =
                    row?.readiness || {};
                  const active =
                    String(campaign._id) ===
                    String(selectedId);

                  return (
                    <button
                      key={campaign._id}
                      type="button"
                      onClick={() =>
                        setSelectedId(
                          String(
                            campaign._id
                          )
                        )
                      }
                      className="mb-2 w-full rounded-xl border p-3.5 text-left transition duration-200 hover:-translate-y-px"
                      style={{
                        borderColor: active
                          ? 'var(--crm-accent)'
                          : 'var(--crm-line)',
                        background: active
                          ? 'var(--crm-accent-bg)'
                          : 'var(--crm-bg-sunken)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{
                              color:
                                'var(--crm-heading)',
                            }}
                          >
                            {campaign
                              ?.marketSelection
                              ?.product || 'Unnamed product'}
                          </div>

                          <div
                            className="mt-1 text-xs"
                            style={{
                              color:
                                'var(--crm-ink-faint)',
                            }}
                          >
                            {campaign
                              ?.marketSelection
                              ?.targetMarket
                              ?.name || 'Market not set'}
                          </div>
                        </div>

                        <FiChevronRight
                          className="mt-1 shrink-0"
                          style={{
                            color:
                              'var(--crm-ink-faint)',
                          }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge
                          tone={
                            readiness.ready
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {readiness.ready
                            ? 'Ready'
                            : 'Not Ready'}
                        </Badge>

                        {campaign
                          ?.marketSelection
                          ?.priority && (
                          <Badge>
                            Priority{' '}
                            {
                              campaign
                                .marketSelection
                                .priority
                            }
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            {(['ADMIN','MANAGEMENT','MARKETING','IT'].includes(user?.department) || canApprove(user)) && (
              <AcquisitionReport />
            )}
            {selectedCampaign && (
              <CampaignGovernancePanel
                campaign={selectedCampaign}
                user={user}
                budget={managementBudget}
                setBudget={setManagementBudget}
                onSaved={() =>
                  loadSelectedCampaign(selectedCampaign._id)
                }
              />
            )}
            {!selectedCampaign ? (
              <div
                className="rounded-2xl border border-dashed p-6 text-center sm:p-8"
                style={cardStyle}
              >
                <FiTarget
                  size={22}
                  className="mx-auto"
                  style={{
                    color:
                      'var(--crm-accent)',
                  }}
                />

                <h2
                  className="mt-3 text-base font-semibold"
                  style={{
                    color:
                      'var(--crm-heading)',
                  }}
                >
                  Select a controlled campaign
                </h2>

                <p
                  className="mx-auto mt-2 max-w-xl text-sm leading-6"
                  style={{
                    color:
                      'var(--crm-ink-faint)',
                  }}
                >
                  Review readiness, approvals, audience overlap and observed CRM outcomes.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <section
                  className="rounded-2xl border p-4 sm:p-5"
                  style={cardStyle}
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge tone="info">
                          STONE
                        </Badge>

                        <Badge tone="info">
                          META
                        </Badge>

                        <Badge tone={readinessTone}>
                          {selectedReadiness?.ready
                            ? 'Configuration Ready'
                            : 'Configuration Blocked'}
                        </Badge>
                      </div>

                      <h2
                        className="text-xl font-bold"
                        style={{
                          color:
                            'var(--crm-heading)',
                        }}
                      >
                        {
                          selectedCampaign
                            .marketSelection
                            ?.product
                        }
                      </h2>

                      <p
                        className="mt-1 text-sm"
                        style={{
                          color:
                            'var(--crm-ink-faint)',
                        }}
                      >
                        {
                          selectedCampaign
                            .marketSelection
                            ?.targetMarket
                            ?.type
                        }{' '}
                        ·{' '}
                        {
                          selectedCampaign
                            .marketSelection
                            ?.targetMarket
                            ?.name
                        }
                      </p>

                      <p
                        className="mt-2 text-xs"
                        style={{
                          color:
                            'var(--crm-ink-faint)',
                        }}
                      >
                        UTM campaign:{' '}
                        <span
                          className="font-mono"
                          style={{
                            color:
                              'var(--crm-heading)',
                          }}
                        >
                          {selectedCampaign
                            ?.utm
                            ?.campaign || '—'}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {writeAllowed && (
                        <button
                          type="button"
                          onClick={openEditEditor}
                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:opacity-90"
                          style={sunkenCardStyle}
                        >
                          <FiEdit2 />
                          Edit
                        </button>
                      )}

                      {operationsAllowed && (
                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                              'operations' ||
                            Boolean(
                              selectedCampaign
                                .operationsInputsConfirmedAt
                            )
                          }
                          title={
                            selectedCampaign
                              .operationsInputsConfirmedAt
                              ? 'Operations inputs are already confirmed. Material edits will reset this confirmation.'
                              : 'Confirm that the persisted commercial inputs are real Operations inputs.'
                          }
                          onClick={() =>
                            handleGovernanceAction(
                              'operations'
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          style={sunkenCardStyle}
                        >
                          <FiCheckCircle />
                          {actionLoading ===
                          'operations'
                            ? 'Confirming…'
                            : selectedCampaign
                                .operationsInputsConfirmedAt
                            ? 'Operations Confirmed'
                            : 'Confirm Operations Inputs'}
                        </button>
                      )}

                      {approvalAllowed && (
                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                              'management' ||
                            !canRecordManagementApproval
                          }
                          title={
                            managementApprovalBlockedReason ||
                            'Record Management approval after Operations confirmation.'
                          }
                          onClick={() =>
                            handleGovernanceAction(
                              'management'
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          style={primaryButtonStyle}
                        >
                          <FiShield />
                          {actionLoading ===
                          'management'
                            ? 'Approving…'
                            : selectedCampaign
                                .managementApprovalAt
                            ? 'Management Approved'
                            : 'Record Management Approval'}
                        </button>
                      )}
                    </div>
                  </div>

                  {approvalAllowed &&
                    managementApprovalBlockedReason &&
                    !selectedCampaign.managementApprovalAt && (
                      <div
                        className="mt-4 rounded-xl border p-3 text-xs leading-5"
                        style={{
                          borderColor:
                            'var(--crm-warning-bg)',
                          background:
                            'var(--crm-warning-bg)',
                          color:
                            'var(--crm-warning)',
                        }}
                      >
                        Management approval blocked: {managementApprovalBlockedReason}
                      </div>
                    )}

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetricBox
                      label="Priority"
                      value={
                        selectedCampaign
                          .marketSelection
                          ?.priority || '—'
                      }
                    />

                    <MetricBox
                      label="Delivery"
                      value={prettify(
                        selectedCampaign
                          .marketSelection
                          ?.deliveryCapability
                      )}
                    />

                    <MetricBox
                      label="Operations Confirmed"
                      value={
                        selectedCampaign
                          .operationsInputsConfirmedAt
                          ? 'Yes'
                          : 'No'
                      }
                    />

                    <MetricBox
                      label="Management Approved"
                      value={
                        selectedCampaign
                          .managementApprovalAt
                          ? 'Yes'
                          : 'No'
                      }
                    />
                  </div>
                </section>

                <section
                  className="rounded-2xl border p-4 sm:p-5"
                  style={cardStyle}
                >
                  <SectionTitle
                    icon={FiAlertCircle}
                    title="Pre-Launch Readiness"
                    subtitle="Readiness is not Phase 4 completion. The exit criterion remains real qualified leads observed."
                  />

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor:
                          'var(--crm-line)',
                        background:
                          'var(--crm-bg-sunken)',
                      }}
                    >
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color:
                            'var(--crm-heading)',
                        }}
                      >
                        Readiness blockers
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedReadiness
                          ?.reasons?.length ? (
                          selectedReadiness.reasons.map(
                            (reason) => (
                              <Badge
                                key={reason}
                                tone="danger"
                              >
                                {prettify(
                                  reason
                                )}
                              </Badge>
                            )
                          )
                        ) : (
                          <Badge tone="success">
                            No configured blocker
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor:
                          'var(--crm-line)',
                        background:
                          'var(--crm-bg-sunken)',
                      }}
                    >
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color:
                            'var(--crm-heading)',
                        }}
                      >
                        Warnings
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedReadiness
                          ?.warnings?.length ? (
                          selectedReadiness.warnings.map(
                            (warning) => (
                              <Badge
                                key={warning}
                                tone="warning"
                              >
                                {prettify(
                                  warning
                                )}
                              </Badge>
                            )
                          )
                        ) : (
                          <Badge>
                            No configured warning
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {prelaunchReview && (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div
                        className="rounded-2xl border p-4"
                        style={{
                          borderColor:
                            'var(--crm-line)',
                          background:
                            'var(--crm-bg-sunken)',
                        }}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <FiActivity
                            style={{
                              color:
                                'var(--crm-accent)',
                            }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{
                              color:
                                'var(--crm-heading)',
                            }}
                          >
                            Website path
                          </span>
                        </div>

                        <Badge
                          tone={
                            prelaunchReview
                              ?.acquisitionPaths
                              ?.website
                              ?.technicallyPrepared
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {prelaunchReview
                            ?.acquisitionPaths
                            ?.website
                            ?.technicallyPrepared
                            ? 'Technically Prepared'
                            : 'Needs Review'}
                        </Badge>
                      </div>

                      <div
                        className="rounded-2xl border p-4"
                        style={{
                          borderColor:
                            'var(--crm-line)',
                          background:
                            'var(--crm-bg-sunken)',
                        }}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <FiActivity
                            style={{
                              color:
                                'var(--crm-accent)',
                            }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{
                              color:
                                'var(--crm-heading)',
                            }}
                          >
                            Meta Instant Form path
                          </span>
                        </div>

                        <Badge
                          tone={
                            prelaunchReview
                              ?.acquisitionPaths
                              ?.metaInstantForm
                              ?.technicallyPrepared
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {prelaunchReview
                            ?.acquisitionPaths
                            ?.metaInstantForm
                            ?.technicallyPrepared
                            ? 'Technically Prepared'
                            : 'Configuration Pending'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </section>

                <section
                  className="rounded-2xl border p-4 sm:p-5"
                  style={cardStyle}
                >
                  <SectionTitle
                    icon={FiBarChart2}
                    title="Observed CRM Outcomes"
                    subtitle="CPC/CTR are not treated as final success metrics. CPL, CPQL and gross-profit contribution stay unavailable until real source data exists."
                  />

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <MetricBox
                      label="Leads"
                      value={
                        metricSummary?.leads ?? 0
                      }
                    />
                    <MetricBox
                      label="Valid Contacts"
                      value={
                        metricSummary
                          ?.validContacts ?? 0
                      }
                    />
                    <MetricBox
                      label="Qualified Leads"
                      value={
                        metricSummary
                          ?.qualifiedLeads ?? 0
                      }
                    />
                    <MetricBox
                      label="Quotes"
                      value={
                        metricSummary?.quotes ?? 0
                      }
                    />
                    <MetricBox
                      label="Orders"
                      value={
                        metricSummary?.orders ?? 0
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <MetricBox
                      label="Valid Contact Rate"
                      value={`${numberOrZero(
                        metricSummary
                          ?.validContactRate
                      )}%`}
                    />
                    <MetricBox
                      label="Qualified Lead Rate"
                      value={`${numberOrZero(
                        metricSummary
                          ?.qualifiedLeadRate
                      )}%`}
                    />
                    <MetricBox
                      label="Quote Rate"
                      value={`${numberOrZero(
                        metricSummary?.quoteRate
                      )}%`}
                    />
                    <MetricBox
                      label="Order Rate"
                      value={`${numberOrZero(
                        metricSummary?.orderRate
                      )}%`}
                    />
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor:
                          'var(--crm-line)',
                        background:
                          'var(--crm-bg-sunken)',
                      }}
                    >
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color:
                            'var(--crm-heading)',
                        }}
                      >
                        Acquisition Path Comparison
                      </div>

                      <p
                        className="mt-1 text-[11px] leading-5"
                        style={{
                          color:
                            'var(--crm-ink-faint)',
                        }}
                      >
                        Compare downstream lead quality between the Website path
                        and Meta Instant Form path. This does not declare a winner.
                      </p>

                      <div className="mt-4 overflow-x-auto rounded-xl">
                        <table className="min-w-full text-left text-xs">
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
                              <th className="px-2 py-2 font-semibold">
                                Path
                              </th>
                              <th className="px-2 py-2 font-semibold">
                                Leads
                              </th>
                              <th className="px-2 py-2 font-semibold">
                                Valid %
                              </th>
                              <th className="px-2 py-2 font-semibold">
                                Qualified %
                              </th>
                              <th className="px-2 py-2 font-semibold">
                                Quote %
                              </th>
                              <th className="px-2 py-2 font-semibold">
                                Order %
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {[
                              [
                                'Website',
                                websiteMetrics,
                              ],
                              [
                                'Meta Instant Form',
                                metaInstantFormMetrics,
                              ],
                            ].map(
                              ([label, row]) => (
                                <tr
                                  key={label}
                                  className="border-b last:border-b-0"
                                  style={{
                                    borderColor:
                                      'var(--crm-line)',
                                    color:
                                      'var(--crm-ink)',
                                  }}
                                >
                                  <td
                                    className="px-2 py-3 font-semibold"
                                    style={{
                                      color:
                                        'var(--crm-heading)',
                                    }}
                                  >
                                    {label}
                                  </td>
                                  <td className="px-2 py-3">
                                    {row?.leads ?? 0}
                                  </td>
                                  <td className="px-2 py-3">
                                    {numberOrZero(
                                      row?.validContactRate
                                    )}
                                    %
                                  </td>
                                  <td className="px-2 py-3">
                                    {numberOrZero(
                                      row?.qualifiedLeadRate
                                    )}
                                    %
                                  </td>
                                  <td className="px-2 py-3">
                                    {numberOrZero(
                                      row?.quoteRate
                                    )}
                                    %
                                  </td>
                                  <td className="px-2 py-3">
                                    {numberOrZero(
                                      row?.orderRate
                                    )}
                                    %
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor:
                          'var(--crm-line)',
                        background:
                          'var(--crm-bg-sunken)',
                      }}
                    >
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color:
                            'var(--crm-heading)',
                        }}
                      >
                        Cost / Profit Metrics
                      </div>

                      <p
                        className="mt-1 text-[11px] leading-5"
                        style={{
                          color:
                            'var(--crm-ink-faint)',
                        }}
                      >
                        Values remain unavailable until the corresponding real
                        source data is stored. No ad spend or gross profit is inferred.
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <MetricBox
                          label="CPL"
                          value={
                            metrics
                              ?.unavailableWithoutAdditionalRealData
                              ?.cpl?.value ?? '—'
                          }
                        />

                        <MetricBox
                          label="CPQL"
                          value={
                            metrics
                              ?.unavailableWithoutAdditionalRealData
                              ?.cpql?.value ?? '—'
                          }
                        />

                        <MetricBox
                          label="Gross Profit Contribution"
                          value={
                            metrics
                              ?.unavailableWithoutAdditionalRealData
                              ?.grossProfitContribution
                              ?.value ?? '—'
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-5 rounded-xl border p-4"
                    style={{
                      borderColor:
                        'var(--crm-line)',
                      background:
                        'var(--crm-bg-sunken)',
                    }}
                  >
                    <div
                      className="text-xs font-semibold"
                      style={{
                        color:
                          'var(--crm-heading)',
                      }}
                    >
                      Creative Outcome Comparison
                    </div>

                    <p
                      className="mt-1 text-[11px] leading-5"
                      style={{
                        color:
                          'var(--crm-ink-faint)',
                      }}
                    >
                      Each governed UTM content key is measured separately so the
                      3–5 controlled creatives can be reviewed using CRM outcomes.
                    </p>

                    <div className="mt-4 overflow-x-auto rounded-xl">
                      <table className="min-w-full text-left text-xs">
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
                            <th className="px-2 py-2 font-semibold">
                              Creative
                            </th>
                            <th className="px-2 py-2 font-semibold">
                              Angle
                            </th>
                            <th className="px-2 py-2 font-semibold">
                              UTM Content
                            </th>
                            <th className="px-2 py-2 font-semibold">
                              Leads
                            </th>
                            <th className="px-2 py-2 font-semibold">
                              Qualified
                            </th>
                            <th className="px-2 py-2 font-semibold">
                              Quote
                            </th>
                            <th className="px-2 py-2 font-semibold">
                              Orders
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {creativeMetrics.length > 0 ? (
                            creativeMetrics.map(
                              (row) => (
                                <tr
                                  key={row.utmContent}
                                  className="border-b last:border-b-0"
                                  style={{
                                    borderColor:
                                      'var(--crm-line)',
                                    color:
                                      'var(--crm-ink)',
                                  }}
                                >
                                  <td
                                    className="px-2 py-3 font-semibold"
                                    style={{
                                      color:
                                        'var(--crm-heading)',
                                    }}
                                  >
                                    {row.name || '—'}
                                  </td>
                                  <td className="px-2 py-3">
                                    {prettify(
                                      row.angle
                                    )}
                                  </td>
                                  <td className="px-2 py-3 font-mono">
                                    {row.utmContent || '—'}
                                  </td>
                                  <td className="px-2 py-3">
                                    {row.leads ?? 0}
                                  </td>
                                  <td className="px-2 py-3">
                                    {row.qualifiedLeads ?? 0}
                                  </td>
                                  <td className="px-2 py-3">
                                    {row.quotes ?? 0}
                                  </td>
                                  <td className="px-2 py-3">
                                    {row.orders ?? 0}
                                  </td>
                                </tr>
                              )
                            )
                          ) : (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-2 py-5 text-center"
                                style={{
                                  color:
                                    'var(--crm-ink-faint)',
                                }}
                              >
                                No creative outcome data is available yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Badge
                      tone={
                        metrics?.phase4
                          ?.exitCriterionAchieved
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {metrics?.phase4
                        ?.exitCriterionAchieved
                        ? 'Phase 4 exit criterion achieved'
                        : 'Phase 4 exit criterion not yet achieved'}
                    </Badge>
                  </div>
                </section>

                <section
                  className="rounded-2xl border p-4 sm:p-5"
                  style={cardStyle}
                >
                  <SectionTitle
                    icon={FiUsers}
                    title="Audience Exclusion Review"
                    subtitle="Privacy-safe counts only. No phone/email export or Meta Custom Audience sync is performed here."
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor:
                          'var(--crm-line)',
                        background:
                          'var(--crm-bg-sunken)',
                      }}
                    >
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color:
                            'var(--crm-heading)',
                        }}
                      >
                        Company-wide known contacts
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <MetricBox
                          label="Total"
                          value={
                            audienceScopes
                              ?.companyWideKnownContacts
                              ?.total ?? 0
                          }
                        />
                        <MetricBox
                          label="Customers"
                          value={
                            audienceScopes
                              ?.companyWideKnownContacts
                              ?.customers ?? 0
                          }
                        />
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor:
                          'var(--crm-line)',
                        background:
                          'var(--crm-bg-sunken)',
                      }}
                    >
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color:
                            'var(--crm-heading)',
                        }}
                      >
                        Stone known contacts
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <MetricBox
                          label="Total"
                          value={
                            audienceScopes
                              ?.stoneKnownContacts
                              ?.total ?? 0
                          }
                        />
                        <MetricBox
                          label="Customers"
                          value={
                            audienceScopes
                              ?.stoneKnownContacts
                              ?.customers ?? 0
                          }
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  className="rounded-2xl border p-4 sm:p-5"
                  style={cardStyle}
                >
                  <SectionTitle
                    icon={FiTarget}
                    title="Commercial Definition"
                    subtitle="Values below are persisted inputs supplied by the business. No market/economic value is generated by this page."
                  />

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      [
                        'Source',
                        selectedCampaign
                          .marketSelection
                          ?.source,
                      ],
                      [
                        'MOQ',
                        `${selectedCampaign
                          .marketSelection
                          ?.minimumCommercialQuantity
                          ?.value ?? '—'} ${
                          selectedCampaign
                            .marketSelection
                            ?.minimumCommercialQuantity
                            ?.unit || ''
                        }`,
                      ],
                      [
                        'Margin band',
                        selectedCampaign
                          .marketSelection
                          ?.marginBand,
                      ],
                      [
                        'Landing page',
                        selectedCampaign
                          .landingPage,
                      ],
                      [
                        'Buyer context',
                        selectedCampaign
                          .buyerContext,
                      ],
                      [
                        'Created',
                        formatDate(
                          selectedCampaign
                            .createdAt
                        ),
                      ],
                    ].map(
                      ([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl border p-4"
                          style={{
                            borderColor:
                              'var(--crm-line)',
                            background:
                              'var(--crm-bg-sunken)',
                          }}
                        >
                          <div
                            className="text-[10px] font-bold uppercase tracking-widest"
                            style={{
                              color:
                                'var(--crm-ink-faint)',
                            }}
                          >
                            {label}
                          </div>

                          <div
                            className="mt-2 break-words text-sm font-semibold"
                            style={{
                              color:
                                'var(--crm-heading)',
                            }}
                          >
                            {value || '—'}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              </div>
            )}

            {loadingDetail && selectedId && (
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px]"
                style={sunkenCardStyle}
              >
                <FiRefreshCw className="animate-spin" />
                Refreshing selected campaign…
              </div>
            )}
          </main>
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/65 p-2 backdrop-blur-sm sm:p-4">
          <div
            className="flex max-h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border sm:max-h-[calc(100vh-2rem)]"
            style={cardStyle}
          >
            <div
              className="shrink-0 flex items-start justify-between gap-4 border-b p-4 sm:p-5"
              style={{
                borderColor:
                  'var(--crm-line)',
              }}
            >
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{
                    color:
                      'var(--crm-heading)',
                  }}
                >
                  {editingId
                    ? 'Edit Controlled Campaign'
                    : 'New Controlled Campaign'}
                </h2>

                <p
                  className="mt-1 text-xs"
                  style={{
                    color:
                      'var(--crm-ink-faint)',
                  }}
                >
                  Enter only real Operations / Management data. Editing an existing
                  campaign clears prior Operations confirmation and Management approval.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditorOpen(false)
                }
                className="rounded-xl border p-2.5 transition hover:opacity-80"
                style={sunkenCardStyle}
                aria-label="Close campaign editor"
              >
                <FiX />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="min-h-0 flex-1 space-y-7 overflow-y-auto p-4 sm:p-5"
            >
              <section>
                <SectionTitle
                  icon={FiTarget}
                  title="Market Selection"
                  subtitle="One real Stone product + one real commercially selected market."
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Product">
                    <input
                      required
                      value={
                        form
                          .marketSelection
                          .product
                      }
                      onChange={(event) =>
                        setMarketField(
                          'product',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                      placeholder="Real product"
                    />
                  </Field>

                  <Field label="Source">
                    <input
                      required
                      value={
                        form
                          .marketSelection
                          .source
                      }
                      onChange={(event) =>
                        setMarketField(
                          'source',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                      placeholder="Real supply source"
                    />
                  </Field>

                  <Field label="Target market type">
                    <select
                      required
                      value={
                        form
                          .marketSelection
                          .targetMarket
                          .type
                      }
                      onChange={(event) =>
                        setNestedMarketField(
                          'targetMarket',
                          'type',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                    >
                      <option value="">
                        Select
                      </option>
                      {TARGET_MARKET_TYPES.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {prettify(item)}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Target market name">
                    <input
                      required
                      value={
                        form
                          .marketSelection
                          .targetMarket
                          .name
                      }
                      onChange={(event) =>
                        setNestedMarketField(
                          'targetMarket',
                          'name',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                      placeholder="Real city / district / corridor"
                    />
                  </Field>

                  <Field label="Actual operating MOQ">
                    <input
                      required
                      type="number"
                      min="0"
                      value={
                        form
                          .marketSelection
                          .minimumCommercialQuantity
                          .value
                      }
                      onChange={(event) =>
                        setNestedMarketField(
                          'minimumCommercialQuantity',
                          'value',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                    />
                  </Field>

                  <Field label="MOQ unit">
                    <input
                      required
                      value={
                        form
                          .marketSelection
                          .minimumCommercialQuantity
                          .unit
                      }
                      onChange={(event) =>
                        setNestedMarketField(
                          'minimumCommercialQuantity',
                          'unit',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                      placeholder="Real operating unit"
                    />
                  </Field>

                  <Field label="Delivery capability">
                    <select
                      required
                      value={
                        form
                          .marketSelection
                          .deliveryCapability
                      }
                      onChange={(event) =>
                        setMarketField(
                          'deliveryCapability',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                    >
                      <option value="">
                        Select
                      </option>
                      {DELIVERY_CAPABILITIES.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {prettify(item)}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Priority">
                    <select
                      required
                      value={
                        form
                          .marketSelection
                          .priority
                      }
                      onChange={(event) =>
                        setMarketField(
                          'priority',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                    >
                      <option value="">
                        Select
                      </option>
                      {PRIORITIES.map(
                        (item) => (
                          <option
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Internal margin band">
                    <input
                      required
                      value={
                        form
                          .marketSelection
                          .marginBand
                      }
                      onChange={(event) =>
                        setMarketField(
                          'marginBand',
                          event.target.value
                        )
                      }
                      className={INPUT}
                      style={fieldStyle}
                      placeholder="Real internal margin band"
                    />
                  </Field>
                </div>

                <div className="mt-4 space-y-3">
                  <MoneyRangeFields
                    title="Material Economics"
                    value={
                      form.marketSelection
                        .materialEconomics
                    }
                    onChange={(value) =>
                      setMarketField(
                        'materialEconomics',
                        value
                      )
                    }
                  />

                  <MoneyRangeFields
                    title="Freight Economics"
                    value={
                      form.marketSelection
                        .freightEconomics
                    }
                    onChange={(value) =>
                      setMarketField(
                        'freightEconomics',
                        value
                      )
                    }
                  />

                  <MoneyRangeFields
                    title="Expected Selling Range"
                    value={
                      form.marketSelection
                        .expectedSellingRange
                    }
                    onChange={(value) =>
                      setMarketField(
                        'expectedSellingRange',
                        value
                      )
                    }
                  />
                </div>
              </section>

              <section>
                <SectionTitle
                  icon={FiActivity}
                  title="Landing Experience & Attribution"
                  subtitle="Landing page must match the selected product, geography and promise. UTM campaign uses governed lowercase naming."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Matched landing page">
                    <input
                      required
                      value={form.landingPage}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          landingPage:
                            event.target.value,
                        }))
                      }
                      className={INPUT}
                      style={fieldStyle}
                      placeholder="Existing route / URL / stable reference"
                    />
                  </Field>

                  <Field label="UTM campaign">
                    <input
                      required
                      value={form.utm.campaign}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          utm: {
                            ...current.utm,
                            campaign:
                              event.target.value
                                .toLowerCase(),
                          },
                        }))
                      }
                      className={INPUT}
                      style={fieldStyle}
                      placeholder="lowercase_campaign_key"
                    />
                  </Field>

                  <Field label="Acquisition alternatives">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {['WEBSITE', 'META_INSTANT_FORM'].map((path) => {
                        const checked =
                          form.acquisitionPaths.includes(path);

                        return (
                          <label
                            key={path}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-medium transition hover:opacity-90"
                            style={{
                              ...sunkenCardStyle,
                              borderColor: checked
                                ? 'var(--crm-accent)'
                                : 'var(--crm-line)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  acquisitionPaths: event.target.checked
                                    ? [
                                        ...current.acquisitionPaths,
                                        path,
                                      ]
                                    : current.acquisitionPaths.filter(
                                        (item) => item !== path
                                      ),
                                }))
                              }
                            />
                            {path.replaceAll('_', ' ')}
                          </label>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Campaign promise">
                    <textarea
                      required
                      rows={4}
                      value={form.campaignPromise}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          campaignPromise: event.target.value,
                        }))
                      }
                      className={`${INPUT} resize-y`}
                      style={fieldStyle}
                    />
                  </Field>
                  <Field label="Buyer context">
                    <input
                      required
                      value={form.buyerContext}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          buyerContext:
                            event.target.value,
                        }))
                      }
                      className={INPUT}
                      style={fieldStyle}
                      placeholder="Descriptive buyer context only"
                    />
                  </Field>

                  <Field
                    label="Acquisition paths"
                    hint="Fixed by DPR controlled-test design."
                  >
                    <div
                      className="flex min-h-[42px] items-center gap-2 rounded-lg border px-3"
                      style={{
                        borderColor:
                          'var(--crm-line)',
                        background:
                          'var(--crm-bg-sunken)',
                      }}
                    >
                      <Badge tone="info">
                        Website
                      </Badge>
                      <Badge tone="info">
                        Meta Instant Form
                      </Badge>
                    </div>
                  </Field>

                  <Field
                    label="Meta campaign ID"
                    hint="Optional. Enter only after the real ID exists."
                  >
                    <input
                      value={form.metaCampaignId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          metaCampaignId:
                            event.target.value,
                        }))
                      }
                      className={INPUT}
                      style={fieldStyle}
                    />
                  </Field>

                  <Field
                    label="Meta ad set ID"
                    hint="Optional. Enter only after the real ID exists."
                  >
                    <input
                      value={form.metaAdSetId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          metaAdSetId:
                            event.target.value,
                        }))
                      }
                      className={INPUT}
                      style={fieldStyle}
                    />
                  </Field>
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <SectionTitle
                    icon={FiBarChart2}
                    title="Creative Matrix"
                    subtitle="Use 3–5 distinct DPR creative angles. Do not invent unsupported claims."
                  />

                  <button
                    type="button"
                    disabled={
                      form.creatives.length >= 5
                    }
                    onClick={addCreative}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    style={cardStyle}
                  >
                    <FiPlus />
                    Add Creative
                  </button>
                </div>

                <div className="space-y-4">
                  {form.creatives.map(
                    (creative, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border p-4"
                        style={{
                          borderColor:
                            'var(--crm-line)',
                          background:
                            'var(--crm-bg-sunken)',
                        }}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div
                            className="text-xs font-semibold"
                            style={{
                              color:
                                'var(--crm-heading)',
                            }}
                          >
                            Creative {index + 1}
                          </div>

                          {form.creatives.length >
                            3 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeCreative(
                                  index
                                )
                              }
                              className="text-xs font-semibold"
                              style={{
                                color:
                                  'var(--crm-danger)',
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <Field label="Creative angle">
                            <select
                              required
                              value={
                                creative.angle
                              }
                              onChange={(event) =>
                                updateCreative(
                                  index,
                                  'angle',
                                  event.target.value
                                )
                              }
                              className={INPUT}
                              style={fieldStyle}
                            >
                              <option value="">
                                Select
                              </option>
                              {CREATIVE_ANGLES.map(
                                (item) => (
                                  <option
                                    key={
                                      item.value
                                    }
                                    value={
                                      item.value
                                    }
                                  >
                                    {
                                      item.label
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </Field>

                          <Field label="Internal creative name">
                            <input
                              required
                              value={
                                creative.name
                              }
                              onChange={(event) =>
                                updateCreative(
                                  index,
                                  'name',
                                  event.target.value
                                )
                              }
                              className={INPUT}
                              style={fieldStyle}
                            />
                          </Field>

                          <Field label="Actual creative message">
                            <textarea
                              required
                              rows={4}
                              value={creative.message}
                              onChange={(event) =>
                                updateCreative(
                                  index,
                                  'message',
                                  event.target.value
                                )
                              }
                              className={`${INPUT} resize-y`}
                              style={fieldStyle}
                            />
                          </Field>
                          <Field label="Asset reference">
                            <input
                              required
                              value={
                                creative.assetReference
                              }
                              onChange={(event) =>
                                updateCreative(
                                  index,
                                  'assetReference',
                                  event.target.value
                                )
                              }
                              className={INPUT}
                              style={fieldStyle}
                              placeholder="Approved asset URL / key / path"
                            />
                          </Field>

                          <Field label="UTM content">
                            <input
                              required
                              value={
                                creative.utmContent
                              }
                              onChange={(event) =>
                                updateCreative(
                                  index,
                                  'utmContent',
                                  event.target.value.toLowerCase()
                                )
                              }
                              className={INPUT}
                              style={fieldStyle}
                              placeholder="lowercase_creative_key"
                            />
                          </Field>

                          <Field
                            label="Meta ad ID"
                            hint="Optional until real ID exists."
                          >
                            <input
                              value={
                                creative.metaAdId
                              }
                              onChange={(event) =>
                                updateCreative(
                                  index,
                                  'metaAdId',
                                  event.target.value
                                )
                              }
                              className={INPUT}
                              style={fieldStyle}
                            />
                          </Field>

                          <Field
                            label="Meta creative ID"
                            hint="Optional until real ID exists."
                          >
                            <input
                              value={
                                creative.metaCreativeId
                              }
                              onChange={(event) =>
                                updateCreative(
                                  index,
                                  'metaCreativeId',
                                  event.target.value
                                )
                              }
                              className={INPUT}
                              style={fieldStyle}
                            />
                          </Field>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              <div
                className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t px-4 py-4 sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end sm:px-5"
                style={{
                  borderColor: 'var(--crm-line)',
                  background: 'var(--crm-bg-raised)',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setEditorOpen(false)
                  }
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
                  style={sunkenCardStyle}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={primaryButtonStyle}
                >
                  <FiSave />
                  {saving
                    ? 'Saving…'
                    : editingId
                    ? 'Save Changes'
                    : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
