const router=require('express').Router();
const {authenticate}=require('../../middlewares/auth.middleware');
const {isManagement,department,actor}=require('../marketing/campaignGovernance');
const {ok,fail}=require('../../utils/response');
const Lead=require('../leads/lead.model');
const Event=require('../analytics/analyticsEvent.model');
const Campaign=require('../marketing/controlledCampaign.model');
const {recordAudit}=require('../security-audit/auditLog.service');
router.get('/acquisition',authenticate,async(req,res,next)=>{
  try {
    if(!isManagement(req.user) && !['MARKETING','IT'].some(d=>department(req.user,d))) return fail(res,403,'FORBIDDEN','Management reporting access required.');
    const period={};
    for(const [key,op] of [['from','$gte'],['to','$lte']]) if(req.query[key]) {const date=new Date(req.query[key]);if(!Number.isFinite(date.getTime()))return fail(res,400,'VALIDATION_FAILED','Invalid reporting date.');period[op]=date;}
    if(period.$gte && period.$lte && period.$gte>period.$lte)return fail(res,400,'VALIDATION_FAILED','Reporting start must precede end.');
    const leadMatch=Object.keys(period).length?{createdAt:period}:{},eventMatch=Object.keys(period).length?{occurredAt:period}:{};
    const [campaigns,leads,events,sla]=await Promise.all([
      Campaign.find({}).select('_id').lean(),
      Lead.aggregate([{$match:leadMatch},{$group:{_id:{vertical:'$productCategory',source:'$source',utmSource:'$attribution.utmSource',medium:'$attribution.utmMedium',content:'$attribution.utmContent',device:'$attribution.deviceType',landingPage:'$attribution.landingPage',campaign:'$attribution.utmCampaign',status:'$crmStatus',lostReason:'$lostReason',eligibility:'$eligibilityStatus'},count:{$sum:1}}}]),
      Event.aggregate([{$match:eventMatch},{$group:{_id:{event:'$eventName',vertical:'$business.productCategory',source:'$attribution.utmSource',medium:'$attribution.utmMedium',campaign:'$attribution.utmCampaign',content:'$attribution.utmContent',device:'$properties.device_type',landingPage:'$page.path'},count:{$sum:1}}}]),
      require('../leads/leadSla.service').getSalesSlaDashboard({limit:10,from:period.$gte || null,to:period.$lte || null}),
    ]);
    const campaignMetrics=[];
    for(const campaign of campaigns) campaignMetrics.push(await require('../marketing/controlledCampaignMetrics.service').getControlledCampaignMetrics(campaign._id));
    const journeys=await Event.aggregate([{$match:{...eventMatch,analyticsSessionId:{$ne:''},eventSource:'WEB'}},{$group:{_id:'$analyticsSessionId',events:{$addToSet:'$eventName'}}},{$project:{_id:0,events:1}}]);
    const audiences={landingVisitors:0,productViewers:0,requirementStarters:0,quantityAndDestination:0,softGateAbandoners:0};
    for(const j of journeys){const e=new Set(j.events);if(e.has('landing_page_view'))audiences.landingVisitors++;if(e.has('view_product'))audiences.productViewers++;if(e.has('start_requirement'))audiences.requirementStarters++;if(e.has('select_quantity')&&e.has('enter_destination'))audiences.quantityAndDestination++;if(e.has('view_soft_gate')&&!e.has('submit_phone'))audiences.softGateAbandoners++;}
    await recordAudit({actorId:actor(req.user),actionType:req.query.export==='true'?'ACQUISITION_REPORT_EXPORTED':'ACQUISITION_REPORT_VIEWED',entityType:'REPORT',entityId:'ACQUISITION',metadata:{campaignCount:campaigns.length}});
    return ok(res,{generatedAt:new Date(),period:{from:period.$gte || null,to:period.$lte || null},campaignMetricScope:'LIFETIME_CUMULATIVE',campaigns:campaignMetrics,leadBreakdown:leads,funnel:events,responseTime:sla.metrics,responsePolicy:sla.policy,audiences,audienceUse:'Aggregate diagnostics only. No identity export or external audience sync. Historical visits do not establish current advertising permission.',diagnostics:[['Clicks to landing views','Investigate speed, accidental clicks, URLs and tracking'],['Landing views to requirement starts','Investigate message match, trust and relevance'],['Requirement starts to soft gate','Investigate step complexity'],['Soft gate to submissions','Investigate value, phone field and consent UX'],['Leads to qualified','Investigate traffic quality and targeting'],['Qualified to quotes','Investigate Sales process and operational feasibility'],['Quotes to wins','Investigate price, freight, terms and competition']]});
  }catch(error){next(error);}
});
module.exports=router;
