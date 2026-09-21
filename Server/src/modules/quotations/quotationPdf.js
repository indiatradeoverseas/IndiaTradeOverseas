const PDFDocument=require('pdfkit');
const {total}=require('./quotationCommercial');
module.exports=function quotationPdf(quote,res) {
  const t=quote.commercialTerms;
  const doc=new PDFDocument({margin:50});
  res.type('application/pdf');
  res.set('Content-Disposition',`attachment; filename="quotation-${quote._id}.pdf"`);
  res.set('Cache-Control','no-store');
  doc.pipe(res);
  doc.fontSize(20).text('India Trade Overseas');
  doc.moveDown().fontSize(14).text(`Quotation ${quote._id}`);
  doc.fontSize(11).text(`Issued: ${new Date(quote.approvedAt).toISOString().slice(0,10)}`);
  for(const [label,value] of [['Product',t.product],['Source',t.source],['Destination',t.destination],['Quantity',`${t.quantity} ${t.unit}`],['Unit price',`${t.currency} ${t.unitPrice}`],['Freight',`${t.currency} ${t.freight}`],['Tax',`${t.currency} ${t.tax}`],['Total',`${t.currency} ${total(t)}`],['Valid until',new Date(t.validUntil).toISOString().slice(0,10)],['Delivery terms',t.deliveryTerms],['Payment terms',t.paymentTerms]]) doc.moveDown(.6).text(`${label}: ${value}`);
  doc.end();
};
