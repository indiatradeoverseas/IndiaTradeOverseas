const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // HR Integration
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  licenseNumber: { type: String, required: true, unique: true },
  licenseExpiry: { type: Date },
  assignedTruck: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
  status: { type: String, enum: ['Available', 'On-Trip', 'On-Leave', 'Suspended'], default: 'Available' },
  address: { type: String },
  documents: [{ title: String, fileUrl: String }]
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);