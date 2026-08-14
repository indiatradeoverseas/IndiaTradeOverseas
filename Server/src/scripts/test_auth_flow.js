const http = require('http');

const email = 'manjeetmaurya7785@gmail.com';
const password = 'Password123!';

function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: responseBody ? JSON.parse(responseBody) : null
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

function getRequest(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: responseBody ? JSON.parse(responseBody) : null
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function run() {
  try {
    console.log('1. Attempting login for', email);
    const loginRes = await postRequest('http://localhost:5000/api/employee/auth/login', { email, password });
    console.log('Login Response Status:', loginRes.status);
    console.log('Login Response Body:', JSON.stringify(loginRes.body, null, 2));

    if (loginRes.status !== 200 || !loginRes.body?.data?.token) {
      console.error('Login failed!');
      process.exit(1);
    }

    const token = loginRes.body.data.token;

    console.log('\n2. Attempting GET /api/auth/me');
    const meRes = await getRequest('http://localhost:5000/api/auth/me', token);
    console.log('GET /api/auth/me Status:', meRes.status);
    console.log('GET /api/auth/me Body:', JSON.stringify(meRes.body, null, 2));

    console.log('\n3. Attempting GET /api/employee/me');
    const empMeRes = await getRequest('http://localhost:5000/api/employee/me', token);
    console.log('GET /api/employee/me Status:', empMeRes.status);
    console.log('GET /api/employee/me Body:', JSON.stringify(empMeRes.body, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err.message);
    process.exit(1);
  }
}

run();
