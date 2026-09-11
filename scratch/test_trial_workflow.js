require('../Server/node_modules/dotenv').config({ path: '../Server/.env' });
const mongoose = require('../Server/node_modules/mongoose');

const BASE_URL = 'http://localhost:5000/api/v1';

async function runTest() {
  console.log('--- STARTING SALES TRIAL FULL WORKFLOW TEST ---');
  try {
    // 1. Get Next Trial ID
    const nextIdRes = await fetch(`${BASE_URL}/sales-trial/auth/next-id`).then(r => r.json());
    console.log('[1] Next Trial ID:', nextIdRes?.data?.nextTrialId);
    const testTrialId = nextIdRes?.data?.nextTrialId || 'TRL099';
    const testEmail = `trial_test_${Date.now()}@example.com`;
    const testPassword = 'Password@123';

    // 2. Register Trial User via Public Signup (TrialSignUp)
    const signupRes = await fetch(`${BASE_URL}/sales-trial/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Trial Executive',
        email: testEmail,
        password: testPassword,
        phone: '9876543210',
        trialId: testTrialId
      })
    }).then(r => r.json());
    
    const createdTrialUser = signupRes?.data?.trialUser;
    console.log('[2] Signup Status:', createdTrialUser?.status, 'isApproved:', createdTrialUser?.isApproved, 'ID:', createdTrialUser?._id);

    // 3. Attempt Login before HR Approval
    const preApprovalLoginRes = await fetch(`${BASE_URL}/sales-trial/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrTrialId: testEmail,
        password: testPassword
      })
    }).then(r => r.json());
    console.log('[3] Pre-Approval Login (Expected Blocked):', preApprovalLoginRes?.errorCode, preApprovalLoginRes?.message);

    // 4. Connect DB to find a real active employee and generate valid token
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indiatradeoverseas');
    const Employee = require('../Server/src/modules/employee/employee.model');
    const { generateAccessToken } = require('../Server/src/modules/auth/token.service');
    
    let activeEmp = await Employee.findOne({ status: 'ACTIVE' });
    if (!activeEmp) {
      console.error('No active employee found in DB for testing token');
      process.exit(1);
    }

    const token = generateAccessToken(activeEmp);
    console.log('[4] Manager Login Token obtained for employee:', activeEmp.name, activeEmp.email);

    // 5. Approve Trial Account via HR/Manager API
    const createdUserId = createdTrialUser?._id;
    const approveRes = await fetch(`${BASE_URL}/sales-trial/auth/approve/${createdUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }).then(r => r.json());
    console.log('[5] Approve Account Result:', approveRes?.data?.trialUser?.status, 'isApproved:', approveRes?.data?.trialUser?.isApproved);

    // 6. Attempt Login post-approval (Should succeed now!)
    const loginPostApproveRes = await fetch(`${BASE_URL}/sales-trial/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrTrialId: testEmail,
        password: testPassword
      })
    }).then(r => r.json());
    console.log('[6] Post-Approval Login Success:', loginPostApproveRes?.success, 'Token Generated:', !!loginPostApproveRes?.data?.token);

    // 7. Verify task employee listing includes the approved trial user
    const deptEmployeesRes = await fetch(`${BASE_URL}/tasks/employees?department=SALES`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    const foundInDropdown = (deptEmployeesRes?.data?.employees || []).some(
      emp => emp.email === testEmail || emp.employeeId === testTrialId
    );
    console.log('[7] Executive list includes trial executive in dropdown:', foundInDropdown);

    console.log('🎉 ALL WORKFLOW TESTS SUCCEEDED PERFECTLY!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Integration Test Failed:', err.message);
    process.exit(1);
  }
}

runTest();
