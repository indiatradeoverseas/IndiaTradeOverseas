const mongoose=require('mongoose');
module.exports=mongoose.model('SalesPolicy',new mongoose.Schema({
  key:{type:String,default:'CURRENT',unique:true},
  hotResponseMinutes:{type:Number,min:1,default:null},warmResponseMinutes:{type:Number,min:1,default:null},
  nurtureFollowupDays:{type:Number,min:1,default:null},
  clockBasis:{type:String,enum:['ELAPSED_TIME'],default:'ELAPSED_TIME'},
  reference:{type:String,default:''},approvedAt:Date,approvedBy:mongoose.Schema.Types.ObjectId,
},{timestamps:true}));
