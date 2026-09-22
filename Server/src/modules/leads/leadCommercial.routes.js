const router=require('express').Router();
const Lead=require('./lead.model');
const {authenticate}=require('../../middlewares/auth.middleware');
const {isManagement,department,actor}=require('../marketing/campaignGovernance');
const {ok,fail}=require('../../utils/response');
const {recordAudit}=require('../security-audit/auditLog.service');
router.patch('/:id/customer-account',authenticate,async(req,res,next)=>{
  try {
    if(!isManagement(req.user))return fail(res,403,'FORBIDDEN','Management must verify customer account linkage.');
    const b=req.body||{};
    if(!['USER','DISTRIBUTOR'].includes(b.customerAccountType)||typeof b.customerAccountId!=='string'||typeof b.reference!=='string'||!b.reference.trim())return fail(res,400,'VALIDATION_FAILED','Verified account ID, type and evidence are required.');
    const Model=b.customerAccountType==='USER'?require('../users/user.model'):require('../distributors/distributor.model');
    const account=await Model.findById(b.customerAccountId);
    if(!account||account.isActive===false)return fail(res,400,'ACCOUNT_INVALID','Active customer account required.');
    const lead=await Lead.findByIdAndUpdate(req.params.id,{$set:{customerAccountId:String(account._id),customerAccountType:b.customerAccountType,customerAccountEvidence:{reference:b.reference.trim().slice(0,1000),verifiedAt:new Date(),verifiedBy:actor(req.user)}}},{new:true,runValidators:true});
    if(!lead)return fail(res,404,'NOT_FOUND','Lead not found.');
    await recordAudit({actorId:actor(req.user),actionType:'CUSTOMER_ACCOUNT_LINKED',entityType:'LEAD',entityId:lead._id,metadata:{reference:b.reference}});
    return ok(res,{linked:true});
  }catch(e){next(e);}
});
router.patch('/:id/commercial-outcome',authenticate,async(req,res,next)=>{
  try {
    if(!isManagement(req.user) && !['FINANCE','ACCOUNTS'].some(d=>department(req.user,d))) return fail(res,403,'FORBIDDEN','Finance or Management must record actual financial outcomes.');
    const lead=await Lead.findById(req.params.id);
    if(!lead) return fail(res,404,'NOT_FOUND','Lead not found.');
    const prior=lead.commercialOutcome?.toObject?.() || lead.commercialOutcome || {};
    const b={...prior,...req.body}, currency=String(b.currency || '').trim().toUpperCase();
    if(!/^[A-Z]{3}$/.test(currency) || typeof b.orderReference!=='string' || !b.orderReference.trim() || typeof b.evidenceReference!=='string' || !b.evidenceReference.trim()) return fail(res,400,'VALIDATION_FAILED','Currency, actual order reference and evidence are required.');
    for(const k of ['revenue','grossProfit']) if(b[k]!==undefined && b[k]!==null && (typeof b[k]!=='number' || !Number.isFinite(b[k]) || (k==='revenue' && b[k]<0))) return fail(res,400,'VALIDATION_FAILED','Amounts must be finite numbers; revenue cannot be negative.');
    if(prior.currency && currency!==prior.currency && !['revenue','grossProfit'].every(k=>Object.hasOwn(req.body,k))) return fail(res,400,'CURRENCY_CHANGE_REQUIRES_AMOUNTS','Supply both actual amounts or null when changing currency.');
    if(lead.crmStatus!=='WON') return fail(res,409,'OUTCOME_NOT_WON','Record a won order before its financial outcome.');
    lead.commercialOutcome={currency,revenue:b.revenue??null,grossProfit:b.grossProfit??null,orderReference:b.orderReference.trim().slice(0,300),evidenceReference:b.evidenceReference.trim().slice(0,1000),recordedAt:new Date(),recordedBy:actor(req.user)};
    await lead.save();
    await recordAudit({actorId:actor(req.user),actionType:'COMMERCIAL_OUTCOME_RECORDED',entityType:'LEAD',entityId:lead._id,metadata:{currency,evidenceReference:lead.commercialOutcome.evidenceReference}});
    return ok(res,{commercialOutcome:lead.commercialOutcome});
  } catch(error){next(error);}
});
router.patch('/:id/serviceability',authenticate,async(req,res,next)=>{
  try {
    if(!department(req.user,'OPERATIONS')) return fail(res,403,'FORBIDDEN','Operations owns serviceability confirmation.');
    const b=req.body || {};
    if(!['ELIGIBLE','REVIEW_REQUIRED','NOT_ELIGIBLE'].includes(b.status) || typeof b.reference!=='string' || !b.reference.trim() || typeof b.notes!=='string' || !b.notes.trim()) return fail(res,400,'VALIDATION_FAILED','Status, evidence reference and factual notes are required.');
    if(b.marketPriority!==undefined && !['','A','B','C','D'].includes(b.marketPriority))return fail(res,400,'VALIDATION_FAILED','Invalid Operations market priority.');
    const current=await Lead.findById(req.params.id);
    if(!current)return fail(res,404,'NOT_FOUND','Lead not found.');
    const marketPriority=b.marketPriority ?? current.originalPayload?.serviceabilityReview?.marketPriority ?? '';
    const scoring=require('./ai-agent/leadScoring.service').scoreAndClassifyLead({truckCount:current.originalPayload?.scoringTruckCount??null,timeline:current.timeline,targetDate:current.targetDate,companyName:current.companyName,gstProvided:Boolean(current.gstHash),completedPriceCheck:false,isPriorityAServiceableMarket:b.status==='ELIGIBLE'&&marketPriority==='A'});
    const lead=await Lead.findByIdAndUpdate(req.params.id,{$set:{score:scoring.score,priority:scoring.priority,eligibilityStatus:b.status,eligibilityReason:b.notes.trim().slice(0,500),'originalPayload.serviceabilityReview':{marketPriority,reference:b.reference.trim().slice(0,1000),verifiedAt:new Date(),verifiedBy:actor(req.user)},'crmSync.status':'PENDING','crmSync.nextAttemptAt':null}},{new:true});
    if(!lead)return fail(res,404,'NOT_FOUND','Lead not found.');
    await recordAudit({actorId:actor(req.user),actionType:'SERVICEABILITY_REVIEWED',entityType:'LEAD',entityId:lead._id,metadata:{status:b.status,reference:b.reference}});
    return ok(res,{eligibilityStatus:lead.eligibilityStatus});
  }catch(error){next(error);}
});
module.exports=router;
