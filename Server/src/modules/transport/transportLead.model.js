const mongoose = require('mongoose');

const assignedDriverSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  driverName: {
    type: String,
    required: false,
    trim: true
  },
  phone: {
    type: String,
    required: false,
    trim: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const transportLeadSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    default: '',
    trim: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  pickupLocation: {
    type: String,
    default: '',
    trim: true
  },
  dropLocation: {
    type: String,
    default: '',
    trim: true
  },
  goodsType: {
    type: String,
    default: 'General Cargo',
    trim: true
  },
  vehicleType: {
    type: String,
    default: 'Open Body Truck',
    trim: true
  },
  estimatedDistanceKm: {
    type: Number,
    default: 0
  },
  offeredRate: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['NEW', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'NEW'
  },
  assignedDrivers: [assignedDriverSchema],
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Index for fast search by serial number, customer name and status
transportLeadSchema.index({ serialNumber: 1, customerName: 1, status: 1 });

module.exports = mongoose.model('TransportLead', transportLeadSchema);
