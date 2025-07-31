#!/usr/bin/env node

/**
 * Health check script for KRAPI backend
 * Can be used in Docker health checks or monitoring systems
 */

const http = require('http');

const HOST = process.env.BACKEND_HOST || 'localhost';
const PORT = process.env.BACKEND_PORT || 4000;

const options = {
  hostname: HOST,
  port: PORT,
  path: '/krapi/k1/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200 && response.success) {
        // Check database health
        if (response.database && response.database.status === 'healthy') {
          console.log('✅ Backend is healthy');
          console.log(`   Database: ${response.database.status}`);
          console.log(`   Version: ${response.version}`);
          process.exit(0);
        } else {
          console.error('❌ Backend is unhealthy');
          if (response.database) {
            console.error('   Database issues:');
            Object.entries(response.database.checks).forEach(([check, result]) => {
              if (!result.status) {
                console.error(`   - ${check}: ${result.message}`);
              }
            });
          }
          process.exit(1);
        }
      } else {
        console.error('❌ Backend returned non-success response');
        console.error(`   Status: ${res.statusCode}`);
        console.error(`   Response: ${data}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to parse health check response');
      console.error(`   Error: ${error.message}`);
      console.error(`   Response: ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Failed to connect to backend');
  console.error(`   Error: ${error.message}`);
  console.error(`   Make sure the backend is running on ${HOST}:${PORT}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();