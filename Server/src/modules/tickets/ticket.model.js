const mongoose = require('mongoose');

const ticketCommentSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, default: '' },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketCode: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['IT', 'HR', 'ADMIN', 'FINANCE', 'SALES', 'TRANSPORT'],
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true
    },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    raisedByName: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    resolvedByName: { type: String, default: '' },
    comments: [ticketCommentSchema],
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
