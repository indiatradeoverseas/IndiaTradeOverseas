const GST_RATE = Number.isFinite(
    Number(process.env.COAL_GST_RATE)
  )
    ? Number(process.env.COAL_GST_RATE)
    : 0.18;
  
  function roundMoney(value) {
    return Math.round(
      (Number(value) + Number.EPSILON) * 100
    ) / 100;
  }
  
  function positiveNumber(value, label) {
    const number = Number(value);
  
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error(
        `${label} must be a valid positive number.`
      );
    }
  
    return number;
  }
  
  function calculateCoalPricing(requirement = {}) {
    const estimatedValuation = positiveNumber(
      requirement.estValuation,
      'Estimated valuation'
    );
  
    const transportAmount = Math.max(
      0,
      Number(requirement.transportAmount || 0)
    );
  
    const subtotal = roundMoney(
      estimatedValuation + transportAmount
    );
  
    const gstAmount = roundMoney(
      subtotal * GST_RATE
    );
  
    const grandTotal = roundMoney(
      subtotal + gstAmount
    );
  
    return {
      product: 'Coal',
  
      origin: requirement.origin || '',
  
      coalType: requirement.coalType || '',
  
      gcv: requirement.gcv
        ? Number(requirement.gcv)
        : null,
  
      basis: requirement.basis || '',
  
      quantityMT: Number(
        requirement.targetQty ||
        requirement.orderQty ||
        0
      ),
  
      valuationAmount: roundMoney(
        estimatedValuation
      ),
  
      transportAmount: roundMoney(
        transportAmount
      ),
  
      subtotal,
  
      gstRate: GST_RATE,
  
      gstAmount,
  
      grandTotal,
  
      currency: 'INR',
    };
  }
  
  module.exports = {
    GST_RATE,
    roundMoney,
    calculateCoalPricing,
  };