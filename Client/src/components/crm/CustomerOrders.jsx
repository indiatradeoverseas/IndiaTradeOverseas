
import React,{useState} from 'react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';
export default function CustomerOrders({user,leadId}){
  const [orders,setOrders]=useState([]),[reference,setReference]=useState(''),[title,setTitle]=useState(''),[url,setUrl]=useState('');
  const ops=user?.department==='OPERATIONS';
  const finance=['FINANCE','ACCOUNTS','ADMIN','MANAGEMENT'].includes(user?.department)||['ADMIN','FOUNDER','CO_FOUNDER','SUPER_ADMIN'].includes(user?.role);
  async function load(){try{const r=await axios.get('/customer-orders',{params:leadId?{leadId}:{}});setOrders(r.data.data.orders);}catch(e){toast.error(e.response?.data?.message||e.message);}}
  async function update(id,payload){try{await axios.patch(`/customer-orders/${id}`,{...payload,reference});await load();toast.success('Order evidence recorded.');}catch(e){toast.error(e.response?.data?.message||e.message);}}
  return <details className="border rounded p-4 my-4"><summary onClick={load}>Customer order handoffs</summary><label className="block">Evidence reference<input className="border p-2" value={reference} onChange={e=>setReference(e.target.value)}/></label>{orders.map(o=><article className="border p-3 my-3" key={o._id}><p>{o._id} · {o.status} · {o.paymentStatus} · {o.currency} {o.amount}</p>{finance&&['PAID','CREDIT_APPROVED'].map(s=><button key={s} className="border p-2" onClick={()=>update(o._id,{paymentStatus:s})}>{s.replaceAll('_',' ')}</button>)}{ops&&<>{['CONFIRMED','DISPATCHED','DELIVERED','CANCELLED'].map(s=><button key={s} className="border p-2" onClick={()=>update(o._id,{status:s})}>{s}</button>)}<label className="block">Document title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="block">Customer-accessible HTTPS document URL<input value={url} onChange={e=>setUrl(e.target.value)}/></label><button onClick={()=>update(o._id,{document:{title,url}})}>Share document</button></>}</article>)}</details>;
}
