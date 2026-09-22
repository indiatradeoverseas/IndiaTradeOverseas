function validateTerms(terms) {
  const errors=[];
  for(const field of ['source','product','destination','unit','deliveryTerms','paymentTerms','reference']) if(typeof terms?.[field]!=='string' || !terms[field].trim()) errors.push(field);
  if(!/^[A-Z]{3}$/.test(terms?.currency || '')) errors.push('currency');
  for(const field of ['quantity','unitPrice','freight','tax']) if(typeof terms?.[field]!=='number' || !Number.isFinite(terms[field]) || terms[field]<0 || (field==='quantity' && terms[field]===0)) errors.push(field);
  if(!terms?.validUntil || !Number.isFinite(new Date(terms.validUntil).getTime()) || new Date(terms.validUntil)<=new Date()) errors.push('validUntil');
  return errors;
}
function total(terms) { return Math.round((terms.quantity*terms.unitPrice+terms.freight+terms.tax)*100)/100; }
module.exports={validateTerms,total};
