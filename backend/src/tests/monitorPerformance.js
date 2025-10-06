#!/usr/bin/env node

/**
 * Real-time Performance Monitoring Script
 * Monitors server performance metrics in real-time
 */

const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = 'http://localhost:3003';
const MONITORING_INTERVAL = 5000; // 5 seconds
const MAX_SAMPLES = 100; // Keep last 100 samples

// Monitoring data
const metrics = {
  responseTimes: [],
  successRates: [],
  errorRates: [],
  throughput: [],
  timestamps: [],
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0
};

// Helper function to make a request and measure performance
async function measureRequest(url, options = {}) {
  const startTime = performance.now();
  
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      reject({ error, responseTime, success: false });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject({ error: 'Timeout', responseTime: 5000, success: false });
    });
    
    req.end();
  });
}

// Test endpoints
const testEndpoints = [
  { name: 'Health Check', url: `${BASE_URL}/api/health`, method: 'GET' },
  { name: 'Get Users', url: `${BASE_URL}/api/users`, method: 'GET' },
  { name: 'Get Groups', url: `${BASE_URL}/api/groups`, method: 'GET' }
];

// Run a monitoring cycle
async function runMonitoringCycle() {
  const cycleStartTime = performance.now();
  const results = [];
  
  // Test each endpoint
  for (const endpoint of testEndpoints) {
    try {
      const result = await measureRequest(endpoint.url, { method: endpoint.method });
      results.push({
        endpoint: endpoint.name,
        ...result
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        ...error
      });
    }
  }
  
  const cycleEndTime = performance.now();
  const cycleDuration = cycleEndTime - cycleStartTime;
  
  // Calculate metrics for this cycle
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  const successRate = (successfulRequests / results.length) * 100;
  const requestsPerSecond = results.length / (cycleDuration / 1000);
  
  // Update global metrics
  metrics.totalRequests += results.length;
  metrics.successfulRequests += successfulRequests;
  metrics.failedRequests += failedRequests;
  
  // Add to rolling window
  metrics.responseTimes.push(avgResponseTime);
  metrics.successRates.push(successRate);
  metrics.errorRates.push(100 - successRate);
  metrics.throughput.push(requestsPerSecond);
  metrics.timestamps.push(new Date().toISOString());
  
  // Keep only last MAX_SAMPLES
  if (metrics.responseTimes.length > MAX_SAMPLES) {
    metrics.responseTimes.shift();
    metrics.successRates.shift();
    metrics.errorRates.shift();
    metrics.throughput.shift();
    metrics.timestamps.shift();
  }
  
  return {
    cycleDuration,
    successfulRequests,
    failedRequests,
    avgResponseTime,
    successRate,
    requestsPerSecond,
    results
  };
}

// Display current metrics
function displayMetrics(cycleResults) {
  console.clear();
  console.log('🔍 REAL-TIME PERFORMANCE MONITORING');
  console.log('====================================');
  console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
  console.log(`🔄 Cycle Duration: ${cycleResults.cycleDuration.toFixed(2)}ms`);
  console.log('');
  
  // Current cycle metrics
  console.log('📊 CURRENT CYCLE');
  console.log('-'.repeat(20));
  console.log(`✅ Successful: ${cycleResults.successfulRequests}`);
  console.log(`❌ Failed: ${cycleResults.failedRequests}`);
  console.log(`📈 Success Rate: ${cycleResults.successRate.toFixed(2)}%`);
  console.log(`⚡ Avg Response Time: ${cycleResults.avgResponseTime.toFixed(2)}ms`);
  console.log(`🚀 Throughput: ${cycleResults.requestsPerSecond.toFixed(2)} req/s`);
  console.log('');
  
  // Historical averages
  if (metrics.responseTimes.length > 0) {
    const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    const avgSuccessRate = metrics.successRates.reduce((a, b) => a + b, 0) / metrics.successRates.length;
    const avgThroughput = metrics.throughput.reduce((a, b) => a + b, 0) / metrics.throughput.length;
    
    console.log('📈 HISTORICAL AVERAGES');
    console.log('-'.repeat(25));
    console.log(`⚡ Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`📊 Success Rate: ${avgSuccessRate.toFixed(2)}%`);
    console.log(`🚀 Throughput: ${avgThroughput.toFixed(2)} req/s`);
    console.log('');
  }
  
  // Overall statistics
  console.log('📊 OVERALL STATISTICS');
  console.log('-'.repeat(25));
  console.log(`📈 Total Requests: ${metrics.totalRequests}`);
  console.log(`✅ Total Successful: ${metrics.successfulRequests}`);
  console.log(`❌ Total Failed: ${metrics.failedRequests}`);
  console.log(`📊 Overall Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log('');
  
  // Performance status
  console.log('🎯 PERFORMANCE STATUS');
  console.log('-'.repeat(25));
  
  if (cycleResults.successRate >= 99) {
    console.log('✅ Excellent reliability');
  } else if (cycleResults.successRate >= 95) {
    console.log('⚠️  Good reliability');
  } else {
    console.log('❌ Poor reliability');
  }
  
  if (cycleResults.avgResponseTime <= 100) {
    console.log('✅ Excellent response time');
  } else if (cycleResults.avgResponseTime <= 500) {
    console.log('⚠️  Good response time');
  } else {
    console.log('❌ Poor response time');
  }
  
  if (cycleResults.requestsPerSecond >= 50) {
    console.log('✅ Good throughput');
  } else {
    console.log('⚠️  Low throughput');
  }
  
  console.log('');
  console.log('Press Ctrl+C to stop monitoring');
}

// Check if server is running
async function checkServer() {
  try {
    const result = await measureRequest(`${BASE_URL}/api/users`);
    return result.success;
  } catch (error) {
    return false;
  }
}

// Main monitoring loop
async function startMonitoring() {
  console.log('🚀 Starting Performance Monitoring...');
  console.log(`📊 Monitoring interval: ${MONITORING_INTERVAL}ms`);
  console.log(`🎯 Target server: ${BASE_URL}`);
  console.log('');
  
  // Check if server is running
  if (!(await checkServer())) {
    console.log('❌ Server is not running or not accessible');
    console.log(`Please start the server at ${BASE_URL}`);
    process.exit(1);
  }
  
  console.log('✅ Server is running, starting monitoring...');
  console.log('');
  
  // Start monitoring loop
  const monitoringInterval = setInterval(async () => {
    try {
      const cycleResults = await runMonitoringCycle();
      displayMetrics(cycleResults);
    } catch (error) {
      console.error('❌ Monitoring cycle failed:', error.message);
    }
  }, MONITORING_INTERVAL);
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n⏹️  Stopping monitoring...');
    clearInterval(monitoringInterval);
    
    // Display final summary
    console.log('\n📊 FINAL SUMMARY');
    console.log('================');
    console.log(`📈 Total Requests: ${metrics.totalRequests}`);
    console.log(`✅ Successful: ${metrics.successfulRequests}`);
    console.log(`❌ Failed: ${metrics.failedRequests}`);
    console.log(`📊 Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
    
    if (metrics.responseTimes.length > 0) {
      const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
      console.log(`⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    }
    
    console.log('\n👋 Monitoring stopped');
    process.exit(0);
  });
}

// Run the monitoring
if (require.main === module) {
  startMonitoring().catch(console.error);
}

module.exports = { startMonitoring, metrics };
