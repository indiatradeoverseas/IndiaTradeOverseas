const EXPORT_RATES = Object.freeze({
    DUBAI: {
      destination: "Dubai",
      minSize: "55mm+",
      rate: 50.5,
      packaging: "20 KG Mesh Bag",
      transport: 1.3,
    },
  
    MALAYSIA: {
      destination: "Malaysia",
      minSize: "45mm+",
      rate: 43.5,
      packaging: "9 KG Mesh Bag",
      transport: 1.3,
    },
  
    SRI_LANKA: {
      destination: "Sri Lanka",
      minSize: "45mm+",
      rate: 48.5,
      packaging: "25 KG Jute Bag",
      transport: 1.3,
    },
  
    BANGLADESH: {
      destination: "Bangladesh",
      minSize: "40mm+",
      rate: 45.5,
      packaging: "50 KG Jute Bag",
      transport: 1.3,
    },
  
    VIETNAM: {
      destination: "Vietnam",
      minSize: "35mm+",
      rate: 38.5,
      packaging: "10 KG Mesh Bag",
      transport: 1.3,
    },
  
    NEPAL: {
      destination: "Nepal",
      minSize: "45mm+",
      rate: 47.8,
      packaging: "50 KG Jute Bag",
      transport: 1.3,
    },
  });
  
  const DOMESTIC_RATES = Object.freeze({
    "40MM_PLUS": {
      label: "40mm+",
      rate: 46.5,
      packaging: "50 KG Mesh Bag",
    },
  
    "45MM_PLUS": {
      label: "45mm+",
      rate: 47.5,
      packaging: "50 KG Mesh Bag",
    },
  
    "50MM_PLUS": {
      label: "50mm+",
      rate: 49,
      packaging: "50 KG Mesh Bag",
    },
  });
  
  const GST_RATE = 0.05;
  
  function roundMoney(value) {
    return (
      Math.round(
        (Number(value) + Number.EPSILON) *
          100
      ) / 100
    );
  }
  
  function resolveDomesticRate(size) {
    const normalized = String(
      size || ""
    ).toUpperCase();
  
    if (normalized.includes("50")) {
      return DOMESTIC_RATES["50MM_PLUS"];
    }
  
    if (normalized.includes("45")) {
      return DOMESTIC_RATES["45MM_PLUS"];
    }
  
    return DOMESTIC_RATES["40MM_PLUS"];
  }
  
  function calculateOnionPricing(
    requirement = {}
  ) {
    const tradeType = String(
      requirement.tradeType || ""
    ).toUpperCase();
  
    const quantityKg = Number(
      requirement.quantityKg
    );
  
    if (
      !Number.isFinite(quantityKg) ||
      quantityKg <= 0
    ) {
      throw new Error(
        "A valid quantity in kilograms is required."
      );
    }
  
    let pricing;
  
    if (tradeType === "EXPORT") {
      const destination = String(
        requirement.destination || ""
      ).toUpperCase();
  
      pricing =
        EXPORT_RATES[destination];
  
      if (!pricing) {
        throw new Error(
          "No export onion rate is configured for the selected destination."
        );
      }
  
      const requiredSize = String(
        pricing.minSize
      ).replace(/[^0-9]/g, "");
  
      const requestedSize = String(
        requirement.size || ""
      ).replace(/[^0-9]/g, "");
  
      if (
        requestedSize &&
        requiredSize &&
        Number(requestedSize) <
          Number(requiredSize)
      ) {
        throw new Error(
          `${pricing.destination} requires ${pricing.minSize} for the configured rate.`
        );
      }
    } else if (
      tradeType === "DOMESTIC"
    ) {
      pricing = resolveDomesticRate(
        requirement.size
      );
    } else {
      throw new Error(
        "Select Domestic or Export."
      );
    }
  
    const materialAmount = roundMoney(
      quantityKg * pricing.rate
    );
  
    const transportAmount =
      tradeType === "EXPORT"
        ? roundMoney(
            quantityKg *
              (pricing.transport || 0)
          )
        : 0;
  
    const subtotal = roundMoney(
      materialAmount +
        transportAmount
    );
  
    const gstAmount = roundMoney(
      subtotal * GST_RATE
    );
  
    const grandTotal = roundMoney(
      subtotal + gstAmount
    );
  
    return {
      product: "Red Onion",
      crop: "NEW CROP",
  
      tradeType,
  
      destination:
        pricing.destination,
  
      size: requirement.size,
  
      grade: requirement.grade,
  
      quantityKg,
  
      quantityMT: roundMoney(
        quantityKg / 1000
      ),
  
      packaging:
        requirement.packaging ||
        pricing.packaging,
  
      unitRate: pricing.rate,
  
      transportRate:
        pricing.transport || 0,
  
      materialAmount,
  
      transportAmount,
  
      subtotal,
  
      gstRate: GST_RATE,
  
      gstAmount,
  
      grandTotal,
    };
  }
  
  module.exports = {
    EXPORT_RATES,
    DOMESTIC_RATES,
    GST_RATE,
    calculateOnionPricing,
    roundMoney,
  };