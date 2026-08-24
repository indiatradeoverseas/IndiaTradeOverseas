const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/india-trade-overseas';

async function run() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to DB');

    const Employee = require('./src/modules/employee/employee.model');

    const employee = await Employee.findOne({ name: /Vikram/i }) || await Employee.findOne({ fullName: /Vikram/i });

    console.log('--- EMPLOYEE INFO ---');
    console.log('Found:', !!employee);
    if (employee) {
      console.log('Document:', JSON.stringify(employee, null, 2));
    }

    // List all sales department employees
    const salesEmployees = await Employee.find({ department: 'SALES' });
    console.log('--- ALL SALES EMPLOYEES ---');
    salesEmployees.forEach(e => {
      console.log('ID:', e._id, 'Name:', e.name, 'Role:', e.role, 'Status:', e.status, 'Department:', e.department);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
