/**
 * AI Lead Scoring & Classification Engine
 * Classifies leads into HOT (>=80), WARM (40-79), COLD (<40), FAKE, and INCOMPLETE
 */

function scoreAndClassifyLead(leadData = {}) {
  const {
    quantity = '',
    leadValue = 0,
    hasLOI = false,
    paymentTerms = '',
    contactPerson = '',
    mobile = '',
    phone = '',
    email = '',
    chatSummary = '',
    source = '',
    stage = '',
    activitiesCount = 0,
    hasVoiceNotes = false
  } = leadData;

  const phoneNum = mobile || phone || leadData.phoneMasked || leadData.phoneEncrypted || '';
  const hasContact = !!contactPerson || !!leadData.customerName;
  const hasPhone = !!phoneNum && String(phoneNum).replace(/\s/g, '').length >= 5;
  const hasEmail = !!email && String(email).includes('@');
  const isExistingLead = Boolean(leadData._id || leadData.leadCode || leadData.customerName);

  // 1. Validation checks
  if (!hasPhone && !hasEmail && !isExistingLead) {
    return { score: 0, priority: 'INCOMPLETE', breakdown: [{ factor: 'Missing Contact Details', points: 0 }] };
  }

  const isFakeNumber = phoneNum && /^(.)\1{7,}$/.test(String(phoneNum).replace(/\D/g, ''));
  if (isFakeNumber) {
    return { score: 0, priority: 'FAKE', breakdown: [{ factor: 'Suspicious / Fake Phone Number', points: 0 }] };
  }

  let score = 0;
  const breakdown = [];

  // Base score for verified lead manifest
  if (isExistingLead) {
    score += 15;
    breakdown.push({ factor: 'Verified Customer Manifest Record', points: 15 });
  }

  // 2. Quantity & Value Scoring
  const qtyNumber = parseFloat(String(quantity).replace(/[^0-9.]/g, '')) || 0;
  const valNumber = Number(leadValue || 0);

  if (qtyNumber >= 1000 || valNumber >= 500000) {
    score += 40;
    breakdown.push({ factor: 'High Order Volume / Valuation', points: 40 });
  } else if (qtyNumber >= 100 || valNumber >= 100000) {
    score += 25;
    breakdown.push({ factor: 'Moderate Quantity / Valuation', points: 25 });
  } else if (qtyNumber > 0 || valNumber > 0) {
    score += 10;
    breakdown.push({ factor: 'Initial Requirement Captured', points: 10 });
  }

  // 3. Document Intent (LOI / Purchase Order / Agreement)
  const summaryLower = String(chatSummary).toLowerCase();
  const hasLOIDocs = Array.isArray(leadData.loiDocuments) && leadData.loiDocuments.length > 0;
  const containsLOI = Boolean(hasLOI) || hasLOIDocs ||
    summaryLower.includes('loi') || 
    summaryLower.includes('po ') ||
    summaryLower.includes('purchase order') ||
    summaryLower.includes('letter of intent');

  if (containsLOI) {
    score += 40;
    breakdown.push({ factor: 'Letter of Intent (LOI) / PO Expressed', points: 40 });
  }

  // 4. Payment Terms (Advance / Upfront commitment)
  const termsLower = String(paymentTerms).toLowerCase();
  const isAdvance = termsLower.includes('advance') || 
    termsLower.includes('+') || 
    termsLower.includes('upfront') ||
    termsLower.includes('immediate');

  if (isAdvance) {
    score += 20;
    breakdown.push({ factor: 'Advance Payment Terms Agreed', points: 20 });
  }

  // 5b. Target Date Urgency Scoring (HOT <= 4 days, WARM <= 10 days, COLD > 10 days)
  let targetDatePriority = null;
  const targetDateVal = leadData.targetDate || leadData.timeline || null;
  if (targetDateVal) {
    const tDate = new Date(targetDateVal);
    if (!isNaN(tDate.getTime())) {
      const now = new Date();
      const diffHours = (tDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const diffDays = Math.ceil(diffHours / 24);

      if (diffDays <= 4) {
        targetDatePriority = 'HOT';
        score += 50;
        breakdown.push({ factor: 'Urgent Target Delivery (Within 4 Days)', points: 50 });
      } else if (diffDays <= 10) {
        targetDatePriority = 'WARM';
        score += 30;
        breakdown.push({ factor: 'Near-term Target Delivery (Within 10 Days)', points: 30 });
      } else {
        targetDatePriority = 'COLD';
        score += 10;
        breakdown.push({ factor: 'Far-term Target Delivery (After 10 Days)', points: 10 });
      }
    }
  }

  // 5c. Lead Source Points
  const srcUpper = String(source).toUpperCase();
  if (['WEBSITE', 'WHATSAPP', 'INDIAMART', 'AI_AGENT', 'MANUAL', 'IMPORT'].includes(srcUpper)) {
    score += 15;
    breakdown.push({ factor: 'Valid Lead Entry Source', points: 15 });
  }

  // 6. Pipeline Stage Advancement Points
  const wonStages = ['CLOSED_WON', 'DEAL_WON'];
  const hotStages = ['ORDER_CONFIRMED', 'QUOTATION_APPROVED', 'NEGOTIATION', 'PRICE_DISCUSSION', 'PAYMENT_DISCUSSION', 'PO_RECEIVED', 'LOI_PO_PENDING', 'DISPATCH_PENDING', 'PAYMENT_PENDING'];
  const warmStages = ['REQUIREMENT_CAPTURED', 'REQUIREMENT_RECEIVED', 'QUOTATION_SENT', 'QUOTATION_REQUIRED', 'SAMPLE_SENT', 'CONTACTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP'];

  const stageUpper = String(stage || '').toUpperCase();

  if (wonStages.includes(stageUpper)) {
    score = 100;
    breakdown.push({ factor: 'Deal Successfully Won / Closed', points: 100 });
  } else if (hotStages.includes(stageUpper)) {
    score += 45;
    breakdown.push({ factor: 'Advanced Negotiation / Deal Stage', points: 45 });
  } else if (warmStages.includes(stageUpper)) {
    score += 25;
    breakdown.push({ factor: 'Active Requirement / Quote Stage', points: 25 });
  }

  // 7. Activity & Engagement
  if (activitiesCount > 2 || hasVoiceNotes) {
    score += 10;
    breakdown.push({ factor: 'Active Follow-up & Voice Notes Recorded', points: 10 });
  }

  // Cap score at 100
  score = Math.min(100, score);

  // 8. Priority Classification (Target date priority overrides standard score unless deal is won)
  let priority = 'COLD';
  if (wonStages.includes(stageUpper)) {
    priority = 'HOT';
  } else if (targetDatePriority) {
    priority = targetDatePriority;
  } else if (score >= 80) {
    priority = 'HOT';
  } else if (score >= 35) {
    priority = 'WARM';
  }

  return { score, priority, breakdown };
}

module.exports = { scoreAndClassifyLead };

