const mongoose = require('mongoose');

const kpiCardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  key: { type: String, required: true },
  icon: { type: String, default: 'FiActivity' }
}, { _id: false });

const dashboardConfigSchema = new mongoose.Schema({
  department: { type: String, required: true, unique: true, index: true },
  departmentName: { type: String, required: true },
  kpiCards: [kpiCardSchema],
  productivityWeights: {
    timeRatioWeight: { type: Number, default: 50 },
    actionBonusMax: { type: Number, default: 50 }
  }
}, { timestamps: true });

module.exports = mongoose.model('DashboardConfig', dashboardConfigSchema);
