import React, { useEffect, useState } from 'react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export default function CampaignGovernancePanel({ campaign, user, budget, setBudget, onSaved }) {
  const management = ['ADMIN','FOUNDER','CO_FOUNDER','SUPER_ADMIN'].includes(user?.role) || ['ADMIN','MANAGEMENT'].includes(user?.department);
  const [checks, setChecks] = useState([]);
  const [kind, setKind] = useState(management || user?.department==='IT' ? 'release' : 'verification');
  const [form, setForm] = useState({ status:'RUNNING',observedAt:'',reference:'', notes:'', key:'', currency:'', amount:'', through:'', decision:'TEST', hypothesis:'', salesFeedback:'', economicsAccepted:false, scope:'', rationale:'', requiredForGenericAcquisition:true, applied:false, verificationType:user?.department==='OPERATIONS'?'CREATIVE_CLAIMS':user?.department==='MARKETING'?'LANDING_EXPERIENCE':'WEBSITE_ATTRIBUTION' });
  const [busy, setBusy] = useState(false);
  useEffect(()=> { axios.get('/marketing/controlled-campaigns/release-checks').then(r=>setChecks(r.data.data.checks)).catch(()=>{}); },[]);
  const field = (key,label,type='text') => <label className="block text-sm">{label}<input className="block w-full border rounded p-2 bg-transparent" type={type} value={form[key]} onChange={e=>setForm(v=>({...v,[key]:e.target.value}))} /></label>;
  async function save(e) {
    e.preventDefault(); setBusy(true);
    try {
      const base=`/marketing/controlled-campaigns/${campaign._id}`;
      if(kind==='audience') await axios.patch(`${base}/audience-exclusion`,{scope:form.scope,rationale:form.rationale,requiredForGenericAcquisition:form.requiredForGenericAcquisition,applied:form.applied,evidenceReference:form.reference});
      else if(kind==='verification') await axios.patch(`${base}/prelaunch-verification`,{verificationType:form.verificationType,verified:true,verificationEvidence:{reference:form.reference,notes:form.notes}});
      else await axios.patch(`${base}/evidence/${kind}`,{...form,amount:form.amount===''?null:Number(form.amount),verified:true});
      toast.success('Evidence recorded.'); await onSaved();
    } catch(error) { toast.error(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  }
  return <section className="border rounded p-4 my-4 space-y-4">
    <h3 className="font-semibold">Campaign governance and observed economics</h3>
    {management && <fieldset className="grid gap-3 md:grid-cols-3"><legend>Management budget for approval</legend>{['currency','amount','basis'].map(key=><label key={key}>{key}<input className="block border p-2 bg-transparent w-full" type={key==='amount'?'number':'text'} value={budget[key]} onChange={e=>setBudget(v=>({...v,[key]:e.target.value}))} /></label>)}</fieldset>}
    <p className="text-sm">Verified release checks: {(campaign.releaseChecks || []).length}/{checks.length}. Record evidence only after the check is performed.</p>
<p className="text-sm">External delivery: {campaign.observedDelivery ? `${campaign.observedDelivery.status} observed ${new Date(campaign.observedDelivery.observedAt).toLocaleString()}` : 'No live observation recorded'}.</p>
    <p className="text-sm">Actual spend: {campaign.actualPerformance ? `${campaign.actualPerformance.currency} ${campaign.actualPerformance.amount} through ${new Date(campaign.actualPerformance.through).toLocaleDateString()}` : 'Unavailable'}. Planned budget is separate.</p>
    <form onSubmit={save} className="space-y-3">
      <label>Record<select className="block border p-2 bg-transparent" value={kind} onChange={e=>setKind(e.target.value)}>
        {(management || user?.department==='IT') && <option value="release">Release QA evidence</option>}
        <option value="verification">Attribution / landing / claims verification</option>
        {(management || user?.department==='MARKETING') && <><option value="audience">Audience exclusion decision</option><option value="performance">Actual cumulative spend</option><option value="delivery">Observed external delivery</option><option value="experiment">Experiment and sales feedback</option></>}
      </select></label>
      {kind==='release' && <label>Check<select required value={form.key} onChange={e=>setForm(v=>({...v,key:e.target.value}))} className="block border p-2 bg-transparent"><option value="">Select check</option>{checks.map(key=><option key={key}>{key}</option>)}</select></label>}
      {kind==='verification' && <label>Verification<select value={form.verificationType} onChange={e=>setForm(v=>({...v,verificationType:e.target.value}))} className="block border p-2 bg-transparent">{['LANDING_EXPERIENCE','CREATIVE_CLAIMS','WEBSITE_ATTRIBUTION','META_INSTANT_FORM_ATTRIBUTION'].filter(key=>management || (user?.department==='MARKETING' && key==='LANDING_EXPERIENCE') || (user?.department==='OPERATIONS' && key==='CREATIVE_CLAIMS') || (user?.department==='IT' && key.includes('ATTRIBUTION'))).map(key=><option key={key}>{key}</option>)}</select></label>}
      {kind==='delivery' && <><select value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value}))}>{['RUNNING','PAUSED','STOPPED'].map(k=><option key={k}>{k}</option>)}</select>{field('observedAt','Actually observed at','datetime-local')}<p>This records an external observation; it does not launch or stop advertising.</p></>}
      {kind==='performance' && <div className="grid md:grid-cols-3 gap-3">{field('amount','Actual cumulative ad spend','number')}{field('currency','Currency code')}{field('through','Observed through','datetime-local')}</div>}
      {kind==='audience' && <>{field('scope','Exclusion scope')}{field('rationale','Decision rationale')}{['requiredForGenericAcquisition','applied'].map(key=><label className="block" key={key}><input type="checkbox" checked={form[key]} onChange={e=>setForm(v=>({...v,[key]:e.target.checked}))} /> {key==='applied'?'Applied externally, with evidence':'Exclusion required'}</label>)}</>}
      {kind==='experiment' && <>{field('hypothesis','Hypothesis / variant comparison')}{field('salesFeedback','Sales feedback')}{management&&<label><input type="checkbox" checked={form.economicsAccepted} onChange={e=>setForm(v=>({...v,economicsAccepted:e.target.checked}))}/> Management accepts the observed economics, supported by the evidence reference and notes.</label>}<select value={form.decision} onChange={e=>setForm(v=>({...v,decision:e.target.value}))}>{['TEST','HOLD','STOP',...(management?['SCALE']:[])].map(k=><option key={k}>{k}</option>)}</select></>}
      {field('reference','Real evidence reference')}{field('notes','Factual verification notes')}
      <button disabled={busy} className="border rounded px-4 py-2">{busy?'Saving…':'Record evidence'}</button>
    </form>
  </section>;
}
