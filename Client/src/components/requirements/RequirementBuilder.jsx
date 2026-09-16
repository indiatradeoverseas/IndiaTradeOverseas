import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiArrowRight, FiCheckCircle, FiTruck, FiMapPin, FiCalendar, FiPackage, FiGlobe, FiTag, FiClock, FiShield
} from 'react-icons/fi';
import { pushDataLayerEvent } from '../../utils/analytics';

const STEP_CONFIG = {
  STONE: [
    { key: 'material', label: 'Material', icon: FiPackage, event: 'select_product' },
    { key: 'quantity', label: 'Quantity', icon: FiTruck, event: 'select_quantity' },
    { key: 'destination', label: 'Destination', icon: FiMapPin, event: 'enter_destination' },
    { key: 'timeline', label: 'Timeline', icon: FiCalendar, event: 'select_timeline' },
    { key: 'eligibility', label: 'Eligibility', icon: FiShield, event: 'eligibility_checked' },
  ],
  RICE: [
    { key: 'variety', label: 'Rice Variety / Grade', icon: FiTag, event: 'select_product' },
    { key: 'quantity', label: 'Quantity', icon: FiTruck, event: 'select_quantity' },
    { key: 'packaging', label: 'Packaging', icon: FiPackage, event: 'select_packaging' },
    { key: 'tradeType', label: 'Domestic / Export', icon: FiGlobe, event: 'select_trade_type' },
    { key: 'destination', label: 'Destination / Port', icon: FiMapPin, event: 'enter_destination' },
    { key: 'timeline', label: 'Timeline', icon: FiCalendar, event: 'select_timeline' },
    { key: 'eligibility', label: 'Eligibility', icon: FiShield, event: 'eligibility_checked' },
  ],
  TEA: [
    { key: 'teaType', label: 'Tea Type / Grade', icon: FiTag, event: 'select_product' },
    { key: 'quantity', label: 'Quantity', icon: FiTruck, event: 'select_quantity' },
    { key: 'packaging', label: 'Packaging', icon: FiPackage, event: 'select_packaging' },
    { key: 'tradeType', label: 'Domestic / Export', icon: FiGlobe, event: 'select_trade_type' },
    { key: 'privateLabel', label: 'Private Label', icon: FiShield, event: 'select_private_label' },
    { key: 'destination', label: 'Destination', icon: FiMapPin, event: 'enter_destination' },
    { key: 'timeline', label: 'Timeline', icon: FiCalendar, event: 'select_timeline' },
    { key: 'eligibility', label: 'Eligibility', icon: FiShield, event: 'eligibility_checked' },
  ],
};

export function RequirementBuilder({ division, config, onComplete, onStepChange }) {
  const normalizedDivision = (division || 'STONE').toUpperCase();
  const steps = STEP_CONFIG[normalizedDivision] || STEP_CONFIG.STONE;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [requirement, setRequirement] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const isEligibilityStep = currentStep?.key === 'eligibility';

  // Safety: if no steps or invalid index, reset to first step
  useEffect(() => {
    if (!steps.length || currentStepIndex >= steps.length) setCurrentStepIndex(0);
  }, [steps.length, currentStepIndex]);

  useEffect(() => {
    pushDataLayerEvent('start_requirement', { division });
  }, [division]);

  const handleOptionSelect = useCallback((key, value, meta = {}) => {
    setRequirement(prev => ({ ...prev, [key]: value }));
    if (currentStep?.event) pushDataLayerEvent(currentStep.event, { division, [key]: value, ...meta });

    // advance only when the *step's own key* is set (not on PIN, not on secondary fields)
    const primaryKey = currentStep?.key;
    const shouldAdvance = key === primaryKey && key !== 'pin';
    if (shouldAdvance && !isLastStep) {
      setTimeout(() => setCurrentStepIndex(prev => prev + 1), 300);
    } else if (isEligibilityStep && key === primaryKey) {
      checkEligibility();
    }
    onStepChange?.(currentStepIndex, key, value);
  }, [currentStep, isLastStep, isEligibilityStep, division, onStepChange]);

  const checkEligibility = () => {
    let eligibility = 'SUPPORTED';
    let reason = '';

    if (division === 'STONE') {
      const pin = requirement.destination?.pin || requirement.pin;
      if (pin) {
        const n = parseInt(pin.slice(0, 2), 10);
        const ok = [11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84];
        if (!ok.includes(n)) { eligibility = 'MANUAL_REVIEW'; reason = 'PIN requires manual logistics review'; }
      }
    } else if (['RICE','TEA'].includes(division)) {
      if (requirement.tradeType === 'EXPORT' && !requirement.destination?.port) {
        eligibility = 'MANUAL_REVIEW';
        reason = 'Export requires port specification';
      }
    }

    setEligibilityResult({ eligibility, reason });
    setRequirement(p => ({ ...p, eligibility }));
    pushDataLayerEvent('eligibility_checked', { division, eligibility, reason });
    setTimeout(() => setShowSoftGate(true), 500);
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const renderStepContent = () => {
    if (!currentStep) return <div className="text-center text-neutral-500">Loading...</div>;
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
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                : 'border-neutral-200 hover:border-primary/50 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: options.indexOf(opt) * 0.05 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <currentStep.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">{opt.label}</span>
            </div>
            {opt.description && <p className="text-sm text-neutral-600 dark:text-neutral-400">{opt.description}</p>}
            {requirement[currentStep.key] === opt.value && (
              <FiCheckCircle className="absolute top-3 right-3 w-6 h-6 text-primary" />
            )}
          </motion.button>
        ))}
      </div>
    );
  };

  const renderDestinationInput = () => {
    const destData = config?.destinationData || [];
    const selectedMaterial = requirement.material || requirement.variety || requirement.teaType || '';
    const selectedLocation = requirement.destination?.location || '';
    const locationOptions = destData.map(d => d.location).filter(Boolean);
    const selectedLocData = destData.find(d => d.location === selectedLocation);
    // Determine price for selected material at selected location
    let priceInfo = null;
    if (selectedLocData && selectedMaterial) {
      // rates may be keyed by material code
      priceInfo = selectedLocData.rates?.[selectedMaterial];
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={selectedLocation}
            onChange={(e) => handleOptionSelect('destination', { ...requirement.destination, location: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-teal-200 bg-teal-50 text-teal-900 placeholder-teal-500 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          >
            <option value="">Select location</option>
            {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <input
            type="text"
            placeholder="PIN Code"
            value={requirement.destination?.pin || requirement.pin || ''}
            onChange={(e) => {
              const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
              handleOptionSelect('destination', { ...requirement.destination, pin }, { pin });
              handleOptionSelect('pin', pin);
            }}
            maxLength={6}
            className="w-full px-4 py-3 rounded-lg border border-teal-200 bg-teal-50 text-teal-900 placeholder-teal-500 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          />
        </div>
        {priceInfo !== null && priceInfo !== undefined && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm">
            <strong>Estimated Rate (INR/MT):</strong> {typeof priceInfo === 'object' ? (priceInfo.adv100 ?? priceInfo.adv50 ?? priceInfo.cod ?? Object.values(priceInfo)[0]) : priceInfo}
          </div>
        )}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Choose delivery location and PIN for logistics check</p>
      </div>
    );
  };

  const renderTimelineOptions = () => {
    const options = config?.options?.timeline || [
      { value: 'IMMEDIATE', label: 'Immediate', description: 'ASAP - within 24 hours' },
      { value: 'WITHIN_3_DAYS', label: 'Within 3 Days', description: 'Quick delivery needed' },
      { value: 'WITHIN_7_DAYS', label: 'Within 7 Days', description: 'Standard timeframe' },
      { value: 'WITHIN_15_DAYS', label: 'Within 15 Days', description: 'Planned procurement' },
      { value: 'FUTURE', label: 'Future / Planning', description: 'Long-term requirement' },
    ];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((opt) => (
          <motion.button
            key={opt.value}
            onClick={() => handleOptionSelect('timeline', opt.value)}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              requirement.timeline === opt.value
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                : 'border-neutral-200 hover:border-primary/50 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: options.indexOf(opt) * 0.05 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FiClock className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">{opt.label}</span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{opt.description}</p>
            {requirement.timeline === opt.value && <FiCheckCircle className="absolute top-3 right-3 w-6 h-6 text-primary" />}
          </motion.button>
        ))}
      </div>
    );
  };

  const renderEligibilityResult = () => {
    if (!eligibilityResult) return null;

    const colors = {
      SUPPORTED: 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
      MANUAL_REVIEW: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
      UNSUPPORTED: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
    };

    const icons = {
      SUPPORTED: FiCheckCircle,
      MANUAL_REVIEW: FiClock,
      UNSUPPORTED: FiShield,
    };

    const Icon = icons[eligibilityResult.eligibility] || FiCheckCircle;

    return (
      <motion.div
        className={`p-6 rounded-xl border-2 ${colors[eligibilityResult.eligibility]}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-current/10 flex items-center justify-center">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-lg font-semibold capitalize">{eligibilityResult.eligibility.replace('_', ' ')}</h4>
            {eligibilityResult.reason && <p className="text-sm opacity-80">{eligibilityResult.reason}</p>}
          </div>
        </div>
        {eligibilityResult.eligibility !== 'UNSUPPORTED' && (
          <p className="mt-4 text-sm opacity-70">
            {eligibilityResult.eligibility === 'SUPPORTED'
              ? 'Great! We can service this requirement. Enter your contact details to get current pricing.'
              : 'This requires manual review by our team. We\'ll contact you within 24 hours.'}
          </p>
        )}
      </motion.div>
    );
  };

  if (showSoftGate) {
    return onComplete?.(requirement);
  }

  // Safety: if no currentStep (shouldn't happen with the useEffect guard, but just in case)
  if (!currentStep) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center py-12">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading requirement builder...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Build Your {division} Requirement
          </h3>
          <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
        </div>
        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
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
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <currentStep.icon className="w-7 h-7 text-primary" />
          </div>
          <h4 className="text-lg font-medium text-neutral-900 dark:text-white">{currentStep.label}</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {config?.stepDescriptions?.[currentStep.key] || `Select your ${currentStep.label.toLowerCase()}`}
          </p>
        </div>

        {currentStep.key === 'destination' ? renderDestinationInput() :
         currentStep.key === 'timeline' ? renderTimelineOptions() :
         currentStep.key === 'eligibility' ? renderEligibilityResult() :
         renderStepContent()}

        <div className="flex justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={goBack}
            disabled={isFirstStep || isSubmitting}
            className="px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Back
          </button>
          {isEligibilityStep && eligibilityResult && eligibilityResult.eligibility !== 'UNSUPPORTED' && (
            <button
              onClick={() => setShowSoftGate(true)}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
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
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              idx < currentStepIndex
                ? 'bg-primary text-white'
                : idx === currentStepIndex
                ? 'bg-primary/10 text-primary ring-2 ring-primary/20'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
            }`}
          >
            {idx < currentStepIndex ? <FiCheckCircle className="w-5 h-5" /> : <span className="font-mono text-sm">{idx + 1}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}