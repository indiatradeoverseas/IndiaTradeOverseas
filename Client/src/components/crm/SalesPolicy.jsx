import React,{useState} from 'react';
import axios from '../../api/axiosInstance';
import {useAuth} from '../../hooks/useAuth';
export default function SalesPolicy(){
  const {user}=useAuth();const [form,setForm]=useState({hotResponseMinutes:'',warmResponseMinutes:'',nurtureFollowupDays:'',reference:''}),[message,setMessage]=useState('');
  const management=['ADMIN','FOUNDER','CO_FOUNDER','SUPER_ADMIN'].includes(user?.role)||['ADMIN','MANAGEMENT'].includes(user?.department);
  async function load(){try{const r=await axios.get('/sales-policy');if(r.data.data.policy)setForm(r.data.data.policy);else setMessage('Management response policy is pending.');}catch(e){setMessage(e.response?.data?.message||e.message);}}
  async function save(e){e.preventDefault();try{await axios.patch('/sales-policy',{...form,clockBasis:'ELAPSED_TIME',hotResponseMinutes:Number(form.hotResponseMinutes),warmResponseMinutes:Number(form.warmResponseMinutes),nurtureFollowupDays:Number(form.nurtureFollowupDays)});setMessage('Management policy recorded.');}catch(e){setMessage(e.response?.data?.message||e.message);}}
  return <details><summary onClick={load}>Sales response policy</summary><p>Thresholds use elapsed time, including non-working hours. Management must explicitly approve this basis.</p>{management&&<form onSubmit={save}>{['hotResponseMinutes','warmResponseMinutes','nurtureFollowupDays','reference'].map(k=><label className="block" key={k}>{k}<input required className="border p-2" value={form[k]??''} onChange={e=>setForm(v=>({...v,[k]:e.target.value}))}/></label>)}<button className="border p-2">Approve policy</button></form>}<p role="status">{message}</p></details>;
}
