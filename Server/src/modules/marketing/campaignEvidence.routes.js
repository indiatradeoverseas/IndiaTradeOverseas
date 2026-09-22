const router = require('express').Router();
const Campaign = require('./controlledCampaign.model');
const { RELEASE_CHECKS, isManagement, department, actor } = require('./campaignGovernance');
const { recordAudit } = require('../security-audit/auditLog.service');
const { ok, fail } = require('../../utils/response');
const { authenticate } = require('../../middlewares/auth.middleware');
const text = value => typeof value === 'string' ? value.trim().slice(0,2000) : '';
router.use(authenticate);
router.get('/release-checks', (req,res) => {
  if (!isManagement(req.user) && !['IT','MARKETING','OPERATIONS'].some(d=>department(req.user,d))) return fail(res,403,'FORBIDDEN','Access denied');
  return ok(res,{checks:RELEASE_CHECKS});
});
router.patch('/:campaignId/evidence/:kind', async (req,res,next) => {
  try {
    const kind=req.params.kind;
    const allowed=isManagement(req.user) || (kind==='release' && department(req.user,'IT')) || (['performance','experiment','delivery'].includes(kind) && department(req.user,'MARKETING'));
    if (!allowed) return fail(res,403,'FORBIDDEN','This evidence belongs to another department.');
    const campaign=await Campaign.findById(req.params.campaignId);
    if (!campaign) return fail(res,404,'NOT_FOUND','Campaign not found.');
    const input=req.body || {};
    const reference=text(input.reference), notes=text(input.notes);
    if (!reference || !notes) return fail(res,400,'VALIDATION_FAILED','Real evidence reference and factual notes are required.');
    const evidence={reference,notes,verifiedAt:new Date(),verifiedBy:actor(req.user)};
    if (kind==='release') {
      if (!RELEASE_CHECKS.includes(input.key)) return fail(res,400,'VALIDATION_FAILED','Unknown release check.');
      campaign.releaseChecks=(campaign.releaseChecks || []).filter(row=>row.key!==input.key);
      if (input.verified === true) campaign.releaseChecks.push({...evidence,key:input.key});
      else if (input.verified !== false) return fail(res,400,'VALIDATION_FAILED','verified must be a boolean.');
    } else if(kind==='delivery') {
      const observedAt=new Date(input.observedAt);
      if(!['RUNNING','PAUSED','STOPPED'].includes(input.status)||!Number.isFinite(observedAt.getTime())||observedAt>new Date())return fail(res,400,'VALIDATION_FAILED','Observed delivery status and real observation time are required.');
      campaign.observedDelivery={...evidence,status:input.status,observedAt};
    } else if (kind==='performance') {
      // An evidenced cumulative snapshot; replacing it never double-counts spend.
      const amount=input.amount;
      const currency=text(input.currency).toUpperCase();
      const through=new Date(input.through);
      if (typeof amount!=='number' || !Number.isFinite(amount) || amount<0 || !/^[A-Z]{3}$/.test(currency) || !Number.isFinite(through.getTime()) || through>new Date()) return fail(res,400,'VALIDATION_FAILED','Actual cumulative spend, currency and observation date are required.');
      campaign.actualPerformance={...evidence,amount,currency,through,impressions:null,clicks:null};
      for (const field of ['impressions','clicks']) {
        if (input[field] !== undefined && input[field] !== null) {
          if (!Number.isSafeInteger(input[field]) || input[field]<0) return fail(res,400,'VALIDATION_FAILED','Counts must be nonnegative whole numbers.');
          campaign.actualPerformance[field]=input[field];
        }
      }
    } else if (kind==='experiment') {
      if (!['TEST','HOLD','STOP','SCALE'].includes(input.decision)) return fail(res,400,'VALIDATION_FAILED','Select TEST, HOLD, STOP or SCALE.');
      if (input.decision==='SCALE') {
        if (!isManagement(req.user)) return fail(res,403,'FORBIDDEN','Management owns scale decisions.');
        const review=await require('./controlledCampaignPrelaunch.service').getControlledCampaignPrelaunchReview(campaign._id);
        const metrics=await require('./controlledCampaignMetrics.service').getControlledCampaignMetrics(campaign._id);
        if(input.economicsAccepted!==true || metrics.financial.cpql===null) return fail(res,409,'ECONOMICS_REVIEW_REQUIRED','Management must accept evidenced economics with an observed CPQL before scaling.');
        if (!review.readyForControlledLaunch || !metrics.phase4.exitCriterionAchieved || !campaign.actualPerformance) return fail(res,409,'SCALE_BLOCKED','Verified QA, qualified leads and actual spend are required before scaling.');
      }
      if (!text(input.hypothesis) || !text(input.salesFeedback)) return fail(res,400,'VALIDATION_FAILED','Hypothesis and sales feedback are required.');
      campaign.experiments.push({...evidence,decision:input.decision,economicsAccepted:input.decision==='SCALE'&&input.economicsAccepted===true,hypothesis:text(input.hypothesis),salesFeedback:text(input.salesFeedback)});
    } else return fail(res,400,'VALIDATION_FAILED','Unknown evidence type.');
    await campaign.save();
    await recordAudit({actorId:actor(req.user),actionType:'CONTROLLED_CAMPAIGN_EVIDENCE',entityType:'CONTROLLED_CAMPAIGN',entityId:campaign._id,metadata:{kind,reference}});
    return ok(res,{campaign});
  } catch(error) { next(error); }
});
module.exports=router;
