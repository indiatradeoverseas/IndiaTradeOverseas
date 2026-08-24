const mongoose = require('mongoose');
const mongoURI = 'mongodb://localhost:27017/india-trade-overseas'; // standard local URI

async function run() {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const Lead = require('../../Server/src/modules/leads/lead.model');
    const User = require('../../Server/src/modules/users/user.model');

    const leadId = '6a89678f142ab9f0c8cf92d0dc74';
    const userId = '6a7c51ea66ea676ceab8b442'; // Vikram Singh Rathore

    const lead = await Lead.findById(leadId);
    const user = await User.findById(userId);

    console.log('--- DEBUG INFO ---');
    console.log('Lead Found:', !!lead);
    if (lead) {
      console.log('Lead assignedTo:', lead.assignedTo, 'Type:', typeof lead.assignedTo);
      console.log('Is lead.assignedTo ObjectId?:', lead.assignedTo instanceof mongoose.Types.ObjectId);
    }
    console.log('User Found:', !!user);
    if (user) {
      console.log('User ID:', user._id, 'Role:', user.role);
    }

    if (lead && user) {
      const assignedId = lead.assignedTo?._id || lead.assignedTo;
      console.log('assignedId extracted:', assignedId);
      console.log('assignedId.toString():', assignedId ? assignedId.toString() : 'null');
      console.log('user._id.toString():', user._id.toString());
      console.log('Match result:', assignedId && assignedId.toString() === user._id.toString());
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
