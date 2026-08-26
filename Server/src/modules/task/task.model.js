const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    assignedTo: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Employee',
      required: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Employee',
      required: true,
      index: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PENDING'
    },
    department: {
      type: String,
      enum: ['SALES', 'HR', 'IT', 'ADMIN', 'GENERAL'],
      default: 'GENERAL'
    },
    category: {
      type: String,
      enum: ['GENERAL', 'RECRUITMENT', 'FOLLOW_UP', 'DOCUMENT', 'CALL', 'MEETING'],
      default: 'GENERAL'
    },
    fileUrl: {
      type: String,
      default: ''
    },
    fileOriginalName: {
      type: String,
      default: ''
    },
    completionFileUrl: {
      type: String,
      default: ''
    },
    completionFileOriginalName: {
      type: String,
      default: ''
    },
    remarks: {
      type: String,
      default: '',
      trim: true
    },
    completedAt: {
      type: Date,
      default: null
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Task', taskSchema);
