import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiArrowRight, FiCheckCircle, FiTruck, FiMapPin, FiCalendar, FiPackage, FiGlobe, FiTag, FiClock
} from 'react-icons/fi';
import { pushDataLayerEvent } from '../../utils/analytics';

const STEP_CONFIG = {
  STONE: [
    { key: 'material', label: 'Material', icon: FiPackage, event: 'select_product' },
    { key: 'quantity', label: 'Quantity', icon: FiTruck, event: 'select_quantity' },
    { key: 'destination', label: 'Destination', icon: FiMapPin, event: 'enter_destination' },
    { key: 'timeline', label: 'Timeline', icon: FiCalendar, event: 'select_timeline' },
  ],
  RICE: [
    { key: 'variety', label: 'Rice Variety / Grade', icon: FiTag, event: 'select_product' },
    { key: 'quantity', label: 'Quantity', icon: FiTruck, event: 'select_quantity' },
    { key: 'packaging', label: 'Packaging', icon: FiPackage, event: 'select_packaging' },
    { key: 'tradeType', label: 'Domestic / Export', icon: FiGlobe, event: 'select_trade_type' },
    { key: 'destination', label: 'Destination / Port', icon: FiMapPin, event: 'enter_destination' },
    { key: 'timeline', label: 'Timeline', icon: FiCalendar, event: 'select_timeline' },
  ],
  TEA: [
    { key: 'teaType', label: 'Tea Type / Grade', icon: FiTag, event: 'select_product' },
    { key: 'quantity', label: 'Quantity', icon: FiTruck, event: 'select_quantity' },
    { key: 'packaging', label: 'Packaging', icon: FiPackage, event: 'select_packaging' },
    { key: 'tradeType', label: 'Domestic / Export', icon: FiGlobe, event: 'select_trade_type' },
    { key: 'privateLabel', label: 'Private Label', icon: FiTag, event: 'select_private_label' },
    { key: 'destination', label: 'Destination', icon: FiMapPin, event: 'enter_destination' },
    { key: 'timeline', label: 'Timeline', icon: FiCalendar, event: 'select_timeline' },
  ],
};

export function RequirementBuilder({ division, config, onComplete, onStepChange }) {
  const normalizedDivision = (division || 'STONE').toUpperCase();
  const steps = STEP_CONFIG[normalizedDivision] || STEP_CONFIG.STONE;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [requirement, setRequirement] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSoftGate, setShowSoftGate] = useState(false);

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

  const handleOptionSelect = useCallback((key, value, meta = {}) => {
    setRequirement(prev => ({ ...prev, [key]: value }));
    if (currentStep?.event) pushDataLayerEvent(currentStep.event, { division, [key]: value, ...meta });

    const primaryKey = currentStep?.key;
    const shouldAdvance = key === primaryKey && key !== 'pin';
    if (shouldAdvance && !isLastStep) {
      setTimeout(() => setCurrentStepIndex(prev => prev + 1), 300);
    }
    onStepChange?.(currentStepIndex, key, value);
  }, [currentStep, isLastStep, division, onStepChange]);

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
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
    const selectedLocation = requirement.destination?.location || '';
    const locationOptions = destData.map(d => d.location).filter(Boolean);
    const selectedLocData = destData.find(d => d.location === selectedLocation);
    let priceInfo = null;
    if (selectedLocData && selectedMaterial) {
      priceInfo = selectedLocData.rates?.[selectedMaterial];
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={selectedLocation}
            onChange={(e) => handleOptionSelect('destination', { ...requirement.destination, location: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="">Select location</option>
            {locationOptions.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
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
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>
        {priceInfo !== null && priceInfo !== undefined && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
            <strong>Estimated Rate (INR/MT):</strong> {typeof priceInfo === 'object' ? (priceInfo.adv100 ?? priceInfo.adv50 ?? priceInfo.cod ?? Object.values(priceInfo)[0]) : priceInfo}
          </div>
        )}
        <p className="text-sm text-gray-600">Choose delivery location and PIN for logistics check</p>
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
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-300 hover:border-blue-600 hover:bg-gray-50'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: options.indexOf(opt) * 0.05 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FiClock className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-black">{opt.label}</span>
            </div>
            <p className="text-sm text-gray-600">{opt.description}</p>
            {requirement.timeline === opt.value && <FiCheckCircle className="absolute top-3 right-3 w-6 h-6 text-blue-600" />}
          </motion.button>
        ))}
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
          {isLastStep && (
            <button
              onClick={() => setShowSoftGate(true)}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                ? 'bg-blue-600 text-white'
                : idx === currentStepIndex
                ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {idx < currentStepIndex ? <FiCheckCircle className="w-5 h-5" /> : <span className="font-mono text-sm">{idx + 1}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}