const crypto = require('crypto');
const SoftLead = require('./softLead.model');
const { ok, fail } = require('../../utils/response');

function generateLeadId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ITO-${timestamp}-${random}`;
}

function hashPhone(phone) {
  return crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex');
}

function extractAttribution(req) {
  return {
    utm_source: req.query.utm_source || req.body.utm_source || '',
    utm_medium: req.query.utm_medium || req.body.utm_medium || '',
    utm_campaign: req.query.utm_campaign || req.body.utm_campaign || '',
    utm_content: req.query.utm_content || req.body.utm_content || '',
    utm_term: req.query.utm_term || req.body.utm_term || '',
    referrer: req.headers.referer || req.headers.referrer || '',
    userAgent: req.headers['user-agent'] || '',
    sessionId: req.headers['x-session-id'] || req.body.sessionId || '',
  };
}

const createSoftLead = async (req, res, next) => {
  try {
    const {
      division,
      product,
      productDetails,
      quantity,
      quantityUnit,
      destination,
      pin,
      timeline,
      eligibility,
      phone,
      consent,
      attribution,
    } = req.body;

    if (!division || !['STONE', 'RICE', 'TEA'].includes(division)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Valid division (STONE, RICE, TEA) is required.');
    }

    if (!product) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Product requirement is required.');
    }

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Valid phone number is required.');
    }

    if (!consent) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Enquiry consent is required.');
    }

    const phoneHash = hashPhone(phone);
    const leadId = generateLeadId();

    const mergedAttribution = {
      ...extractAttribution(req),
      ...(attribution || {}),
    };

    const softLead = new SoftLead({
      leadId,
      division,
      product,
      productDetails: productDetails || {},
      quantity: quantity || '',
      quantityUnit: quantityUnit || '',
      destination: destination || '',
      pin: pin || '',
      timeline: timeline || '',
      eligibility: eligibility || 'SUPPORTED',
      phone,
      phoneHash,
      consent: true,
      consentTimestamp: new Date(),
      source: mergedAttribution.utm_source ? 'CAMPAIGN' : 'WEBSITE',
      medium: mergedAttribution.utm_medium || 'ORGANIC',
      campaign: mergedAttribution.utm_campaign || '',
      content: mergedAttribution.utm_content || '',
      adSet: mergedAttribution.adSet || mergedAttribution.utm_content || '',
      adCreative: mergedAttribution.adCreative || '',
      landingPage: mergedAttribution.referrer || '',
      sessionId: mergedAttribution.sessionId || '',
      attribution: mergedAttribution,
      status: 'NEW',
      qualificationState: 'PHONE_CAPTURED',
    });

    await softLead.save();

    try {
      const { processAiLead } = require('../leads/ai-agent/aiLead.service');
      await processAiLead({
        customerName: softLead.progressiveDetails.name || 'Soft Lead',
        email: softLead.progressiveDetails.email || '',
        phone: softLead.phone,
        city: softLead.destination || '',
        state: '',
        companyName: softLead.progressiveDetails.company || `Soft Lead (${division})`,
        productCategory: division,
        source: 'WEBSITE_SOFT_GATE',
        chatSummary: `Soft gate lead: ${product} - ${quantity} ${quantityUnit} to ${destination}`,
      });
      softLead.crmSynced = true;
      await softLead.save();
    } catch (crmErr) {
      console.error('CRM sync failed for soft lead:', crmErr.message);
      softLead.crmSyncAttempts = 1;
      softLead.crmSyncLastAttempt = new Date();
      softLead.crmSyncError = crmErr.message;
      await softLead.save();
    }

    return ok(res, {
      leadId: softLead.leadId,
      division: softLead.division,
      product: softLead.product,
      qualificationState: softLead.qualificationState,
    }, 'Soft lead created successfully.', 201, req);
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'DUPLICATE_LEAD', 'A lead with this phone already exists for this division.');
    }
    next(error);
  }
};

const updateSoftLeadDetails = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const {
      name,
      company,
      email,
      gst,
      detailedSpec,
      paymentTerms,
      billingAddress,
      shippingAddress,
    } = req.body;

    const softLead = await SoftLead.findOne({ leadId });
    if (!softLead) {
      return fail(res, 404, 'NOT_FOUND', 'Soft lead not found.');
    }

    softLead.progressiveDetails = {
      ...softLead.progressiveDetails,
      name: name || softLead.progressiveDetails.name,
      company: company || softLead.progressiveDetails.company,
      email: email || softLead.progressiveDetails.email,
      gst: gst || softLead.progressiveDetails.gst,
      detailedSpec: detailedSpec || softLead.progressiveDetails.detailedSpec,
      paymentTerms: paymentTerms || softLead.progressiveDetails.paymentTerms,
      billingAddress: billingAddress || softLead.progressiveDetails.billingAddress,
      shippingAddress: shippingAddress || softLead.progressiveDetails.shippingAddress,
    };

    softLead.qualificationState = 'DETAILS_PENDING';
    await softLead.save();

    return ok(res, { lead }, 'Progressive details updated.', 200, req);
  } catch (error) {
    next(error);
  }
};

const getSoftLead = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const softLead = await SoftLead.findOne({ leadId });
    if (!softLead) {
      return fail(res, 404, 'NOT_FOUND', 'Soft lead not found.');
    }
    return ok(res, { lead: softLead }, 'Soft lead retrieved.', 200, req);
  } catch (error) {
    next(error);
  }
};

const listSoftLeads = async (req, res, next) => {
  try {
    const {
      division,
      status,
      qualificationState,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;

    const filter = {};
    if (division) filter.division = division.toUpperCase();
    if (status) filter.status = status.toUpperCase();
    if (qualificationState) filter.qualificationState = qualificationState.toUpperCase();

    const skip = (Number(page) - 1) * Number(limit);
    const leads = await SoftLead.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select('-phoneEncrypted -phoneHash -attribution');

    const total = await SoftLead.countDocuments(filter);

    return ok(res, { leads, total, page: Number(page), limit: Number(limit) }, 'Soft leads retrieved.', 200, req);
  } catch (error) {
    next(error);
  }
};

const retryCrmSync = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const softLead = await SoftLead.findOne({ leadId });
    if (!softLead) {
      return fail(res, 404, 'NOT_FOUND', 'Soft lead not found.');
    }

    try {
      const { processAiLead } = require('../leads/ai-agent/aiLead.service');
      await processAiLead({
        customerName: softLead.progressiveDetails.name || 'Soft Lead',
        email: softLead.progressiveDetails.email || '',
        phone: softLead.phone,
        city: softLead.destination || '',
        state: '',
        companyName: softLead.progressiveDetails.company || `Soft Lead (${softLead.division})`,
        productCategory: softLead.division,
        source: 'WEBSITE_SOFT_GATE_RETRY',
        chatSummary: `Retry sync: ${softLead.product} - ${softLead.quantity} ${softLead.quantityUnit} to ${softLead.destination}`,
      });

      softLead.crmSynced = true;
      softLead.crmSyncAttempts += 1;
      softLead.crmSyncLastAttempt = new Date();
      softLead.crmSyncError = '';
      await softLead.save();

      return ok(res, { lead: softLead }, 'CRM sync successful.', 200, req);
    } catch (crmErr) {
      softLead.crmSyncAttempts += 1;
      softLead.crmSyncLastAttempt = new Date();
      softLead.crmSyncError = crmErr.message;
      await softLead.save();
      return fail(res, 502, 'CRM_SYNC_FAILED', 'CRM sync failed, retry recorded.', { error: crmErr.message }, req);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSoftLead,
  updateSoftLeadDetails,
  getSoftLead,
  listSoftLeads,
  retryCrmSync,
};