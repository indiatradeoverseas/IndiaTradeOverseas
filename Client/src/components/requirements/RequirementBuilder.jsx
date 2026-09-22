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
    { key: 'budget', label: 'Estimated Budget / Valuation', icon: FiDollarSign, event: 'select_budget' },
    { key: 'timeline', label: 'Requirement Date / Lead Urgency', icon: FiCalendar, event: 'select_timeline' },
  ],
  RICE: [
    { key: 'variety', label: 'Rice Variety / Grade', icon: FiTag, event: 'select_product' },
    { key: 'quantity', label: 'Quantity Required', icon: FiTruck, event: 'select_quantity' },
    { key: 'packaging', label: 'Packaging', icon: FiPackage, event: 'select_packaging' },
    { key: 'tradeType', label: 'Domestic / Export', icon: FiGlobe, event: 'select_trade_type' },
    { key: 'destination', label: 'Discharge Port / City & PIN', icon: FiMapPin, event: 'enter_destination' },
    { key: 'budget', label: 'Estimated Budget / Valuation', icon: FiDollarSign, event: 'select_budget' },
    { key: 'timeline', label: 'Requirement Date / Lead Urgency', icon: FiCalendar, event: 'select_timeline' },
  ],
  TEA: [
    { key: 'teaType', label: 'Tea Type / Grade', icon: FiTag, event: 'select_product' },
    { key: 'quantity', label: 'Quantity Required', icon: FiTruck, event: 'select_quantity' },
    { key: 'packaging', label: 'Packaging', icon: FiPackage, event: 'select_packaging' },
    { key: 'tradeType', label: 'Domestic / Export', icon: FiGlobe, event: 'select_trade_type' },
    { key: 'privateLabel', label: 'Private Label', icon: FiTag, event: 'select_private_label' },
    { key: 'destination', label: 'Discharge Port / City & PIN', icon: FiMapPin, event: 'enter_destination' },
    { key: 'budget', label: 'Estimated Budget / Valuation', icon: FiDollarSign, event: 'select_budget' },
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

export function RequirementBuilder({ division, config, onComplete, onStepChange }) {
  const normalizedDivision = (division || 'STONE').toUpperCase();
  const steps = STEP_CONFIG[normalizedDivision] || STEP_CONFIG.STONE;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [requirement, setRequirement] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [customPort, setCustomPort] = useState('');
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

    const locationOptions = Array.from(new Set([...destData.map(d => d.location).filter(Boolean), ...DISCHARGE_PORTS]));
    const selectedLocData = destData.find(d => d.location === currentLoc);
    let priceInfo = null;
    if (selectedLocData && selectedMaterial) {
      priceInfo = selectedLocData.rates?.[selectedMaterial];
    }

    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Discharge Port / Delivery City *
          </label>
          <select
            value={DISCHARGE_PORTS.includes(currentLoc) ? currentLoc : (currentLoc ? 'Custom Discharge Port / City' : '')}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'Custom Discharge Port / City') {
                setCustomPort('');
                handleOptionSelect('destination', { ...requirement.destination, location: customPort }, { location: customPort });
                handleOptionSelect('dischargePort', customPort);
              } else {
                handleOptionSelect('destination', { ...requirement.destination, location: val }, { location: val });
                handleOptionSelect('dischargePort', val);
              }
            }}
            className="w-full px-4 py-3.5 rounded-lg border border-gray-300 bg-white text-black font-medium text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="">Select Discharge Port / City</option>
            {locationOptions.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
          </select>

          {(!DISCHARGE_PORTS.includes(currentLoc) || currentLoc === 'Custom Discharge Port / City') && (
            <input
              type="text"
              placeholder="Enter Custom Discharge Port or City Name *"
              value={customPort || (DISCHARGE_PORTS.includes(currentLoc) ? '' : currentLoc)}
              onChange={(e) => {
                const val = e.target.value;
                setCustomPort(val);
                handleOptionSelect('destination', { ...requirement.destination, location: val }, { location: val });
                handleOptionSelect('dischargePort', val);
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-black text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Destination PIN Code (Minimum 6 Digits Required) *
          </label>
          <input
            type="text"
            placeholder="Enter 6-digit PIN Code (e.g., 700001) *"
            value={currentPin}
            onChange={(e) => {
              const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
              handleOptionSelect('destination', { ...requirement.destination, pin }, { pin });
              handleOptionSelect('pin', pin);
            }}
            maxLength={6}
            className={`w-full px-4 py-3.5 rounded-lg border font-mono text-base transition-colors ${
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
              <span>PIN Code must be minimum 6 digits (currently {currentPin.length}/6 digits).</span>
            </div>
          )}

          {isPinValid && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <FiCheckCircle size={14} />
              <span>6-Digit PIN Code Verified for Logistics Audit</span>
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
    <div className="w-full max-w-4xl mx-auto bg-white">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-black">
            Build Your {division} Requirement
          </h3>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
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
              Next Step
              <FiArrowRight />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              Get Current Price & Availability
              <FiArrowRight />
            </button>
          )}
        </div>
      </motion.div>

      <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label="Requirement steps">
        {steps.map((step, idx) => (
          <button
            key={step.key}
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
              if (idx <= currentStepIndex) {
                setCurrentStepIndex(idx);
              }
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              idx < currentStepIndex
                ? 'bg-blue-600 text-white cursor-pointer'
                : idx === currentStepIndex
                ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {idx < currentStepIndex && (idx !== destStepIdx || isDestinationStepValid) ? (
              <FiCheckCircle className="w-5 h-5" />
            ) : (
              <span className="font-mono text-sm">{idx + 1}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}