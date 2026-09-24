const router=require('express').Router();
const Quote=require('./quotation.model');
const Lead=require('../leads/lead.model');
const {authenticate}=require('../../middlewares/auth.middleware');
const {hasLeadEvidenceAccess}=require('../leads/leadEvidenceAccess.service');
const {isManagement,department,actor}=require('../marketing/campaignGovernance');
const {validateTerms,total}=require('./quotationCommercial');
const {recordAudit}=require('../security-audit/auditLog.service');
const {ok,fail}=require('../../utils/response');
router.use(authenticate);
router.get('/lead/:leadId/commercial',async(req,res,next)=>{
  try {
    const lead=await Lead.findById(req.params.leadId);
    if(!lead || !(isManagement(req.user) || department(req.user,'OPERATIONS') || await hasLeadEvidenceAccess({user:req.user,lead}))) return fail(res,403,'FORBIDDEN','Access denied.');
    const quotations=await Quote.find({leadId:lead._id}).sort({createdAt:-1}).lean();
    return ok(res,{quotations});
  }catch(e){next(e);}
});
router.patch('/:id/commercial-terms',async(req,res,next)=>{
  try {
    if(!isManagement(req.user) && !department(req.user,'OPERATIONS') && !department(req.user,'SALES')) return fail(res,403,'FORBIDDEN','Management, Operations or Sales must confirm commercial facts.');
    const quote=await Quote.findById(req.params.id);
    if(!quote)return fail(res,404,'NOT_FOUND','Quotation not found.');
    if(['SENT_TO_CUSTOMER','NEGOTIATION','CLOSED'].includes(quote.status))return fail(res,409,'REVISION_REQUIRED','Create a new quotation revision after sharing with the customer.');
    const prior=quote.commercialTerms?.toObject?.() || quote.commercialTerms || {};
    const terms={...prior};
    for(const key of ['source','product','destination','unit','deliveryTerms','paymentTerms','reference','currency','quantity','unitPrice','freight','tax','validUntil']) if(Object.hasOwn(req.body,key)) terms[key]=req.body[key];
    const missing=validateTerms(terms);
    if(missing.length)return fail(res,400,'VALIDATION_FAILED',`Complete real commercial terms: ${missing.join(', ')}`);
    quote.commercialTerms={...terms,confirmedAt:new Date(),confirmedBy:actor(req.user)};
    quote.status='PENDING'; quote.approvedAt=null; quote.approvedBy=null; quote.approvedPrice=null;
    quote.statusChangedAt=new Date(); quote.statusChangedBy=actor(req.user);
    quote.paymentTerms=terms.paymentTerms;
    await quote.save();
    await recordAudit({actorId:actor(req.user),actionType:'QUOTATION_COMMERCIAL_TERMS',entityType:'QUOTATION',entityId:quote._id,metadata:{reference:terms.reference}});
    return ok(res,{quotation:quote,calculatedTotal:total(terms)});
  }catch(e){next(e);}
});
router.get('/:id/pdf',async(req,res,next)=>{
  try {
    const quote=await Quote.findById(req.params.id).lean();
    const lead=quote && await Lead.findById(quote.leadId);
    if(!lead || !(isManagement(req.user) || await hasLeadEvidenceAccess({user:req.user,lead})))return fail(res,403,'FORBIDDEN','Access denied.');
    if(!['APPROVED','SENT_TO_CUSTOMER','NEGOTIATION','CLOSED'].includes(quote.status) || validateTerms(quote.commercialTerms).length || !quote.approvedAt)return fail(res,409,'QUOTE_NOT_READY','A current approved quotation with confirmed terms is required.');
    await recordAudit({actorId:actor(req.user),actionType:'QUOTATION_PDF_EXPORTED',entityType:'QUOTATION',entityId:quote._id});
    require('./quotationPdf')(quote,res);
  }catch(e){next(e);}
});
module.exports=router;
