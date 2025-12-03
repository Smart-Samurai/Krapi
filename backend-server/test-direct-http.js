/* eslint-disable no-undef */
/**
 * Direct HTTP Test - Bypass SDK
 * 
 * This script makes a direct HTTP call to the backend POST /krapi/k1/projects
 * to test if the error occurs without the SDK.
 */

const http = require('http');

// Get session token from environment or use test token
const sessionToken = process.env.SESSION_TOKEN || 'test-token';

const postData = JSON.stringify({
  name: 'Direct HTTP Test Project',
  description: 'Testing direct HTTP call',
});

const options = {
  hostname: '127.0.0.1',
  port: 3470,
  path: '/krapi/k1/projects',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': `Bearer ${sessionToken}`,
    // Explicitly NOT sending X-Project-ID header
  },
};

console.log('🔍 [DIRECT HTTP TEST] Making request:', {
  method: options.method,
  path: options.path,
  headers: {
    'Authorization': 'Bearer [REDACTED]',
    'X-Project-ID': options.headers['X-Project-ID'] || 'NOT SET',
  },
});

const req = http.request(options, (res) => {
  console.log(`📥 [DIRECT HTTP TEST] Response status: ${res.statusCode}`);
  console.log(`📥 [DIRECT HTTP TEST] Response headers:`, res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 [DIRECT HTTP TEST] Response body:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('📥 [DIRECT HTTP TEST] Parsed response:', JSON.stringify(parsed, null, 2));
      
      if (parsed.error === 'Project ID is required') {
        console.log('❌ [DIRECT HTTP TEST] ERROR: Backend returned "Project ID is required"');
        console.log('   This means the error is coming from BACKEND, not SDK!');
      } else if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('✅ [DIRECT HTTP TEST] SUCCESS: Request succeeded without project ID');
      } else {
        console.log(`⚠️  [DIRECT HTTP TEST] Unexpected response: ${res.statusCode}`);
      }
    } catch (e) {
      console.log('❌ [DIRECT HTTP TEST] Failed to parse response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ [DIRECT HTTP TEST] Request error:', e.message);
});

req.write(postData);
req.end();






