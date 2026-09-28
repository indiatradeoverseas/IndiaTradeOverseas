const mongoose = require('mongoose');

// Mongoose Counter Schema for atomic sequential numbers
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Counter =
  mongoose.models.LeadCounter ||
  mongoose.model('LeadCounter', counterSchema);

/**
 * Clean a string into a simple URL/code-friendly slug.
 * Removes special characters, extra spaces, and lowercases.
 * @param {string} text - Raw input string
 * @param {string} defaultFallback - Fallback string if empty
 * @returns {string} Cleaned slug
 */
function cleanSlug(text, defaultFallback = 'general') {
  if (!text || typeof text !== 'string') return defaultFallback;
  
  // Clean special characters and keep alphanumeric
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
    
  return cleaned || defaultFallback;
}

/**
 * Generates a formatted, sequential lead code:
 *   [Prefix]/[Location]/[Product]/[SequenceNumber]
 * 
 * Examples:
 *   ITO/bhutan/stone/0001
 *   Prakriti Tea/assam/tea/0002
 *   ITO/nashik/onion/0003
 *
 * @param {Object} payload - Lead creation input parameters
 * @returns {Promise<string>} - Formatted lead code
 */
async function generateFormattedLeadCode(payload = {}) {
  try {
    const rawFormName =
      payload.formName ||
      payload.formTitle ||
      payload.sourceForm ||
      payload.captureMode ||
      '';
      
    const rawCategory =
      payload.productCategory ||
      payload.category ||
      '';
      
    const rawProduct =
      payload.product ||
      payload.service ||
      payload.material ||
      '';

    const categoryUpper = String(rawCategory).toUpperCase();
    const formLower = String(rawFormName).toLowerCase();
    const productLower = String(rawProduct).toLowerCase();

    // 1. Determine Prefix
    let prefix = 'ITO';
    if (
      formLower.includes('prakriti') ||
      categoryUpper.includes('PRAKRITI') ||
      categoryUpper.includes('TEA') ||
      productLower.includes('prakriti') ||
      productLower.includes('tea')
    ) {
      prefix = 'Prakriti Tea';
    } else if (
      categoryUpper.includes('ITO_ADS') ||
      formLower.includes('ads') ||
      productLower.includes('ito ads')
    ) {
      prefix = 'ITO Ads';
    }

    // 2. Determine Location/Country/State
    const rawLoc =
      payload.country ||
      payload.destination ||
      payload.state ||
      payload.location ||
      payload.address ||
      '';
    const location = cleanSlug(rawLoc, 'global');

    // 3. Determine Product/Service
    const product = cleanSlug(rawProduct || rawCategory, 'enquiry');

    // 4. Atomic Sequential Numbering (0001, 0002, 0003...)
    let sequenceStr = '0001';
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'lead_sequence_number' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      if (counter && counter.seq) {
        sequenceStr = String(counter.seq).padStart(4, '0');
      }
    } catch (dbErr) {
      // Safe fallback using total count + 1 if counter model hits an issue
      try {
        const Lead = mongoose.model('Lead');
        const count = await Lead.countDocuments();
        sequenceStr = String(count + 1).padStart(4, '0');
      } catch (countErr) {
        const ts = Date.now().toString().slice(-4);
        sequenceStr = `00${ts}`;
      }
    }

    return `${prefix}/${location}/${product}/${sequenceStr}`;
  } catch (error) {
    console.error('Error in generateFormattedLeadCode (falling back):', error);
    const ts = Date.now().toString().slice(-4);
    return `ITO/global/enquiry/00${ts}`;
  }
}

module.exports = {
  generateFormattedLeadCode,
  Counter
};
