const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {assessAttribution}=require('../src/modules/marketing/campaignAttribution');
const {validateTerms,total}=require('../src/modules/quotations/quotationCommercial');
const {isManagement}=require('../src/modules/marketing/campaignGovernance');

// Synthetic fixtures are local tests only; never persisted or used as configuration.
const campaign={_id:'fixture',utm:{campaign:'fixture_campaign'},metaCampaignId:'fixture_campaign_id',creatives:[{utmContent:'proof',metaAdId:'fixture_ad_a'},{utmContent:'trust',metaAdId:'fixture_ad_b'}]};
test('Conflicting creative signals cannot enter trusted campaign outcomes',()=>{
  const result=assessAttribution({utmSource:'facebook',utmMedium:'paid_social',utmCampaign:'fixture_campaign',utmContent:'proof',adId:'fixture_ad_b'},[campaign]);
  assert.equal(result.trusted,false);assert.equal(result.creative,null);
});
test('Duplicate Meta campaign configuration is ambiguous, not first-match wins',()=>{
  assert.equal(assessAttribution({campaignId:'fixture_campaign_id'},[campaign,{...campaign,_id:'second'}]).trusted,false);
});
test('Observed matching and canonical lowercase UTM remain trusted',()=>{
  const r=assessAttribution({utmSource:'facebook',utmMedium:'paid_social',utmCampaign:'fixture_campaign',utmContent:'proof',adId:'fixture_ad_a'},[campaign]);assert.equal(r.trusted,true);assert.equal(r.creative.utmContent,'proof');
});
test('A department manager does not automatically become Management',()=>{
  assert.equal(isManagement({role:'SALES_MANAGER',department:'SALES'}),false);assert.equal(isManagement({role:'FOUNDER'}),true);
});
test('Quotation total requires real currency, freight, tax and current validity',()=>{
  const t={source:'fixture',product:'fixture',destination:'fixture',unit:'MT',deliveryTerms:'fixture',paymentTerms:'fixture',reference:'fixture',currency:'INR',quantity:2,unitPrice:10,freight:3,tax:1,validUntil:'2099-01-01'};
  assert.deepEqual(validateTerms(t),[]);assert.equal(total(t),24);assert.ok(validateTerms({...t,freight:null}).includes('freight'));assert.ok(validateTerms({...t,validUntil:'2000-01-01'}).includes('validUntil'));
});
test('Pixel waits for advertising consent, initializes once, shares event ID and revokes',()=>{
  const scripts=[],calls=[];
  const context={META_PIXEL_ID:'fixture',window:{},document:{querySelector:()=>scripts[0],createElement:()=>({dataset:{}}),head:{appendChild:s=>scripts.push(s)}},Set};
  // Valid synthetic numeric ID only inside this isolated VM.
  context.META_PIXEL_ID='123';
  const source=fs.readFileSync(require('node:path').join(__dirname,'../../Client/src/utils/metaPixel.js'),'utf8').replace(/^import .*;\r?\n/,'').replace(/export /g,'');
  vm.runInNewContext(source+'\nthis.dispatch=dispatchMetaEvent;this.consent=updateMetaConsent;',context);
  context.dispatch('lead_created','lead_created_fixture',false);assert.equal(scripts.length,0);
  context.dispatch('lead_created','lead_created_fixture',true);calls.push(...context.window.fbq.queue);assert.equal(scripts.length,1);
  context.dispatch('lead_created','lead_created_fixture',true);assert.equal(context.window.fbq.queue.filter(c=>c[0]==='trackSingle').length,1);
  assert.equal(calls.find(c=>c[0]==='trackSingle')[4].eventID,'lead_created_fixture');
  context.consent(false);context.dispatch('landing_page_view','second',false);assert.equal(context.window.fbq.queue.filter(c=>c[0]==='trackSingle').length,1);
  assert.equal(context.window.fbq.queue.filter(c=>c[0]==='init').length,1);
});
test('Signed Meta webhook requires the exact raw bytes',()=>{
  const names=['META_LEAD_ADS_ENABLED','META_LEAD_ADS_VERIFY_TOKEN','META_LEAD_ADS_APP_SECRET','META_LEAD_ADS_PAGE_ACCESS_TOKEN','META_GRAPH_API_VERSION','META_LEAD_ADS_PAGE_ID'];
  const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  try{
    for(const key of names)process.env[key]='fixture';process.env.META_LEAD_ADS_ENABLED='true';process.env.META_GRAPH_API_VERSION='v99.0';
    const service=require('../src/modules/leads/metaLeadAds.service');
    const rawBody=Buffer.from('{"object":"page"}'),signatureHeader='sha256='+crypto.createHmac('sha256','fixture').update(rawBody).digest('hex');
    assert.equal(service.verifyWebhookSignature({rawBody,signatureHeader}),true);
    assert.throws(()=>service.verifyWebhookSignature({rawBody:Buffer.from('{}'),signatureHeader}));
    assert.throws(()=>service.verifyWebhookSignature({rawBody:{object:'page'},signatureHeader}));
    assert.throws(()=>service.assertExpectedPage('wrong-page'));
  }finally{for(const key of names)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
});
test('Operations PATCH preserves campaign identity; Meta-only edit preserves Operations approval',async()=>{
  const Model=require('../src/modules/marketing/controlledCampaign.model');
  const service=require('../src/modules/marketing/controlledCampaign.service');
  const money={currency:'INR',unit:'MT',min:1,max:2};
  const doc=new Model({marketSelection:{product:'fixture',source:'fixture',targetMarket:{type:'CITY',name:'fixture'},minimumCommercialQuantity:{value:1,unit:'MT'},materialEconomics:money,freightEconomics:money,expectedSellingRange:money,marginBand:'fixture',deliveryCapability:'AVAILABLE',priority:'A'},landingPage:'https://example.test/stone',campaignPromise:'fixture',buyerContext:'fixture',utm:{campaign:'fixture_campaign'},acquisitionPaths:['WEBSITE'],creatives:['PRODUCT_PROOF','SOURCE_PROOF','CORPORATE_TRUST'].map((angle,i)=>({angle,name:'fixture',message:'fixture',assetReference:'https://example.test/fixture',utmContent:`fixture_${i}`}))});
  const originalFind=Model.findById;Model.findById=async()=>doc;doc.save=async()=>doc;
  try{
    const utm=doc.utm.campaign,creativeIds=doc.creatives.map(c=>String(c._id));
    await service.updateControlledCampaign(String(doc._id),{marketSelection:{marginBand:'changed_fixture'}});
    assert.equal(doc.utm.campaign,utm);assert.deepEqual(doc.creatives.map(c=>String(c._id)),creativeIds);assert.equal(doc.campaignPromise,'fixture');assert.deepEqual([...doc.acquisitionPaths],['WEBSITE']);
    const stamp=new Date();doc.operationsInputsConfirmedAt=stamp;doc.operationsInputsConfirmedBy='507f1f77bcf86cd799439011';
    await service.updateControlledCampaign(String(doc._id),{metaCampaignId:'fixture_meta'});
    assert.equal(doc.operationsInputsConfirmedAt.getTime(),stamp.getTime());
  }finally{Model.findById=originalFind;}
});
test('Ambiguous consent mapping is blocked, including reuse of the phone field',()=>{
  const mapping=require('../src/modules/leads/metaLeadFormMapping.service');
  const overrides={META_LEAD_ADS_FIELD_MAP_JSON:JSON.stringify({phone:'fixture_phone'}),META_LEAD_ADS_FORM_IDS:'fixture_form',META_LEAD_ADS_PRIVACY_VERSION:'fixture_version',META_LEAD_ADS_CONTACT_CONSENT_FIELD:'fixture_phone',META_LEAD_ADS_CONTACT_CONSENT_VALUE:'yes'};
  const prior=Object.fromEntries(Object.keys(overrides).map(k=>[k,process.env[k]]));
  try{Object.assign(process.env,overrides);assert.ok(mapping.getMetaLeadFormMappingConfig().missing.includes('META_LEAD_ADS_CONSENT_FIELD_COLLISION'));}
  finally{for(const key of Object.keys(overrides))if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}
});

test('Rice and Tea requirement builders enforce category-specific qualification while generic forms stay lightweight',()=>{
  const {normalizeProductRequirement}=require('../src/modules/leads/productRequirement');

  assert.throws(
    ()=>normalizeProductRequirement({productCategory:'RICE',captureMode:'REQUIREMENT_BUILDER',grade:'1121',packaging:'25 kg'}),
    /Complete the product-specific requirement fields/
  );

  const rice=normalizeProductRequirement({
    productCategory:'RICE',captureMode:'REQUIREMENT_BUILDER',grade:'1121',packaging:'25 kg',tradeType:'EXPORT',incoterm:'FOB'
  });
  assert.equal(rice.category,'RICE');
  assert.equal(rice.details.tradeType,'EXPORT');
  assert.equal(rice.details.incoterm,'FOB');

  const tea=normalizeProductRequirement({
    productCategory:'TEA',captureMode:'REQUIREMENT_BUILDER',grade:'CTC',packaging:'custom',tradeType:'DOMESTIC',privateLabelRequirement:'Required'
  });
  assert.equal(tea.category,'TEA');
  assert.equal(tea.details.privateLabelRequirement,'Required');

  const quote=normalizeProductRequirement({productCategory:'RICE',captureMode:'QUOTE_REQUEST'});
  assert.equal(quote.details.captureMode,'QUOTE_REQUEST');
});

test('Lead schema keeps DPR customer requirement data in first-class database fields',()=>{
  const Lead=require('../src/modules/leads/lead.model');
  const paths=Lead.schema.paths;
  for(const name of ['leadCode','contactId','productCategory','product','quantity','destination','timeline','requirementDetails','crmStatus','assignedTo']){
    assert.ok(paths[name],`Missing Lead schema field: ${name}`);
  }
  for(const name of ['whatsAppEncrypted','whatsAppMasked','whatsAppHash']){
    assert.ok(paths[name],`Missing protected WhatsApp field: ${name}`);
  }
  const origins=Lead.schema.path('leadOrigin').options.enum;
  for(const origin of ['QUICK_ENQUIRY','REQUIREMENT_BUILDER','QUOTE_REQUEST','REPEAT_ORDER'])assert.ok(origins.includes(origin));
});


test('Canonical landing-page event remains landing_page_view',()=>{
  const path=require('node:path');
  const analytics=fs.readFileSync(path.join(__dirname,'../../Client/src/utils/analytics.js'),'utf8');
  assert.match(analytics,/LANDING_PAGE_VIEW\s*:\s*['"]landing_page_view['"]/);
});
