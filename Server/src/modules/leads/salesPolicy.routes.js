const router=require('express').Router();
const {authenticate}=require('../../middlewares/auth.middleware');
const {isManagement,department,actor}=require('../marketing/campaignGovernance');
const Policy=require('./salesPolicy.model');
const {ok,fail}=require('../../utils/response');
router.use(authenticate);
router.get('/',async(req,res,next)=>{try{if(!isManagement(req.user)&&!['SALES','IT','MARKETING'].some(d=>department(req.user,d)))return fail(res,403,'FORBIDDEN','Access denied.');return ok(res,{policy:await Policy.findOne({key:'CURRENT'}).lean()});}catch(e){next(e);}});
router.patch('/',async(req,res,next)=>{try{
  if(!isManagement(req.user))return fail(res,403,'FORBIDDEN','Management must approve the response policy.');
  const existing=await Policy.findOne({key:'CURRENT'}).lean(),b={...existing,...req.body};
  if(b.clockBasis!=='ELAPSED_TIME'||typeof b.reference!=='string'||!b.reference.trim())return fail(res,400,'VALIDATION_FAILED','An elapsed-time policy and Management evidence are required.');
  const values={};for(const key of ['hotResponseMinutes','warmResponseMinutes','nurtureFollowupDays']){if(typeof b[key]!=='number'||!Number.isFinite(b[key])||b[key]<=0)return fail(res,400,'VALIDATION_FAILED','Provide real positive response/follow-up thresholds.');values[key]=b[key];}
  const policy=await Policy.findOneAndUpdate({key:'CURRENT'},{$set:{...values,clockBasis:b.clockBasis,reference:b.reference.trim().slice(0,1000),approvedAt:new Date(),approvedBy:actor(req.user)}},{new:true,upsert:true,runValidators:true});
  await require('../security-audit/auditLog.service').recordAudit({actorId:actor(req.user),actionType:'SALES_POLICY_APPROVED',entityType:'SALES_POLICY',entityId:policy._id,metadata:{reference:b.reference}});
  return ok(res,{policy});
}catch(e){next(e);}});
module.exports=router;
