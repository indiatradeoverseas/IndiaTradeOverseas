const path = require('path');
const serverDir = path.join(__dirname, '../Server');
require(path.join(serverDir, 'node_modules/dotenv')).config({ path: path.join(serverDir, '.env') });

const mongoose = require(path.join(serverDir, 'node_modules/mongoose'));
const { updateStage } = require(path.join(serverDir, 'src/modules/leads/lead.service'));
const { updateCallRecordingStatus, getCallRecordings } = require(path.join(serverDir, 'src/modules/leads/leadManagement.controller'));
const Lead = require(path.join(serverDir, 'src/modules/leads/lead.model'));
const CallRecording = require(path.join(serverDir, 'src/modules/leads/callRecording.model'));

async function testWorkflow() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('--- Testing Follow Up Stage & Call Recording Status Persistence ---');

  // 1. Find a test lead
  const testLead = await Lead.findOne({}).sort({ createdAt: -1 });
  if (!testLead) throw new Error('No test lead found');
  console.log(`Initial Lead: ${testLead.leadCode} | Stage: ${testLead.stage}`);

  const mockUser = {
    _id: testLead.assignedTo || testLead.createdBy || new mongoose.Types.ObjectId(),
    role: 'SALES_EXECUTIVE'
  };

  // 2. Test updateStage to REQUIREMENT_CAPTURED
  console.log('\nTesting stage transition to REQUIREMENT_CAPTURED...');
  const updated1 = await updateStage({
    leadId: testLead._id.toString(),
    newStage: 'REQUIREMENT_CAPTURED',
    user: mockUser
  });
  console.log('Updated Lead Stage:', updated1.stage);
  if (updated1.stage !== 'REQUIREMENT_CAPTURED') {
    throw new Error('Expected stage to be REQUIREMENT_CAPTURED');
  }

  // 3. Test same-stage transition (REQUIREMENT_CAPTURED -> REQUIREMENT_CAPTURED)
  console.log('\nTesting same-stage transition (REQUIREMENT_CAPTURED -> REQUIREMENT_CAPTURED)...');
  const updatedSame = await updateStage({
    leadId: testLead._id.toString(),
    newStage: 'REQUIREMENT_CAPTURED',
    user: mockUser
  });
  console.log('Updated Lead Stage (Same):', updatedSame.stage);

  // 4. Test re-open to FOLLOW_UP
  console.log('\nTesting re-open stage to FOLLOW_UP...');
  const updated2 = await updateStage({
    leadId: testLead._id.toString(),
    newStage: 'FOLLOW_UP',
    user: mockUser
  });
  console.log('Updated Lead Stage (Reopened):', updated2.stage);
  if (updated2.stage !== 'FOLLOW_UP') {
    throw new Error('Expected stage to be FOLLOW_UP');
  }

  // 5. Test Call Recording Status update
  const recording = await CallRecording.findOne({}).sort({ createdAt: -1 });
  if (recording) {
    console.log(`\nTesting CallRecording: ${recording._id} | Current status: ${recording.status}`);
    
    // Create mock req / res
    const mockReqCompleted = {
      params: { recordingId: recording._id.toString() },
      body: { status: 'COMPLETED' },
      user: mockUser
    };
    let responseData = null;
    const mockResCompleted = {
      status: () => mockResCompleted,
      json: (data) => { responseData = data; }
    };
    
    await updateCallRecordingStatus(mockReqCompleted, mockResCompleted, (err) => { if (err) throw err; });
    console.log('Update status to COMPLETED response:', responseData?.message);

    // Verify DB CallRecording status
    const recDb1 = await CallRecording.findById(recording._id);
    console.log('DB CallRecording status after COMPLETED:', recDb1.status);
    if (recDb1.status !== 'COMPLETED') throw new Error('Expected status COMPLETED');

    // Test revert to PENDING
    const mockReqPending = {
      params: { recordingId: recording._id.toString() },
      body: { status: 'PENDING' },
      user: mockUser
    };
    await updateCallRecordingStatus(mockReqPending, mockResCompleted, (err) => { if (err) throw err; });
    console.log('Update status to PENDING response:', responseData?.message);

    const recDb2 = await CallRecording.findById(recording._id);
    console.log('DB CallRecording status after PENDING:', recDb2.status);
    if (recDb2.status !== 'PENDING') throw new Error('Expected status PENDING');
  }

  console.log('\n✅ ALL FOLLOW-UP WORKFLOW PERSISTENCE TESTS PASSED 100%!');
  await mongoose.disconnect();
}

testWorkflow().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
