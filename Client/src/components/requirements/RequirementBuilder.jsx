import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiArrowRight, FiCheckCircle, FiTruck, FiMapPin, FiCalendar, FiPackage, FiGlobe, FiTag, FiClock, FiDollarSign, FiAlertCircle
} from 'react-icons/fi';
import { pushDataLayerEvent } from '../../utils/analytics';

const STEP_CONFIG = {
  STONE: [
    { key: 'material', label: 'Material Grade', icon: FiPackage, event: 'select_product' },
    { key: 'quantity', label: 'Quantity Required', icon: FiTruck, event: 'select_quantity' },
    { key: 'destination', label: 'Discharge Port / City & PIN', icon: FiMapPin, event: 'enter_destination' },
    { key: 'timeline', label: 'Requirement Date / Lead Urgency', icon: FiCalendar, event: 'select_timeline' },
  ],
  RICE: [
    { key: 'variety', label: 'Rice Variety / Grade', icon: FiTag, event: 'select_product' },
    { key: 'quantity', label: 'Quantity Required', icon: FiTruck, event: 'select_quantity' },
    { key: 'packaging', label: 'Packaging', icon: FiPackage, event: 'select_packaging' },
    { key: 'tradeType', label: 'Domestic / Export', icon: FiGlobe, event: 'select_trade_type' },
    { key: 'destination', label: 'Discharge Port / City & PIN', icon: FiMapPin, event: 'enter_destination' },
    // { key: 'budget', label: 'Estimated Budget / Valuation', icon: FiDollarSign, event: 'select_budget' },
    { key: 'timeline', label: 'Requirement Date / Lead Urgency', icon: FiCalendar, event: 'select_timeline' },
  ],
  TEA: [
    { key: 'teaType', label: 'Tea Type / Grade', icon: FiTag, event: 'select_product' },
    { key: 'quantity', label: 'Quantity Required', icon: FiTruck, event: 'select_quantity' },
    { key: 'packaging', label: 'Packaging', icon: FiPackage, event: 'select_packaging' },
    { key: 'tradeType', label: 'Domestic / Export', icon: FiGlobe, event: 'select_trade_type' },
    { key: 'privateLabel', label: 'Private Label', icon: FiTag, event: 'select_private_label' },
    { key: 'destination', label: 'Discharge Port / City & PIN', icon: FiMapPin, event: 'enter_destination' },
    // { key: 'budget', label: 'Estimated Budget / Valuation', icon: FiDollarSign, event: 'select_budget' },
    { key: 'timeline', label: 'Requirement Date / Lead Urgency', icon: FiCalendar, event: 'select_timeline' },
  ],
};

const DISCHARGE_PORTS = [
  'Kolkata Port (WB)',
  'Haldia Port (WB)',
  'Siliguri Inland Depot',
  'Patna Inland Freight Terminal',
  'Kishanganj Hub',
  'Visakhapatnam (Vizag) Port',
  'Nhava Sheva (JNPT) Port',
  'Chennai Port',
  'Mundra Port (Gujarat)',
  'Custom Discharge Port / City'
];

/*
 * HARD-CODED LOCATION -> PIN MAPPING
 * -----------------------------------
 * No Google Geocoding API, external request, API key, or backend change is
 * required. When a known location is selected/typed, its PIN is populated
 * locally from this map.
 *
 * If the business later adds another location, add it here once.
 */
const LOCATION_PIN_MAP = {
  'Kolkata Port (WB)': '700001',
  'Haldia Port (WB)': '721607',
  'Siliguri Inland Depot': '734001',
  'Patna Inland Freight Terminal': '800001',
  'Kishanganj Hub': '855107',
  'Visakhapatnam (Vizag) Port': '530001',
  'Nhava Sheva (JNPT) Port': '400707',
  'Chennai Port': '600001',
  'Mundra Port (Gujarat)': '370421',

  // Common city/port aliases. These are also handled if entered manually.
  'Kolkata': '700001',
  'Haldia': '721607',
  'Siliguri': '734001',
  'Patna': '800001',
  'Kishanganj': '855107',
  'Visakhapatnam': '530001',
  'Vizag': '530001',
  'Navi Mumbai': '400707',
  'Nhava Sheva': '400707',
  'JNPT': '400707',
  'Chennai': '600001',
  'Mundra': '370421'
};

const normalizeLocationKey = (location = '') =>
  location
    .trim()
    .toLowerCase()
    .replace(/[()\-/,]+/g, ' ')
    .replace(/\s+/g, ' ');

const NORMALIZED_LOCATION_PIN_MAP = Object.entries(LOCATION_PIN_MAP).reduce((acc, [location, pin]) => {
  acc[normalizeLocationKey(location)] = pin;
  return acc;
}, {});

const getHardcodedPinForLocation = (location = '') => {
  const normalized = normalizeLocationKey(location);
  if (!normalized) return '';

  // Exact normalized match first.
  if (NORMALIZED_LOCATION_PIN_MAP[normalized]) {
    return NORMALIZED_LOCATION_PIN_MAP[normalized];
  }

  // Then support a known location appearing inside a longer custom entry.
  const matchingEntry = Object.entries(NORMALIZED_LOCATION_PIN_MAP).find(([key]) =>
    normalized.includes(key) || key.includes(normalized)
  );

  return matchingEntry?.[1] || '';
};

export function RequirementBuilder({ division, config, onComplete, onStepChange }) {
  const normalizedDivision = (division || 'STONE').toUpperCase();
  const steps = STEP_CONFIG[normalizedDivision] || STEP_CONFIG.STONE;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [requirement, setRequirement] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [customPort, setCustomPort] = useState('');
  const [isCustomLocationMode, setIsCustomLocationMode] = useState(false);
  const [customBudget, setCustomBudget] = useState('');
  const [customDate, setCustomDate] = useState('');

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    if (!steps.length || currentStepIndex >= steps.length) setCurrentStepIndex(0);
  }, [steps.length, currentStepIndex]);

  useEffect(() => {
    pushDataLayerEvent('start_requirement', { division });
  }, [division]);

  useEffect(() => {
    if (showSoftGate) {
      onComplete?.(requirement);
    }
  }, [showSoftGate, requirement, onComplete]);

  const currentPin = (requirement.destination?.pin || requirement.pin || '').trim();
  const currentLoc = (requirement.destination?.location || requirement.dischargePort || '').trim();
  const isPinValid = currentPin.length === 6;
  const isPortValid = currentLoc.length > 0;
  const isDestinationStepValid = isPortValid && isPinValid;

  const currentBudgetVal = (requirement.budget || requirement.estimatedValue || '').trim();
  const isBudgetStepValid = currentBudgetVal.length > 0;

  const destStepIdx = steps.findIndex(s => s.key === 'destination');
  const budgetStepIdx = steps.findIndex(s => s.key === 'budget');

  // Auto Guard: If user is on budget/timeline step without valid 6-digit PIN, force back to destination step
  useEffect(() => {
    if (destStepIdx !== -1 && currentStepIndex > destStepIdx && !isDestinationStepValid) {
      setCurrentStepIndex(destStepIdx);
    }
  }, [currentStepIndex, destStepIdx, isDestinationStepValid]);

  const handleOptionSelect = useCallback((key, value, meta = {}) => {
    setRequirement(prev => ({ ...prev, [key]: value }));
    if (currentStep?.event) pushDataLayerEvent(currentStep.event, { division, [key]: value, ...meta });

    const primaryKey = currentStep?.key;
    const shouldAdvance = key === primaryKey && key !== 'pin' && key !== 'destination' && key !== 'budget' && key !== 'timeline';
    if (shouldAdvance && !isLastStep) {
      setTimeout(() => setCurrentStepIndex(prev => prev + 1), 300);
    }
    onStepChange?.(currentStepIndex, key, value);
  }, [currentStep, isLastStep, division, onStepChange]);

  const goNext = () => {
    if (destStepIdx !== -1 && currentStepIndex >= destStepIdx && !isDestinationStepValid) {
      setCurrentStepIndex(destStepIdx);
      return;
    }
    if (budgetStepIdx !== -1 && currentStepIndex >= budgetStepIdx && !isBudgetStepValid) {
      setCurrentStepIndex(budgetStepIdx);
      return;
    }

    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = () => {
    if (destStepIdx !== -1 && (!isPortValid || !isPinValid)) {
      setCurrentStepIndex(destStepIdx);
      return;
    }

    if (budgetStepIdx !== -1 && !isBudgetStepValid) {
      setCurrentStepIndex(budgetStepIdx);
      return;
    }

    setShowSoftGate(true);
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const isCurrentStepValid = () => {
    if (currentStep?.key === 'destination') return isDestinationStepValid;
    if (currentStep?.key === 'budget') return isBudgetStepValid;
    return true;
  };

  const renderStepContent = () => {
    if (!currentStep) return <div className="text-center text-black">Loading...</div>;
    const stepRenderer = config?.renderStep?.[currentStep.key];
    if (stepRenderer) return stepRenderer({ requirement, handleOptionSelect, division });

    const options = config?.options?.[currentStep.key] || [];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((opt) => (
          <motion.button
            key={opt.value}
            onClick={() => handleOptionSelect(currentStep.key, opt.value, opt.meta)}
            disabled={isSubmitting}
            className={`p-6 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
              requirement[currentStep.key] === opt.value
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-300 hover:border-blue-600 hover:bg-gray-50'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: options.indexOf(opt) * 0.05 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <currentStep.icon className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-black">{opt.label}</span>
            </div>
            {opt.description && <p className="text-sm text-gray-600">{opt.description}</p>}
            {requirement[currentStep.key] === opt.value && (
              <FiCheckCircle className="absolute top-3 right-3 w-6 h-6 text-blue-600" />
            )}
          </motion.button>
        ))}
      </div>
    );
  };

  const renderDestinationInput = () => {
    const destData = config?.destinationData || [];
    const selectedMaterial = requirement.material || requirement.variety || requirement.teaType || '';
    const isPinIncomplete = currentPin.length > 0 && currentPin.length < 6;

    const locationOptions = Array.from(new Set([
      ...destData.map(d => d.location).filter(Boolean),
      ...DISCHARGE_PORTS
    ]));

    const selectedLocData = destData.find(d => d.location === currentLoc);
    let priceInfo = null;
    if (selectedLocData && selectedMaterial) {
      priceInfo = selectedLocData.rates?.[selectedMaterial];
    }

    const applyLocationAndPin = (location) => {
      const nextPin = getHardcodedPinForLocation(location);
      const nextDestination = {
        ...(requirement.destination || {}),
        location,
        pin: nextPin
      };

      // Keep the existing requirement keys so the existing submission/backend
      // handoff receives the same shape as before.
      handleOptionSelect('destination', nextDestination, {
        location,
        pin: nextPin
      });
      handleOptionSelect('dischargePort', location);
      handleOptionSelect('pin', nextPin);
    };

    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Discharge Port / Delivery City *
          </label>

          <select
            value={locationOptions.includes(currentLoc) ? currentLoc : (currentLoc ? 'Custom Discharge Port / City' : '')}
            onChange={(e) => {
              const val = e.target.value;

              if (val === 'Custom Discharge Port / City') {
                setIsCustomLocationMode(true);
                setCustomPort('');
                applyLocationAndPin('');
                return;
              }

              setIsCustomLocationMode(false);
              setCustomPort('');
              applyLocationAndPin(val);
            }}
            className="w-full px-4 py-3.5 rounded-lg border border-gray-300 bg-white text-black font-medium text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="">Select Discharge Port / City</option>
            {locationOptions.map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>

          {(isCustomLocationMode || (!locationOptions.includes(currentLoc) && currentLoc !== '')) && (
            <input
              type="text"
              placeholder="Enter Discharge Port or City Name *"
              value={customPort || (isCustomLocationMode ? '' : currentLoc)}
              onChange={(e) => {
                const val = e.target.value;
                setCustomPort(val);
                applyLocationAndPin(val);
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-black text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          )}

          {currentLoc && !getHardcodedPinForLocation(currentLoc) && (
            <div className="flex items-start gap-2 text-xs text-amber-600 font-medium">
              <FiAlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>
                No hardcoded PIN is available for this location yet. Add the location and its PIN to
                <code className="mx-1">LOCATION_PIN_MAP</code> to enable automatic population.
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Destination PIN Code (Automatically Populated) *
          </label>

          <input
            type="text"
            placeholder="Select/enter a mapped location to populate PIN"
            value={currentPin}
            readOnly
            aria-readonly="true"
            maxLength={6}
            className={`w-full px-4 py-3.5 rounded-lg border font-mono text-base transition-colors cursor-not-allowed ${
              isPinIncomplete || (currentPin.length === 0 && currentLoc.length > 0)
                ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-400'
                : isPinValid
                ? 'border-emerald-500 bg-emerald-50/40 text-black focus:ring-2 focus:ring-emerald-500'
                : 'border-gray-300 bg-white text-black focus:ring-2 focus:ring-blue-600'
            }`}
          />

          {(!isPinValid) && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <FiAlertCircle size={14} />
              <span>
                PIN Code could not be populated automatically for this location.
              </span>
            </div>
          )}

          {isPinValid && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <FiCheckCircle size={14} />
              <span>6-Digit PIN Code Automatically Verified for Logistics Audit</span>
            </div>
          )}
        </div>

        {priceInfo !== null && priceInfo !== undefined && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
            <strong>Estimated Rate (INR/MT):</strong> {typeof priceInfo === 'object' ? (priceInfo.adv100 ?? priceInfo.adv50 ?? priceInfo.cod ?? Object.values(priceInfo)[0]) : priceInfo}
          </div>
        )}
      </div>
    );
  };

  const renderBudgetOptions = () => {
    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Enter Estimated Budget / Valuation (₹) *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base pointer-events-none">
              ₹
            </span>
            <input
              type="text"
              placeholder="e.g. 5,00,000"
              value={currentBudgetVal.replace(/^₹\s*/, '')}
              onChange={(e) => {
                const val = e.target.value;
                const formattedVal = val.trim() ? `₹${val.trim()}` : '';
                handleOptionSelect('budget', formattedVal);
                handleOptionSelect('estimatedValue', formattedVal);
              }}
              className="w-full pl-9 pr-4 py-3.5 rounded-lg border border-gray-300 bg-white text-black font-medium text-base focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          {!isBudgetStepValid && (
            <p className="text-xs text-red-500 flex items-center gap-1 font-medium mt-1">
              <FiAlertCircle size={13} />
              Required: Please enter your estimated budget to proceed.
            </p>
          )}
          {isBudgetStepValid && (
            <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium mt-1">
              <FiCheckCircle size={13} />
              Valuation Captured: {currentBudgetVal}
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500 text-center">
          Enter your estimated commercial budget or valuation in ₹.
        </p>
      </div>
    );
  };

  const renderTimelineOptions = () => {
    const timelineOptions = [
      { value: 'IMMEDIATE', label: 'Immediate / Urgent (1-3 Days)', description: 'ASAP dispatch needed within 72 hours' },
      { value: 'WITHIN_7_DAYS', label: 'Within 7 Days', description: 'Near-term procurement schedule' },
      { value: 'WITHIN_15_DAYS', label: 'Within 15 Days', description: 'Standard operational planning' },
      { value: 'FUTURE', label: 'Future Sourcing (>15 Days)', description: 'Long-term / Quarterly requirement' },
      { value: 'CUSTOM_DATE', label: 'Select Specific Date', description: 'Pick exact requirement date on calendar' },
    ];

    const currentTimeline = requirement.timeline || '';

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {timelineOptions.map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => {
                handleOptionSelect('timeline', opt.value);
                if (opt.value !== 'CUSTOM_DATE') setCustomDate('');
              }}
              className={`p-5 rounded-xl border-2 transition-all text-left relative ${
                currentTimeline === opt.value
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-300 hover:border-blue-600 hover:bg-gray-50'
              }`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <FiClock size={16} />
                </div>
                <span className="text-sm font-bold text-black">{opt.label}</span>
              </div>
              <p className="text-xs text-gray-600">{opt.description}</p>
              {currentTimeline === opt.value && (
                <FiCheckCircle className="absolute top-3 right-3 w-5 h-5 text-blue-600" />
              )}
            </motion.button>
          ))}
        </div>

        {currentTimeline === 'CUSTOM_DATE' && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase">Select Exact Requirement Date *</label>
            <input
              type="date"
              value={customDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                const val = e.target.value;
                setCustomDate(val);
                handleOptionSelect('timeline', val);
                handleOptionSelect('requiredDate', val);
                handleOptionSelect('targetDate', val);
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-black text-sm font-medium focus:ring-2 focus:ring-blue-600"
            />
          </div>
        )}
      </div>
    );
  };

  if (!currentStep) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center py-12">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading requirement builder...</p>
      </div>
    );
  }

  if (showSoftGate) {
    return null;
  }

  return (
    <div className={`ito-tea-builder w-full max-w-4xl mx-auto ${normalizedDivision === "TEA" ? "ito-tea-builder-active" : ""} ${normalizedDivision === "RICE" ? "ito-rice-builder-active" : ""} ${normalizedDivision === "STONE" ? "ito-stone-builder-active" : ""}`}>
      
      <style>{`
        /* =========================================================
           INDIA TRADE OVERSEAS — SHARED REQUIREMENT BUILDER UI
           Onion.jsx visual structure + page-specific palettes.

           IMPORTANT:
           - UI/CSS only.
           - No requirement state, validation, analytics, pricing,
             submission, API or backend logic is changed here.
           ========================================================= */

        .ito-tea-builder,
        .ito-rice-builder-active,
        .ito-stone-builder-active {
          --rb-bg: #37424B;
          --rb-panel: #2B333A;
          --rb-accent: #C5A059;
          --rb-accent-soft: #DCCCB4;
          --rb-deep: #20262B;
          --rb-text: #F4F2EE;
          --rb-muted: #A89E8E;
          --rb-border: #4A545E;
          --rb-pale: #DCD3C4;
          --rb-danger: #D98C8C;
          --rb-success: #C5A059;

          width: 100% !important;
          max-width: 920px !important;
          height: auto;
          max-height: min(820px, calc(100vh - 40px));
          margin: 0 auto !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          border: 1px solid var(--rb-border) !important;
          border-radius: 24px !important;
          background: linear-gradient(145deg, var(--rb-bg), var(--rb-panel) 58%, var(--rb-deep)) !important;
          color: var(--rb-text) !important;
          box-shadow: 0 40px 100px rgba(0,0,0,.35) !important;
        }

        /* =========================
           PAGE PALETTES
           ========================= */
        .ito-tea-builder-active {
          --rb-bg: #0B3D2E;
          --rb-panel: #004B3B;
          --rb-accent: #50C878;
          --rb-accent-soft: #C5E3D3;
          --rb-deep: #04140E;
          --rb-text: #FAF9F5;
          --rb-muted: #8FB5A3;
          --rb-border: #1B4B3A;
          --rb-pale: #C5E3D3;
          --rb-success: #40B064;
        }

        .ito-rice-builder-active {
          --rb-bg: #5A4422;
          --rb-panel: #4A3819;
          --rb-accent: #D9B85C;
          --rb-accent-soft: #F2E3B4;
          --rb-deep: #2E2000;
          --rb-text: #FFF9EC;
          --rb-muted: #C9AE81;
          --rb-border: #6E5228;
          --rb-pale: #F0E3C4;
          --rb-success: #C09350;
        }

        .ito-stone-builder-active {
          --rb-bg: #37424B;
          --rb-panel: #2B333A;
          --rb-accent: #C5A059;
          --rb-accent-soft: #DCCCB4;
          --rb-deep: #20262B;
          --rb-text: #F4F2EE;
          --rb-muted: #A89E8E;
          --rb-border: #4A545E;
          --rb-pale: #DCD3C4;
          --rb-success: #C5A059;
        }

        /* =========================
           ONION-STYLE HEADER
           ========================= */
        .ito-tea-builder .ito-rice-header,
        .ito-rice-builder-active .ito-rice-header,
        .ito-stone-builder-active .ito-rice-header {
          flex: 0 0 auto !important;
          padding: 26px 30px 20px !important;
          border-bottom: 1px solid color-mix(in srgb, var(--rb-text) 10%, transparent) !important;
          background: transparent !important;
        }

        .ito-tea-builder .ito-rice-header-top,
        .ito-rice-builder-active .ito-rice-header-top,
        .ito-stone-builder-active .ito-rice-header-top {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 20px !important;
        }

        .ito-tea-builder .ito-rice-kicker,
        .ito-rice-builder-active .ito-rice-kicker,
        .ito-stone-builder-active .ito-rice-kicker {
          display: block !important;
          margin-bottom: 7px !important;
          color: var(--rb-accent) !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: .18em !important;
          text-transform: uppercase !important;
        }

        .ito-tea-builder .ito-rice-header h3,
        .ito-rice-builder-active .ito-rice-header h3,
        .ito-stone-builder-active .ito-rice-header h3 {
          margin: 0 !important;
          color: var(--rb-text) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: clamp(27px, 4vw, 42px) !important;
          line-height: 1.05 !important;
          font-weight: 500 !important;
        }

        /* =========================
           PROGRESS
           ========================= */
        .ito-tea-builder .ito-rice-progress,
        .ito-rice-builder-active .ito-rice-progress,
        .ito-stone-builder-active .ito-rice-progress {
          margin-top: 22px !important;
        }

        .ito-tea-builder .ito-rice-progress-meta,
        .ito-rice-builder-active .ito-rice-progress-meta,
        .ito-stone-builder-active .ito-rice-progress-meta {
          display: flex !important;
          justify-content: space-between !important;
          margin-bottom: 9px !important;
          color: var(--rb-muted) !important;
          font-size: 12px !important;
        }

        .ito-tea-builder .ito-rice-progress-track,
        .ito-rice-builder-active .ito-rice-progress-track,
        .ito-stone-builder-active .ito-rice-progress-track {
          height: 4px !important;
          overflow: hidden !important;
          border-radius: 999px !important;
          background: rgba(255,255,255,.10) !important;
        }

        .ito-tea-builder .ito-rice-progress-fill,
        .ito-rice-builder-active .ito-rice-progress-fill,
        .ito-stone-builder-active .ito-rice-progress-fill {
          height: 100% !important;
          border-radius: inherit !important;
          background: linear-gradient(90deg, var(--rb-accent-soft), var(--rb-accent)) !important;
        }

        /* =========================
           FLAT ONION-STYLE STEP NAV
           No large circles.
           ========================= */
        .ito-tea-builder .ito-rice-steps,
        .ito-rice-builder-active .ito-rice-steps,
        .ito-stone-builder-active .ito-rice-steps {
          display: flex !important;
          gap: 18px !important;
          margin-top: 15px !important;
          overflow-x: auto !important;
          scrollbar-width: none !important;
        }

        .ito-tea-builder .ito-rice-steps::-webkit-scrollbar,
        .ito-rice-builder-active .ito-rice-steps::-webkit-scrollbar,
        .ito-stone-builder-active .ito-rice-steps::-webkit-scrollbar {
          display: none !important;
        }

        .ito-tea-builder .ito-rice-step,
        .ito-rice-builder-active .ito-rice-step,
        .ito-stone-builder-active .ito-rice-step {
          flex: 0 0 auto !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0 !important;
          min-width: auto !important;
          min-height: auto !important;
          width: auto !important;
          height: auto !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          outline: none !important;
          background: transparent !important;
          color: rgba(255,255,255,.38) !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: .08em !important;
          text-transform: uppercase !important;
          cursor: pointer !important;
          box-shadow: none !important;
          transform: none !important;
        }

        .ito-tea-builder .ito-rice-step-number,
        .ito-rice-builder-active .ito-rice-step-number,
        .ito-stone-builder-active .ito-rice-step-number {
          display: none !important;
        }

        .ito-tea-builder .ito-rice-step-label,
        .ito-rice-builder-active .ito-rice-step-label,
        .ito-stone-builder-active .ito-rice-step-label {
          display: inline !important;
          color: inherit !important;
        }

        .ito-tea-builder .ito-rice-step.active,
        .ito-rice-builder-active .ito-rice-step.active,
        .ito-stone-builder-active .ito-rice-step.active {
          color: var(--rb-text) !important;
        }

        .ito-tea-builder .ito-rice-step.completed,
        .ito-rice-builder-active .ito-rice-step.completed,
        .ito-stone-builder-active .ito-rice-step.completed {
          color: var(--rb-accent) !important;
        }

        /* =========================
           SCROLLABLE CONTENT
           ========================= */
        .ito-tea-builder > .space-y-6,
        .ito-rice-builder-active > .space-y-6,
        .ito-stone-builder-active > .space-y-6 {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          padding: 30px !important;
          scrollbar-width: thin !important;
          scrollbar-color: var(--rb-border) transparent !important;
        }

        .ito-tea-builder > .space-y-6::-webkit-scrollbar,
        .ito-rice-builder-active > .space-y-6::-webkit-scrollbar,
        .ito-stone-builder-active > .space-y-6::-webkit-scrollbar {
          width: 7px !important;
        }

        .ito-tea-builder > .space-y-6::-webkit-scrollbar-track,
        .ito-rice-builder-active > .space-y-6::-webkit-scrollbar-track,
        .ito-stone-builder-active > .space-y-6::-webkit-scrollbar-track {
          background: transparent !important;
        }

        .ito-tea-builder > .space-y-6::-webkit-scrollbar-thumb,
        .ito-rice-builder-active > .space-y-6::-webkit-scrollbar-thumb,
        .ito-stone-builder-active > .space-y-6::-webkit-scrollbar-thumb {
          background: var(--rb-border) !important;
          border-radius: 999px !important;
        }

        /* =========================
           STEP HEADING
           ========================= */
        .ito-tea-builder > .space-y-6 > .text-center,
        .ito-rice-builder-active > .space-y-6 > .text-center,
        .ito-stone-builder-active > .space-y-6 > .text-center {
          margin-bottom: 24px !important;
          text-align: left !important;
        }

        .ito-tea-builder > .space-y-6 > .text-center > div:first-child,
        .ito-rice-builder-active > .space-y-6 > .text-center > div:first-child,
        .ito-stone-builder-active > .space-y-6 > .text-center > div:first-child {
          width: auto !important;
          height: auto !important;
          margin: 0 0 8px !important;
          display: block !important;
          border-radius: 0 !important;
          background: transparent !important;
        }

        .ito-tea-builder > .space-y-6 > .text-center > div:first-child svg,
        .ito-rice-builder-active > .space-y-6 > .text-center > div:first-child svg,
        .ito-stone-builder-active > .space-y-6 > .text-center > div:first-child svg {
          display: none !important;
        }

        .ito-tea-builder > .space-y-6 h4,
        .ito-rice-builder-active > .space-y-6 h4,
        .ito-stone-builder-active > .space-y-6 h4 {
          margin: 0 0 8px !important;
          color: var(--rb-text) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: clamp(24px, 3vw, 34px) !important;
          line-height: 1.15 !important;
          font-weight: 500 !important;
        }

        .ito-tea-builder > .space-y-6 h4 + p,
        .ito-rice-builder-active > .space-y-6 h4 + p,
        .ito-stone-builder-active > .space-y-6 h4 + p {
          max-width: 680px !important;
          margin: 0 !important;
          color: var(--rb-muted) !important;
          font-size: 14px !important;
          line-height: 1.65 !important;
        }

        /* =========================
           OPTION CARDS
           ========================= */
        .ito-tea-builder .grid,
        .ito-rice-builder-active .grid,
        .ito-stone-builder-active .grid {
          gap: 12px !important;
        }

        .ito-tea-builder button[class*="border-2"],
        .ito-rice-builder-active button[class*="border-2"],
        .ito-stone-builder-active button[class*="border-2"] {
          position: relative !important;
          min-height: 94px !important;
          padding: 17px !important;
          border: 1px solid color-mix(in srgb, var(--rb-text) 12%, transparent) !important;
          border-radius: 15px !important;
          background: rgba(255,255,255,.035) !important;
          color: var(--rb-text) !important;
          text-align: left !important;
          box-shadow: none !important;
          transition: border-color .2s ease, background .2s ease, transform .2s ease !important;
        }

        .ito-tea-builder button[class*="border-2"]:hover,
        .ito-rice-builder-active button[class*="border-2"]:hover,
        .ito-stone-builder-active button[class*="border-2"]:hover {
          transform: translateY(-1px) !important;
          border-color: var(--rb-accent) !important;
          background: rgba(255,255,255,.06) !important;
        }

        .ito-tea-builder button[class*="border-2"].border-blue-600,
        .ito-rice-builder-active button[class*="border-2"].border-blue-600,
        .ito-stone-builder-active button[class*="border-2"].border-blue-600 {
          border-color: var(--rb-accent) !important;
          background: color-mix(in srgb, var(--rb-accent) 14%, transparent) !important;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rb-accent) 18%, transparent) !important;
        }

        .ito-tea-builder button[class*="border-2"] .bg-blue-100,
        .ito-rice-builder-active button[class*="border-2"] .bg-blue-100,
        .ito-stone-builder-active button[class*="border-2"] .bg-blue-100 {
          background: color-mix(in srgb, var(--rb-accent) 13%, transparent) !important;
        }

        .ito-tea-builder button[class*="border-2"] .text-blue-600,
        .ito-rice-builder-active button[class*="border-2"] .text-blue-600,
        .ito-stone-builder-active button[class*="border-2"] .text-blue-600 {
          color: var(--rb-accent) !important;
        }

        .ito-tea-builder button[class*="border-2"] .text-sm,
        .ito-rice-builder-active button[class*="border-2"] .text-sm,
        .ito-stone-builder-active button[class*="border-2"] .text-sm {
          color: var(--rb-text) !important;
        }

        .ito-tea-builder button[class*="border-2"] p,
        .ito-rice-builder-active button[class*="border-2"] p,
        .ito-stone-builder-active button[class*="border-2"] p {
          color: var(--rb-muted) !important;
        }

        /* =========================
           LABELS / FORM CONTROLS
           ========================= */
        .ito-tea-builder label,
        .ito-rice-builder-active label,
        .ito-stone-builder-active label {
          color: var(--rb-muted) !important;
        }

        .ito-tea-builder select,
        .ito-tea-builder input[type="text"],
        .ito-tea-builder input[type="date"],
        .ito-tea-builder input[type="number"],
        .ito-rice-builder-active select,
        .ito-rice-builder-active input[type="text"],
        .ito-rice-builder-active input[type="date"],
        .ito-rice-builder-active input[type="number"],
        .ito-stone-builder-active select,
        .ito-stone-builder-active input[type="text"],
        .ito-stone-builder-active input[type="date"],
        .ito-stone-builder-active input[type="number"] {
          width: 100% !important;
          border: 1px solid color-mix(in srgb, var(--rb-text) 14%, transparent) !important;
          background: rgba(255,255,255,.045) !important;
          color: var(--rb-text) !important;
          border-radius: 10px !important;
          outline: none !important;
        }

        .ito-tea-builder select:focus,
        .ito-tea-builder input:focus,
        .ito-rice-builder-active select:focus,
        .ito-rice-builder-active input:focus,
        .ito-stone-builder-active select:focus,
        .ito-stone-builder-active input:focus {
          border-color: var(--rb-accent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--rb-accent) 15%, transparent) !important;
        }

        .ito-tea-builder input::placeholder,
        .ito-rice-builder-active input::placeholder,
        .ito-stone-builder-active input::placeholder {
          color: color-mix(in srgb, var(--rb-text) 46%, transparent) !important;
        }

        .ito-tea-builder option,
        .ito-rice-builder-active option,
        .ito-stone-builder-active option {
          background: var(--rb-panel) !important;
          color: var(--rb-text) !important;
        }

        /* Informational panels and validation states */
        .ito-tea-builder .bg-blue-50,
        .ito-rice-builder-active .bg-blue-50,
        .ito-stone-builder-active .bg-blue-50,
        .ito-tea-builder .bg-gray-50,
        .ito-rice-builder-active .bg-gray-50,
        .ito-stone-builder-active .bg-gray-50 {
          background: rgba(255,255,255,.045) !important;
          border-color: color-mix(in srgb, var(--rb-accent) 22%, transparent) !important;
          color: var(--rb-text) !important;
        }

        .ito-tea-builder .text-emerald-600,
        .ito-rice-builder-active .text-emerald-600,
        .ito-stone-builder-active .text-emerald-600 {
          color: var(--rb-success) !important;
        }

        .ito-tea-builder .text-red-600,
        .ito-rice-builder-active .text-red-600,
        .ito-stone-builder-active .text-red-600 {
          color: var(--rb-danger) !important;
        }

        /* =========================
           FOOTER / NAVIGATION
           ========================= */
        .ito-tea-builder > .space-y-6 > div:last-child,
        .ito-rice-builder-active > .space-y-6 > div:last-child,
        .ito-stone-builder-active > .space-y-6 > div:last-child {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 14px !important;
          margin-top: 26px !important;
          padding-top: 18px !important;
          border-top: 1px solid color-mix(in srgb, var(--rb-text) 10%, transparent) !important;
        }

        .ito-tea-builder > .space-y-6 > div:last-child button,
        .ito-rice-builder-active > .space-y-6 > div:last-child button,
        .ito-stone-builder-active > .space-y-6 > div:last-child button {
          min-height: 44px !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          transition: all .2s ease !important;
        }

        .ito-tea-builder > .space-y-6 > div:last-child button.border-gray-300,
        .ito-rice-builder-active > .space-y-6 > div:last-child button.border-gray-300,
        .ito-stone-builder-active > .space-y-6 > div:last-child button.border-gray-300 {
          border-color: color-mix(in srgb, var(--rb-text) 14%, transparent) !important;
          background: rgba(255,255,255,.05) !important;
          color: var(--rb-text) !important;
        }

        .ito-tea-builder > .space-y-6 > div:last-child button.border-gray-300:hover:not(:disabled),
        .ito-rice-builder-active > .space-y-6 > div:last-child button.border-gray-300:hover:not(:disabled),
        .ito-stone-builder-active > .space-y-6 > div:last-child button.border-gray-300:hover:not(:disabled) {
          border-color: var(--rb-accent) !important;
          background: rgba(255,255,255,.08) !important;
        }

        .ito-tea-builder > .space-y-6 > div:last-child button.bg-blue-600,
        .ito-rice-builder-active > .space-y-6 > div:last-child button.bg-blue-600,
        .ito-stone-builder-active > .space-y-6 > div:last-child button.bg-blue-600,
        .ito-tea-builder > .space-y-6 > div:last-child button.bg-emerald-600,
        .ito-rice-builder-active > .space-y-6 > div:last-child button.bg-emerald-600,
        .ito-stone-builder-active > .space-y-6 > div:last-child button.bg-emerald-600 {
          border: 1px solid var(--rb-accent) !important;
          background: var(--rb-accent) !important;
          color: var(--rb-deep) !important;
        }

        .ito-tea-builder > .space-y-6 > div:last-child button.bg-blue-600:hover:not(:disabled),
        .ito-rice-builder-active > .space-y-6 > div:last-child button.bg-blue-600:hover:not(:disabled),
        .ito-stone-builder-active > .space-y-6 > div:last-child button.bg-blue-600:hover:not(:disabled),
        .ito-tea-builder > .space-y-6 > div:last-child button.bg-emerald-600:hover:not(:disabled),
        .ito-rice-builder-active > .space-y-6 > div:last-child button.bg-emerald-600:hover:not(:disabled),
        .ito-stone-builder-active > .space-y-6 > div:last-child button.bg-emerald-600:hover:not(:disabled) {
          background: var(--rb-accent-soft) !important;
          color: var(--rb-deep) !important;
          transform: translateY(-1px) !important;
        }

        /* Disabled controls remain readable. */
        .ito-tea-builder button:disabled,
        .ito-rice-builder-active button:disabled,
        .ito-stone-builder-active button:disabled {
          opacity: .45 !important;
        }

        /* =========================
           MOBILE
           ========================= */
        @media (max-width: 700px) {
          .ito-tea-builder,
          .ito-rice-builder-active,
          .ito-stone-builder-active {
            width: 100% !important;
            max-height: 94vh !important;
            border-radius: 22px !important;
          }

          .ito-tea-builder .ito-rice-header,
          .ito-rice-builder-active .ito-rice-header,
          .ito-stone-builder-active .ito-rice-header {
            padding: 20px 18px 16px !important;
          }

          .ito-tea-builder > .space-y-6,
          .ito-rice-builder-active > .space-y-6,
          .ito-stone-builder-active > .space-y-6 {
            padding: 22px 18px !important;
          }

          .ito-tea-builder .ito-rice-steps,
          .ito-rice-builder-active .ito-rice-steps,
          .ito-stone-builder-active .ito-rice-steps {
            gap: 14px !important;
          }

          .ito-tea-builder .grid,
          .ito-rice-builder-active .grid,
          .ito-stone-builder-active .grid {
            grid-template-columns: 1fr !important;
          }

          .ito-tea-builder > .space-y-6 > div:last-child,
          .ito-rice-builder-active > .space-y-6 > div:last-child,
          .ito-stone-builder-active > .space-y-6 > div:last-child {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .ito-tea-builder > .space-y-6 > div:last-child button,
          .ito-rice-builder-active > .space-y-6 > div:last-child button,
          .ito-stone-builder-active > .space-y-6 > div:last-child button {
            width: 100% !important;
          }
        }
      `}</style>

      <div className="ito-rice-header">
        <div className="ito-rice-header-top">
          <div>
            <span className="ito-rice-kicker">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <h3>Build Your {division} Requirement</h3>
          </div>
        </div>

        <div className="ito-rice-progress">
          <div className="ito-rice-progress-meta">
            <span>{currentStep.label}</span>
            <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
          </div>

          <div className="ito-rice-progress-track">
            <motion.div
              className="ito-rice-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="ito-rice-steps" role="tablist" aria-label="Requirement steps">
            {steps.map((step, idx) => (
              <button
                key={step.key}
                type="button"
                role="tab"
                aria-selected={idx === currentStepIndex}
                aria-label={`Step ${idx + 1}: ${step.label}`}
                onClick={() => {
                  if (destStepIdx !== -1 && idx > destStepIdx && !isDestinationStepValid) {
                    setCurrentStepIndex(destStepIdx);
                    return;
                  }
                  if (budgetStepIdx !== -1 && idx > budgetStepIdx && !isBudgetStepValid) {
                    setCurrentStepIndex(budgetStepIdx);
                    return;
                  }
                  if (idx <= currentStepIndex) setCurrentStepIndex(idx);
                }}
                className={`ito-rice-step ${idx === currentStepIndex ? "active" : ""} ${idx < currentStepIndex ? "completed" : ""}`}
              >
                <span className="ito-rice-step-number">
                  {idx < currentStepIndex &&
                  (idx !== destStepIdx || isDestinationStepValid) ? (
                    <FiCheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span className="ito-rice-step-label">{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        key={currentStep.key}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <currentStep.icon className="w-7 h-7 text-blue-600" />
          </div>
          <h4 className="text-lg font-medium text-black">{currentStep.label}</h4>
          <p className="text-sm text-gray-600 mt-1">
            {config?.stepDescriptions?.[currentStep.key] || `Select your ${currentStep.label.toLowerCase()}`}
          </p>
        </div>

        {currentStep.key === 'destination' ? renderDestinationInput() :
         currentStep.key === 'budget' ? renderBudgetOptions() :
         currentStep.key === 'timeline' ? renderTimelineOptions() :
         renderStepContent()}

        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            onClick={goBack}
            disabled={isFirstStep || isSubmitting}
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
          >
            Back
          </button>

          {!isLastStep ? (
            <button
              onClick={goNext}
              disabled={!isCurrentStepValid() || isSubmitting}
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              Next Step <FiArrowRight />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              Get Current Price & Availability <FiArrowRight />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}