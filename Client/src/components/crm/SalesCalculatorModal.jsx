import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiPercent, FiCopy, FiCheck, FiDollarSign,
  FiTrendingUp, FiPieChart, FiRefreshCw, FiArrowRight
} from 'react-icons/fi';
import { BsCalculator } from 'react-icons/bs';
import toast from 'react-hot-toast';

export default function SalesCalculatorModal({ isOpen, onClose, onApplyValue, initialValue = '' }) {
  const [activeTab, setActiveTab] = useState('STANDARD'); // 'STANDARD' | 'DEAL' | 'MARGIN' | 'COMMISSION'
  const [copied, setCopied] = useState(false);

  // --- 1. Standard Calculator State ---
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcFormula, setCalcFormula] = useState('');
  const [calcHistory, setCalcHistory] = useState([]);

  // --- 2. Sales Deal Estimator State ---
  const [quantity, setQuantity] = useState(100);
  const [unitPrice, setUnitPrice] = useState(initialValue ? Number(initialValue) || 1200 : 1200);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [freightCost, setFreightCost] = useState(0);
  const [gstPercent, setGstPercent] = useState(18); // Default 18% GST

  // --- 3. Profit Margin Calculator State ---
  const [sellingPrice, setSellingPrice] = useState(1500000);
  const [costPrice, setCostPrice] = useState(1100000);

  // --- 4. Commission Calculator State ---
  const [dealValue, setDealValue] = useState(initialValue ? Number(initialValue) || 5000000 : 5000000);
  const [commissionRate, setCommissionRate] = useState(2); // 2% commission

  // Keypress handler for Standard Calculator
  useEffect(() => {
    if (!isOpen || activeTab !== 'STANDARD') return;

    const handleKeyDown = (e) => {
      if (['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/','(',')'].includes(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculateResult();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, calcDisplay, calcFormula]);

  if (!isOpen) return null;

  // --- Standard Calculator Handlers ---
  const handleDigit = (digit) => {
    if (calcDisplay === '0' || calcDisplay === 'Error') {
      setCalcDisplay(digit);
    } else {
      setCalcDisplay(prev => prev + digit);
    }
  };

  const handleOperator = (op) => {
    setCalcFormula(calcDisplay + ' ' + op + ' ');
    setCalcDisplay('0');
  };

  const handleClear = () => {
    setCalcDisplay('0');
    setCalcFormula('');
  };

  const handleBackspace = () => {
    if (calcDisplay.length <= 1 || calcDisplay === 'Error') {
      setCalcDisplay('0');
    } else {
      setCalcDisplay(prev => prev.slice(0, -1));
    }
  };

  const calculateResult = () => {
    try {
      const fullExpression = (calcFormula + calcDisplay).replace(/×/g, '*').replace(/÷/g, '/');
      const sanitized = fullExpression.replace(/[^0-9+\-*/.()%]/g, '');
      const evalResult = new Function(`return ${sanitized}`)();
      if (isNaN(evalResult) || !isFinite(evalResult)) {
        setCalcDisplay('Error');
        return;
      }
      const formatted = Number(evalResult.toFixed(4)).toString();
      setCalcHistory(prev => [{ formula: fullExpression + ' =', result: formatted }, ...prev.slice(0, 4)]);
      setCalcDisplay(formatted);
      setCalcFormula('');
    } catch (err) {
      setCalcDisplay('Error');
    }
  };

  const handlePercent = () => {
    try {
      const val = parseFloat(calcDisplay) / 100;
      setCalcDisplay(val.toString());
    } catch (e) {
      setCalcDisplay('Error');
    }
  };

  // --- Deal Estimator Calculations ---
  const subtotal = Math.max(0, Number(quantity || 0) * Number(unitPrice || 0));
  const discountAmount = (subtotal * Number(discountPercent || 0)) / 100;
  const discountedSubtotal = subtotal - discountAmount;
  const gstAmount = ((discountedSubtotal + Number(freightCost || 0)) * Number(gstPercent || 0)) / 100;
  const grandTotal = discountedSubtotal + Number(freightCost || 0) + gstAmount;

  // --- Margin Calculations ---
  const sp = Number(sellingPrice || 0);
  const cp = Number(costPrice || 0);
  const grossProfit = sp - cp;
  const profitMargin = sp > 0 ? (grossProfit / sp) * 100 : 0;
  const markup = cp > 0 ? (grossProfit / cp) * 100 : 0;

  // --- Commission Calculations ---
  const dv = Number(dealValue || 0);
  const cr = Number(commissionRate || 0);
  const commissionEarned = (dv * cr) / 100;

  // Copy helper
  const handleCopy = (text, label = 'Value') => {
    navigator.clipboard.writeText(String(text));
    setCopied(true);
    toast.success(`${label} copied to clipboard! 📋`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToLead = (value) => {
    if (onApplyValue) {
      onApplyValue(Math.round(value));
      toast.success(`Updated lead value to ₹${Math.round(value).toLocaleString('en-IN')}`);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-xl bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 rounded-md shadow-2xl overflow-hidden text-[var(--crm-ink-soft)] font-mono flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="px-5 py-3.5 border-b border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-sunken)]/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400">
                <BsCalculator size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] font-serif">
                  Sales Commercial Calculator
                </h3>
                <span className="text-[10px] text-[var(--crm-ink-faint)] tracking-widest block">
                  CRM ESTIMATION & QUOTATION MATRIX
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-sm hover:bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg)]/80 text-[10px] font-bold uppercase tracking-wider overflow-x-auto custom-scrollbar">
            {[
              { id: 'STANDARD', label: '🧮 Standard', desc: 'Basic Calc' },
              { id: 'DEAL', label: '📊 Deal Quote', desc: 'Qty & GST' },
              { id: 'MARGIN', label: '📈 Margin & Profit', desc: 'ROI %' },
              { id: 'COMMISSION', label: '💸 Commission', desc: 'Payout %' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 flex-1 min-w-[110px] text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-teal-400 bg-[var(--crm-bg-raised)] text-teal-400 font-black'
                    : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                }`}
              >
                <div>{tab.label}</div>
                <div className="text-[8px] opacity-60 font-sans">{tab.desc}</div>
              </button>
            ))}
          </div>

          {/* Tab Contents Container */}
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
            
            {/* TAB 1: STANDARD FINANCIAL CALCULATOR */}
            {activeTab === 'STANDARD' && (
              <div className="space-y-4">
                {/* Display Screen */}
                <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 p-4 rounded text-right space-y-1 shadow-inner">
                  <div className="text-[11px] text-[var(--crm-ink-faint)] min-h-[16px] tracking-widest overflow-hidden text-ellipsis whitespace-nowrap">
                    {calcFormula || ' '}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[var(--crm-heading)] tracking-wider overflow-x-auto custom-scrollbar">
                    {calcDisplay}
                  </div>
                  {Number(calcDisplay) > 0 && !isNaN(calcDisplay) && (
                    <div className="text-[10px] text-teal-400/80 font-bold">
                      ≈ ₹{Number(calcDisplay).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {/* Quick Copy & Action Row */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="text-[10px] text-[var(--crm-ink-faint)]">
                    Keyboard inputs enabled (0-9, +, -, *, /, Enter, Esc)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(calcDisplay, 'Calculation Result')}
                      className="px-2.5 py-1 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-teal-500/30 text-[10px] font-bold rounded text-teal-400 flex items-center gap-1 cursor-pointer"
                    >
                      <FiCopy size={12} /> {copied ? 'Copied!' : 'Copy Result'}
                    </button>
                    {onApplyValue && !isNaN(calcDisplay) && Number(calcDisplay) > 0 && (
                      <button
                        onClick={() => handleApplyToLead(Number(calcDisplay))}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer"
                      >
                        <FiCheck size={12} /> Apply to Lead
                      </button>
                    )}
                  </div>
                </div>

                {/* Keypad Matrix */}
                <div className="grid grid-cols-4 gap-2 text-sm font-bold">
                  <button onClick={handleClear} className="p-3 rounded bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/60 cursor-pointer">AC</button>
                  <button onClick={handleBackspace} className="p-3 rounded bg-[var(--crm-bg)] text-teal-400 border border-teal-500/30 hover:bg-[var(--crm-bg-raised)] cursor-pointer">⌫</button>
                  <button onClick={handlePercent} className="p-3 rounded bg-[var(--crm-bg)] text-teal-400 border border-teal-500/30 hover:bg-[var(--crm-bg-raised)] cursor-pointer">%</button>
                  <button onClick={() => handleOperator('/')} className="p-3 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 cursor-pointer">÷</button>

                  <button onClick={() => handleDigit('7')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">7</button>
                  <button onClick={() => handleDigit('8')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">8</button>
                  <button onClick={() => handleDigit('9')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">9</button>
                  <button onClick={() => handleOperator('*')} className="p-3 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 cursor-pointer">×</button>

                  <button onClick={() => handleDigit('4')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">4</button>
                  <button onClick={() => handleDigit('5')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">5</button>
                  <button onClick={() => handleDigit('6')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">6</button>
                  <button onClick={() => handleOperator('-')} className="p-3 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 cursor-pointer">-</button>

                  <button onClick={() => handleDigit('1')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">1</button>
                  <button onClick={() => handleDigit('2')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">2</button>
                  <button onClick={() => handleDigit('3')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">3</button>
                  <button onClick={() => handleOperator('+')} className="p-3 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 cursor-pointer">+</button>

                  <button onClick={() => handleDigit('0')} className="p-3 col-span-2 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">0</button>
                  <button onClick={() => handleDigit('.')} className="p-3 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/15 text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] cursor-pointer">.</button>
                  <button onClick={calculateResult} className="p-3 rounded bg-teal-600 hover:bg-teal-500 text-white border border-teal-400 font-black cursor-pointer">=</button>
                </div>

                {/* History list */}
                {calcHistory.length > 0 && (
                  <div className="pt-2 border-t border-[var(--crm-ink-soft)]/10 space-y-1">
                    <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] block">Recent Calculations:</span>
                    <div className="space-y-1 max-h-[80px] overflow-y-auto text-[10px]">
                      {calcHistory.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[var(--crm-ink-soft)] font-mono">
                          <span>{item.formula}</span>
                          <span className="text-teal-400 font-bold">{item.result}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DEAL & QUOTATION ESTIMATOR */}
            {activeTab === 'DEAL' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Quantity (MT / Units)</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded text-[var(--crm-heading)] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Unit Price (₹ per unit)</label>
                    <input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded text-[var(--crm-heading)] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Discount (%)</label>
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded text-[var(--crm-heading)] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Freight / Transport Cost (₹)</label>
                    <input
                      type="number"
                      value={freightCost}
                      onChange={(e) => setFreightCost(e.target.value)}
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded text-[var(--crm-heading)] font-bold outline-none"
                    />
                  </div>
                </div>

                {/* GST Quick Select Buttons */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Applicable GST / Tax Rate</label>
                  <div className="flex gap-2">
                    {[0, 5, 12, 18, 28].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setGstPercent(rate)}
                        className={`flex-1 py-1.5 rounded border text-[11px] font-bold cursor-pointer transition ${
                          Number(gstPercent) === rate
                            ? 'bg-teal-600 text-white border-teal-400'
                            : 'bg-[var(--crm-bg)] border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] hover:border-[var(--crm-heading)]'
                        }`}
                      >
                        {rate}% GST
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deal Breakdown Card */}
                <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 p-4 rounded space-y-2 font-mono">
                  <div className="text-[10px] font-bold uppercase text-teal-400 tracking-wider border-b border-[var(--crm-ink-soft)]/15 pb-1">
                    Commercial Quote Breakdown
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-[var(--crm-ink-soft)]">
                      <span>Base Subtotal ({quantity} units @ ₹{Number(unitPrice).toLocaleString('en-IN')})</span>
                      <span className="font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-rose-400">
                        <span>Discount ({discountPercent}%)</span>
                        <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {Number(freightCost) > 0 && (
                      <div className="flex justify-between text-cyan-400">
                        <span>Freight / Transport Logistics</span>
                        <span>+ ₹{Number(freightCost).toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {gstAmount > 0 && (
                      <div className="flex justify-between text-teal-300">
                        <span>GST ({gstPercent}%)</span>
                        <span>+ ₹{Math.round(gstAmount).toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[var(--crm-ink-soft)]/20 flex justify-between items-center text-sm">
                      <span className="font-bold text-[var(--crm-heading)] uppercase">Estimated Grand Total:</span>
                      <span className="text-xl font-black text-emerald-400">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(Math.round(grandTotal), 'Grand Total Deal Value')}
                    className="flex-1 py-2 bg-[var(--crm-bg)] border border-teal-500/30 text-teal-400 font-bold rounded flex items-center justify-center gap-1 hover:bg-[var(--crm-bg-raised)] cursor-pointer"
                  >
                    <FiCopy size={13} /> Copy Total Value
                  </button>
                  {onApplyValue && (
                    <button
                      onClick={() => handleApplyToLead(grandTotal)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FiCheck size={13} /> Apply to Lead Valuation
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PROFIT & MARGIN CALCULATOR */}
            {activeTab === 'MARGIN' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Selling Price / Deal Value (₹)</label>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded text-[var(--crm-heading)] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Cost Price / Procurement Cost (₹)</label>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded text-[var(--crm-heading)] font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono text-center">
                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 rounded">
                    <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] block">Gross Profit</span>
                    <span className={`text-base font-black ${grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{Math.round(grossProfit).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 rounded">
                    <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] block">Profit Margin</span>
                    <span className={`text-base font-black ${profitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {profitMargin.toFixed(2)}%
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 rounded">
                    <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] block">Markup</span>
                    <span className={`text-base font-black ${markup >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                      {markup.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded text-[11px] text-emerald-300">
                  <strong className="block text-[10px] uppercase tracking-wider font-bold mb-0.5">Commercial Profitability Summary:</strong>
                  For a selling price of ₹{sp.toLocaleString('en-IN')} with cost of ₹{cp.toLocaleString('en-IN')}, your estimated gross profit is <strong>₹{Math.round(grossProfit).toLocaleString('en-IN')}</strong> ({profitMargin.toFixed(1)}% margin).
                </div>
              </div>
            )}

            {/* TAB 4: COMMISSION CALCULATOR */}
            {activeTab === 'COMMISSION' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Total Closed Deal Value (₹)</label>
                    <input
                      type="number"
                      value={dealValue}
                      onChange={(e) => setDealValue(e.target.value)}
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded text-[var(--crm-heading)] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded text-[var(--crm-heading)] font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Quick Commission Preset Buttons */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--crm-ink-faint)] mb-1">Quick Presets</label>
                  <div className="flex gap-2">
                    {[0.5, 1, 2, 2.5, 5].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setCommissionRate(rate)}
                        className={`flex-1 py-1.5 rounded border text-[11px] font-bold cursor-pointer transition ${
                          Number(commissionRate) === rate
                            ? 'bg-teal-600 text-white border-teal-400'
                            : 'bg-[var(--crm-bg)] border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] hover:border-[var(--crm-heading)]'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-[var(--crm-bg-sunken)] border border-teal-500/30 rounded space-y-2 font-mono">
                  <span className="text-[10px] font-bold uppercase text-teal-400 tracking-wider block">Estimated Incentive & Commission</span>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--crm-ink-soft)]">Commission Payable:</span>
                    <span className="text-2xl font-black text-teal-400">₹{Math.round(commissionEarned).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Bar */}
          <div className="px-5 py-3 border-t border-[var(--crm-ink-soft)]/15 bg-[var(--crm-bg-sunken)]/60 flex justify-between items-center text-[10px] text-[var(--crm-ink-faint)] font-mono">
            <span>India Trade Overseas CRM // Commercial Module</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-heading)] font-bold rounded uppercase cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
