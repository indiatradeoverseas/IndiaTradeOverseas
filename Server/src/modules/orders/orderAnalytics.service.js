const Order=require('./customerOrder.model');
const Lead=require('../leads/lead.model');
const {recordAnalyticsEvent}=require('../analytics/analyticsEvent.service');
async function syncPaidOrderAnalytics(order) {
  if(order.paymentStatus!=='PAID'||!order.paymentVerifiedAt)return;
  const lead=await Lead.findById(order.leadId).lean();
  if(!lead)return;
  const consent=lead.consent||{};
  if(consent.analyticsAllowed===true||consent.advertisingAllowed===true){
    const events=['purchase'];
    const previous=await Order.exists({customerAccountId:order.customerAccountId,customerAccountType:order.customerAccountType,paymentStatus:'PAID',paymentVerifiedAt:{$lt:order.paymentVerifiedAt},_id:{$ne:order._id}});
    if(previous)events.push('repeat_order');
    for(const eventName of events)await recordAnalyticsEvent({eventId:`${eventName}_${order._id}`,eventName,eventSource:'SERVER',occurredAt:order.paymentVerifiedAt,leadId:lead._id,leadCode:lead.leadCode,analyticsSessionId:lead.attribution?.analyticsSessionId||'',attribution:lead.attribution||{},business:{vertical:lead.productCategory,productCategory:lead.productCategory,productCode:lead.product},properties:{currency:order.currency,value:order.amount}},{queueMetaCapi:consent.advertisingAllowed===true});
  }
  await Order.updateOne({_id:order._id,paymentVerifiedAt:order.paymentVerifiedAt},{$set:{analyticsStatus:'COMPLETED'}});
}
async function retryPendingOrderAnalytics(limit=25){
  const orders=await Order.find({paymentStatus:'PAID',analyticsStatus:'PENDING'}).sort({updatedAt:1}).limit(limit).lean();
  for(const order of orders){try{await syncPaidOrderAnalytics(order);}catch{/* Durable pending state remains for the next worker tick. */}}
  return orders.length;
}
module.exports={syncPaidOrderAnalytics,retryPendingOrderAnalytics};
