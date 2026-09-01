const mongoose = require('mongoose');

const transportChatSchema = new mongoose.Schema(
  {
    senderId: { type: String, default: '' },
    senderName: { type: String, required: true },
    senderRole: { type: String, default: 'DRIVER' },
    vehicleNo: { type: String, default: '' },
    channel: { type: String, default: 'GENERAL' },
    message: { type: String, required: true },
    photoUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TransportChat', transportChatSchema);
