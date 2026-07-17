const mongoose = require('mongoose');

const DistributorTransactionSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true },
  lotId: { type: String, required: true },
  quantity: { type: Number, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentGateway: { type: String, enum: ['Razorpay', 'PayPal'], required: true },
  paymentId: { type: String, required: true },
  orderId: { type: String, required: true },
  status: { type: String, enum: ['Success', 'Failed'], default: 'Success' }
}, { timestamps: true });

module.exports = mongoose.model('DistributorTransaction', DistributorTransactionSchema);
