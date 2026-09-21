const mongoose=require('mongoose');
const schema=new mongoose.Schema({
  quoteId:{type:mongoose.Schema.Types.ObjectId,ref:'Quotation',required:true,unique:true},
  leadId:{type:mongoose.Schema.Types.ObjectId,ref:'Lead',required:true,index:true},
  customerAccountId:{type:String,required:true,index:true},customerAccountType:{type:String,enum:['USER','DISTRIBUTOR'],required:true},
  status:{type:String,enum:['ACCEPTED_PENDING_REVIEW','CONFIRMED','DISPATCHED','DELIVERED','CANCELLED'],default:'ACCEPTED_PENDING_REVIEW'},
  acceptedAt:{type:Date,default:Date.now},purchaseOrderReference:{type:String,default:''},
  currency:String,amount:Number,
  paymentStatus:{type:String,enum:['PENDING','PAID','CREDIT_APPROVED'],default:'PENDING'},
  analyticsStatus:{type:String,enum:['PENDING','COMPLETED'],default:'PENDING',index:true},
  paymentReference:{type:String,default:''},paymentVerifiedAt:Date,paymentVerifiedBy:mongoose.Schema.Types.ObjectId,
  fulfillmentReference:{type:String,default:''},fulfillmentVerifiedAt:Date,fulfillmentVerifiedBy:mongoose.Schema.Types.ObjectId,
  documents:{type:[{title:String,url:String,recordedAt:Date,recordedBy:mongoose.Schema.Types.ObjectId}],default:[]},
},{timestamps:true,optimisticConcurrency:true});
module.exports=mongoose.model('CustomerOrder',schema);
