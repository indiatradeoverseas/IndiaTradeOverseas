const RICE_PROCESSING_KEYS = [
  'raw',
  'steam',
  'whiteSella',
  'lemonSella',
  'goldenSella',
  'brown'
];

const RICE_PROCESSING_LABELS = {
  raw: 'Raw / White',
  steam: 'Steam',
  whiteSella: 'White / Creamy Sella',
  lemonSella: 'Lemon Sella',
  goldenSella: 'Golden Sella',
  brown: 'Brown'
};

/* Regular / Conventional - From ITO_Rice_Price_List(2).pdf */
const REGULAR_RICE_RAW = [
  ['1121 Basmati Rice', '8.35 MM', [113000, 109000, 103000, 104000, 108000, null]],
  ['1885 Basmati Rice', '8.35 MM', [null, 107000, 99000, 100000, 104000, null]],
  ['1718 Basmati Rice', '8.35 MM', [109000, 106000, 97000, 98000, 102000, null]],
  ['1509 Basmati Rice', '8.40 MM', [null, 98000, 92000, 93000, 98000, null]],
  ['1847 Basmati Rice', '8.40 MM', [null, 98000, 92000, 93000, 98000, null]],
  ['1401 Basmati Rice', '7.70 MM', [null, 105000, null, null, null, null]],
  ['PUSA Basmati Rice', '7.45 MM', [100000, 100000, 94000, null, 98000, null]],
  ['Sugandha Rice', '7.90 MM', [null, 88000, 82000, 83000, 87000, null]],
  ['Taj Rice', '8.15 MM', [null, 86500, 82000, null, 86000, null]],
  ['Sharbati Rice', '7.10 MM', [null, null, 81000, null, 86000, null]],
  ['RH-10 Rice', '7.40 MM', [null, 82000, 76000, null, 80000, null]],
  ['PR-11 / PR-14 Rice', '6.90 MM', [56000, 56000, 55000, null, 57000, null]],
  ['PR-106 / PR-47 Rice', '6.50 MM', [49000, 52000, 49000, null, 52000, null]],
  ['PR-26 Rice', '6.40 MM', [48000, 49500, 47500, null, 51000, null]]
];

/* Compliance - EU / UK / USA Compliance — Pesticide Residue Free */
const COMPLIANCE_RICE_RAW = [
  ['1121 Basmati Rice', '8.35 MM', [114000, 113000, 107000, null, 112000, null]],
  ['1718 Basmati Rice', '8.35 MM', [113000, 111000, 104000, null, 108000, null]],
  ['1509 Basmati Rice', '8.40 MM', [null, 105000, 99000, null, 103000, null]],
  ['PUSA Basmati Rice', '7.45 MM', [105000, 105000, 98000, null, 104000, 99000]],
  ['Sharbati Rice', '7.10 MM', [null, null, 87000, null, null, null]],
  ['Parmal Rice', '6.40 MM', [null, null, 57000, null, null, null]]
];

const buildRiceRateTable = (raw) =>
  raw.map(([variety, mm, values]) => ({
    variety,
    mm,
    rates: RICE_PROCESSING_KEYS.reduce((acc, key, i) => {
      acc[key] = values[i];
      return acc;
    }, {})
  }));

const REGULAR_RICE_RATES = buildRiceRateTable(REGULAR_RICE_RAW);
const COMPLIANCE_RICE_RATES = buildRiceRateTable(COMPLIANCE_RICE_RAW);

const ALL_RICE_RATES = {
  REGULAR: REGULAR_RICE_RATES,
  COMPLIANCE: COMPLIANCE_RICE_RATES
};

const VARIETY_KEY_MAP = {
  '1121 Basmati Rice': '1121_BASMATI',
  '1885 Basmati Rice': '1885_BASMATI',
  '1718 Basmati Rice': '1718_BASMATI',
  '1509 Basmati Rice': '1509_BASMATI',
  '1847 Basmati Rice': '1847_BASMATI',
  '1401 Basmati Rice': '1401_BASMATI',
  'PUSA Basmati Rice': 'PUSA_BASMATI',
  'Sugandha Rice': 'SUGANDHA',
  'Taj Rice': 'TAJ',
  'Sharbati Rice': 'SHARBATI',
  'RH-10 Rice': 'RH10',
  'PR-11 / PR-14 Rice': 'PR11_PR14',
  'PR-106 / PR-47 Rice': 'PR106_PR47',
  'PR-26 Rice': 'PR26',
};

const REVERSE_VARIETY_KEY_MAP = Object.fromEntries(
  Object.entries(VARIETY_KEY_MAP).map(([k, v]) => [v, k])
);

const PROCESSING_KEY_TO_LABEL = RICE_PROCESSING_LABELS;

function getPricePerMT(variety, processingType, compliance = 'REGULAR') {
  const rateTable = ALL_RICE_RATES[compliance.toUpperCase()] || REGULAR_RICE_RATES;
  
  // Try exact match first
  let entry = rateTable.find(e => e.variety === variety);
  
  // If not found, try mapping from key
  if (!entry && VARIETY_KEY_MAP[variety]) {
    entry = rateTable.find(e => e.variety === VARIETY_KEY_MAP[variety]);
  }
  
  // If still not found, try reverse mapping
  if (!entry && REVERSE_VARIETY_KEY_MAP[variety]) {
    entry = rateTable.find(e => e.variety === REVERSE_VARIETY_KEY_MAP[variety]);
  }
  
  if (!entry) {
    return null;
  }
  
  const rate = entry.rates[processingType];
  return rate != null ? rate : null;
}

function calculatePricing(variety, processingType, quantityKg, compliance = 'REGULAR') {
  const pricePerMT = getPricePerMT(variety, processingType, compliance);
  
  if (!pricePerMT) {
    return {
      success: false,
      error: `Price not found for variety: ${variety}, processing: ${processingType}, compliance: ${compliance}`
    };
  }
  
  const quantityMT = quantityKg / 1000;
  const baseAmount = Math.round(quantityMT * pricePerMT);
  const gstRate = 0.05; // 5% GST
  const gstAmount = Math.round(baseAmount * gstRate);
  const grandTotal = baseAmount + gstAmount;
  
  return {
    success: true,
    pricePerMT,
    quantityMT,
    baseAmount,
    gstRate,
    gstAmount,
    grandTotal
  };
}

function validateCartItems(items) {
  const results = [];
  let subtotal = 0;
  
  for (const item of items) {
    const pricing = calculatePricing(
      item.variety,
      item.processingType,
      item.quantityKg,
      item.compliance
    );
    
    if (!pricing.success) {
      results.push({
        ...item,
        valid: false,
        error: pricing.error
      });
    } else {
      results.push({
        ...item,
        valid: true,
        pricePerMT: pricing.pricePerMT,
        quantityMT: pricing.quantityMT,
        baseAmount: pricing.baseAmount
      });
      subtotal += pricing.baseAmount;
    }
  }
  
  const gstRate = 0.05;
  const gstAmount = Math.round(subtotal * gstRate);
  const grandTotal = subtotal + gstAmount;
  
  return {
    items: results,
    subtotal,
    gstRate,
    gstAmount,
    grandTotal,
    allValid: results.every(r => r.valid)
  };
}

module.exports = {
  RICE_PROCESSING_KEYS,
  RICE_PROCESSING_LABELS,
  REGULAR_RICE_RATES,
  COMPLIANCE_RICE_RATES,
  ALL_RICE_RATES,
  VARIETY_KEY_MAP,
  REVERSE_VARIETY_KEY_MAP,
  PROCESSING_KEY_TO_LABEL,
  getPricePerMT,
  calculatePricing,
  validateCartItems,
  GST_RATE: 0.05
};