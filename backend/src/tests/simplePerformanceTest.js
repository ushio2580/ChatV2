#!/usr/bin/env node

/**
 * Simple Performance Testing Script
 * Tests the chat platform's performance using Node.js built-in modules
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = 'http://localhost:3003';
const CONCURRENT_USERS = 10;
const REQUESTS_PER_USER = 20;
const TEST_DURATION_MS = 30000; // 30 seconds

// Test results
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      reject({ error, responseTime });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject({ error: 'Request timeout', responseTime: 5000 });
    });
    
    req.end();
  });
}

// Test scenarios
const testScenarios = [
  {
    name: 'Get Users',
    url: `${BASE_URL}/api/users`,
    method: 'GET'
  },
  {
    name: 'Get Groups',
    url: `${BASE_URL}/api/groups`,
    method: 'GET'
  },
  {
    name: 'User Login',
    url: `${BASE_URL}/api/auth/login`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@chatplatform.com',
      password: 'admin123'
    })
  },
  {
    name: 'Get Statistics',
    url: `${BASE_URL}/api/admin/statistics`,
    method: 'GET'
  },
  {
    name: 'Get Logs',
    url: `${BASE_URL}/api/admin/logs`,
    method: 'GET'
  }
];

// Simulate a user session
async function simulateUser(userId) {
  const userResults = [];
  
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const scenario = testScenarios[i % testScenarios.length];
    
    try {
      const options = {
        method: scenario.method,
        headers: scenario.headers || {}
      };
      
      const result = await makeRequest(scenario.url, options);
      
      userResults.push({
        scenario: scenario.name,
        success: result.statusCode >= 200 && result.statusCode < 300,
        statusCode: result.statusCode,
        responseTime: result.responseTime
      });
      
    } catch (error) {
      userResults.push({
        scenario: scenario.name,
        success: false,
        error: error.error?.message || error.error,
        responseTime: error.responseTime || 0
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return userResults;
}

// Run performance test
async function runPerformanceTest() {
  console.log('🚀 Starting Performance Test...');
  console.log(`📊 Configuration:`);
  console.log(`   - Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`   - Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`   - Total Requests: ${CONCURRENT_USERS * REQUESTS_PER_USER}`);
  console.log(`   - Test Duration: ${TEST_DURATION_MS}ms`);
  console.log('');
  
  results.startTime = performance.now();
  
  // Create array of user simulation promises
  const userPromises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i));
  }
  
  try {
    // Wait for all users to complete
    const allUserResults = await Promise.all(userPromises);
    
    // Process results
    allUserResults.forEach(userResults => {
      userResults.forEach(result => {
        results.totalRequests++;
        if (result.success) {
          results.successfulRequests++;
          results.responseTimes.push(result.responseTime);
        } else {
          results.failedRequests++;
          results.errors.push({
            scenario: result.scenario,
            error: result.error,
            statusCode: result.statusCode
          });
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
  
  results.endTime = performance.now();
  
  // Generate report
  generateReport();
}

// Generate performance report
function generateReport() {
  const duration = results.endTime - results.startTime;
  const successRate = (results.successfulRequests / results.totalRequests) * 100;
  const avgResponseTime = results.responseTimes.length > 0 ? results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length : 0;
  const minResponseTime = results.responseTimes.length > 0 ? Math.min(...results.responseTimes) : 0;
  const maxResponseTime = results.responseTimes.length > 0 ? Math.max(...results.responseTimes) : 0;
  
  // Calculate percentiles
  const sortedTimes = results.responseTimes.sort((a, b) => a - b);
  const p50 = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.5)] : 0;
  const p95 = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] : 0;
  const p99 = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.99)] : 0;
  
  const requestsPerSecond = results.totalRequests / (duration / 1000);
  
  console.log('\n📈 PERFORMANCE TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`⏱️  Test Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`📊 Total Requests: ${results.totalRequests}`);
  console.log(`✅ Successful: ${results.successfulRequests} (${successRate.toFixed(2)}%)`);
  console.log(`❌ Failed: ${results.failedRequests}`);
  console.log(`🚀 Requests/sec: ${requestsPerSecond.toFixed(2)}`);
  console.log('');
  console.log('📊 RESPONSE TIMES');
  console.log('-'.repeat(30));
  console.log(`⚡ Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`🏃 Min: ${minResponseTime.toFixed(2)}ms`);
  console.log(`🐌 Max: ${maxResponseTime.toFixed(2)}ms`);
  console.log(`📊 50th percentile: ${p50.toFixed(2)}ms`);
  console.log(`📊 95th percentile: ${p95.toFixed(2)}ms`);
  console.log(`📊 99th percentile: ${p99.toFixed(2)}ms`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS');
    console.log('-'.repeat(30));
    const errorSummary = {};
    results.errors.forEach(error => {
      const key = `${error.scenario}: ${error.error || error.statusCode}`;
      errorSummary[key] = (errorSummary[key] || 0) + 1;
    });
    
    Object.entries(errorSummary).forEach(([error, count]) => {
      console.log(`   ${error} (${count} times)`);
    });
  }
  
  // Performance assessment
  console.log('\n🎯 PERFORMANCE ASSESSMENT');
  console.log('-'.repeat(30));
  
  if (successRate >= 99) {
    console.log('✅ Excellent reliability (99%+ success rate)');
  } else if (successRate >= 95) {
    console.log('⚠️  Good reliability (95-99% success rate)');
  } else {
    console.log('❌ Poor reliability (<95% success rate)');
  }
  
  if (avgResponseTime <= 100) {
    console.log('✅ Excellent response time (≤100ms average)');
  } else if (avgResponseTime <= 500) {
    console.log('⚠️  Good response time (100-500ms average)');
  } else {
    console.log('❌ Poor response time (>500ms average)');
  }
  
  if (requestsPerSecond >= 100) {
    console.log('✅ Excellent throughput (≥100 req/s)');
  } else if (requestsPerSecond >= 50) {
    console.log('⚠️  Good throughput (50-100 req/s)');
  } else {
    console.log('❌ Poor throughput (<50 req/s)');
  }
  
  console.log('\n🏁 Test completed!');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted by user');
  if (results.startTime && !results.endTime) {
    results.endTime = performance.now();
    generateReport();
  }
  process.exit(0);
});

// Run the test
if (require.main === module) {
  runPerformanceTest().catch(console.error);
}

module.exports = { runPerformanceTest };
