const router=require('express').Router();
const {authenticateDistributor}=require('../../middlewares/auth.middleware');
const Lead=require('../leads/lead.model'),Quote=require('../quotations/quotation.model'),Order=require('./customerOrder.model');
const {validateTerms,total}=require('../quotations/quotationCommercial');
const {ok,fail}=require('../../utils/response');
const {recordAudit}=require('../security-audit/auditLog.service');
const {transitionLeadCrmStatus}=require('../leads/leadLifecycle.service');
router.use(authenticateDistributor);
const identity=req=>({customerAccountId:String(req.distributor._id),customerAccountType:req.user?'USER':'DISTRIBUTOR'});
router.get('/',async(req,res,next)=>{
  try{
    const leads=await Lead.find(identity(req)).select('leadCode product productCategory quantity destination timeline crmStatus createdAt').lean();
    const quotations=await Quote.find({leadId:{$in:leads.map(l=>l._id)},status:{$in:['SENT_TO_CUSTOMER','NEGOTIATION','CLOSED']}}).select('_id leadId status commercialTerms approvedAt').lean();
    // Internal source economics/evidence are never sent to the customer.
    const publicQuotes=quotations.map(q=>({...q,commercialTerms:q.commercialTerms?Object.fromEntries(['product','destination','quantity','unit','currency','unitPrice','freight','tax','deliveryTerms','paymentTerms','validUntil'].map(k=>[k,q.commercialTerms[k]])):null}));
    const orders=await Order.find(identity(req)).select('-paymentVerifiedBy -fulfillmentVerifiedBy -__v').lean();
    return ok(res,{leads,quotations:publicQuotes,orders});
  }catch(e){next(e);}
});
router.get('/quotations/:id/pdf',async(req,res,next)=>{
  try{
    const quote=await Quote.findById(req.params.id).lean();
    const lead=quote&&await Lead.findOne({_id:quote.leadId,...identity(req)});
    if(!lead || !['SENT_TO_CUSTOMER','NEGOTIATION','CLOSED'].includes(quote.status) || !quote.commercialTerms || !quote.approvedAt)return fail(res,404,'NOT_FOUND','Shared quotation unavailable.');
    await recordAudit({actionType:'CUSTOMER_QUOTATION_DOWNLOAD',entityType:'QUOTATION',entityId:quote._id,metadata:{accountType:identity(req).customerAccountType}});
    require('../quotations/quotationPdf')(quote,res);
  }catch(e){next(e);}
});
router.post('/quotations/:id/accept',async(req,res,next)=>{
  try{
    const quote=await Quote.findById(req.params.id);
    const lead=quote&&await Lead.findOne({_id:quote.leadId,...identity(req)});
    if(!lead || !['SENT_TO_CUSTOMER','NEGOTIATION'].includes(quote.status) || !quote.approvedAt || validateTerms(quote.commercialTerms).length)return fail(res,409,'QUOTE_NOT_ACCEPTABLE','A current shared quotation with confirmed terms is required.');
    if(req.body.acceptTerms!==true)return fail(res,400,'ACCEPTANCE_REQUIRED','Confirm acceptance of the displayed quotation terms.');

    const order=await Order.findOneAndUpdate(
      {quoteId:quote._id},
      {$setOnInsert:{
        quoteId:quote._id,
        leadId:lead._id,
        ...identity(req),
        currency:quote.commercialTerms.currency,
        amount:total(quote.commercialTerms),
        purchaseOrderReference:String(req.body.purchaseOrderReference||'').trim().slice(0,500)
      }},
      {upsert:true,new:true,runValidators:true}
    );

    if(order.customerAccountId!==identity(req).customerAccountId || order.customerAccountType!==identity(req).customerAccountType)return fail(res,409,'ACCOUNT_CONFLICT','Order account differs from current linkage. Contact Sales.');

    // Customer acceptance starts the negotiated order-review stage.
    // Keep both quotation and CRM lifecycle aligned without marking the deal WON
    // before Operations confirms the order.
    if(quote.status==='SENT_TO_CUSTOMER'){
      quote.status='NEGOTIATION';
      quote.statusChangedAt=new Date();
      quote.statusChangedBy=null;
      await quote.save();
    }

    if(lead.crmStatus==='QUOTATION_SENT'){
      await transitionLeadCrmStatus({
        leadId:lead._id,
        toStatus:'NEGOTIATION',
        actorId:null,
        note:`Customer accepted quotation ${quote._id} for order review.`
      });
    }

    await recordAudit({
      actionType:'CUSTOMER_QUOTATION_ACCEPTED',
      entityType:'CUSTOMER_ORDER',
      entityId:order._id,
      metadata:{
        quotationId:String(quote._id),
        leadId:String(lead._id),
        accountType:identity(req).customerAccountType
      }
    });

    return ok(res,{order});
  }catch(e){next(e);}
});
router.post('/leads/:id/reorder',async(req,res,next)=>{
  try{
    const lead=await Lead.findOne({_id:req.params.id,...identity(req)});
    if(!lead)return fail(res,404,'NOT_FOUND','Requirement not found.');
    // A fresh request is subject to Operations review; old price/stock/approval
    // and paid acquisition attribution must never be inherited.
    if(typeof req.body.submissionId!=='string'||req.body.submissionId.length<8)return fail(res,400,'VALIDATION_FAILED','Stable submission ID required.');
    const result=await require('../leads/websiteLead.service').createWebsiteLeadRecord({
      ...req.body,
      captureMode:'REPEAT_ORDER',
      submissionId:'reorder_'+require('crypto').createHash('sha256').update(identity(req).customerAccountType+identity(req).customerAccountId+String(req.body.submissionId)).digest('hex'),
      productCategory:lead.productCategory,
      product:lead.product,
      phone:req.body.phone,
      attribution:{},
    });
    const saved=result.lead;
    if(!saved)return fail(res,500,'PERSISTENCE_UNCONFIRMED','Reorder persistence not confirmed.');

    // Persist the verified customer-account linkage and repeat-source context
    // before asynchronous CRM/notification automation can read the new Lead.
    const linkedLead=await Lead.findByIdAndUpdate(
      saved._id,
      {$set:{...identity(req),'originalPayload.reorderOf':lead._id}},
      {new:true,runValidators:true}
    );
    if(!linkedLead)return fail(res,500,'PERSISTENCE_UNCONFIRMED','Reorder linkage persistence not confirmed.');

    require('../leads/websiteLead.service').scheduleWebsiteLeadAutomation(linkedLead._id);
    return ok(res,{leadId:linkedLead._id,leadCode:linkedLead.leadCode,persisted:true,leadCreatedEventId:result.leadCreatedEventId});
  }catch(e){next(e);}
});
module.exports=router;
