import axios from 'axios';
import { performance } from 'perf_hooks';

// Configuration
const API_BASE_URL = 'http://localhost:3003';
const CONCURRENT_USERS = 10;
const MESSAGES_PER_USER = 5;
const TEST_DURATION_MS = 30000; // 30 seconds

interface TestResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  statusCode: number;
  error?: string;
}

interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

class PerformanceTester {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  /**
   * Test user login performance
   */
  async testLoginPerformance(): Promise<TestResult[]> {
    console.log('🔐 Testing login performance...');
    const results: TestResult[] = [];
    
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const startTime = performance.now();
      
      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: `testuser${i}@example.com`,
          password: 'testpassword123'
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.push({
          endpoint: '/api/auth/login',
          success: true,
          responseTime,
          statusCode: response.status
        });
        
      } catch (error: any) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.push({
          endpoint: '/api/auth/login',
          success: false,
          responseTime,
          statusCode: error.response?.status || 0,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Test message sending performance
   */
  async testMessagePerformance(): Promise<TestResult[]> {
    console.log('💬 Testing message performance...');
    const results: TestResult[] = [];
    
    // First, get a valid group ID
    let groupId: string;
    try {
      const groupsResponse = await axios.get(`${API_BASE_URL}/api/groups`);
      if (groupsResponse.data.length > 0) {
        groupId = groupsResponse.data[0]._id;
      } else {
        console.log('❌ No groups found for testing');
        return results;
      }
    } catch (error) {
      console.log('❌ Could not fetch groups for testing');
      return results;
    }

    for (let i = 0; i < CONCURRENT_USERS; i++) {
      for (let j = 0; j < MESSAGES_PER_USER; j++) {
        const startTime = performance.now();
        
        try {
          const response = await axios.post(`${API_BASE_URL}/api/messages/group/${groupId}`, {
            content: `Test message ${j} from user ${i}`,
            senderId: `testuser${i}`,
            senderName: `Test User ${i}`
          });
          
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          results.push({
            endpoint: '/api/messages/group',
            success: true,
            responseTime,
            statusCode: response.status
          });
          
        } catch (error: any) {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          results.push({
            endpoint: '/api/messages/group',
            success: false,
            responseTime,
            statusCode: error.response?.status || 0,
            error: error.message
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Test file upload performance
   */
  async testFileUploadPerformance(): Promise<TestResult[]> {
    console.log('📁 Testing file upload performance...');
    const results: TestResult[] = [];
    
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const startTime = performance.now();
      
      try {
        // Create a simple text file for testing
        const testFile = new Blob([`Test file content ${i}`], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', testFile, `testfile${i}.txt`);
        
        const response = await axios.post(`${API_BASE_URL}/api/files/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer test-token-${i}` // This will likely fail, but we're testing performance
          }
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.push({
          endpoint: '/api/files/upload',
          success: true,
          responseTime,
          statusCode: response.status
        });
        
      } catch (error: any) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.push({
          endpoint: '/api/files/upload',
          success: false,
          responseTime,
          statusCode: error.response?.status || 0,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Test database query performance
   */
  async testDatabasePerformance(): Promise<TestResult[]> {
    console.log('🗄️ Testing database performance...');
    const results: TestResult[] = [];
    
    const endpoints = [
      '/api/groups',
      '/api/users',
      '/api/admin/stats'
    ];
    
    for (const endpoint of endpoints) {
      for (let i = 0; i < 5; i++) { // 5 requests per endpoint
        const startTime = performance.now();
        
        try {
          const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            headers: {
              'Authorization': 'Bearer test-token' // This will likely fail, but we're testing performance
            }
          });
          
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          results.push({
            endpoint,
            success: true,
            responseTime,
            statusCode: response.status
          });
          
        } catch (error: any) {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          results.push({
            endpoint,
            success: false,
            responseTime,
            statusCode: error.response?.status || 0,
            error: error.message
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<PerformanceStats> {
    console.log('🚀 Starting performance tests...');
    console.log(`📊 Configuration:`);
    console.log(`   - Concurrent users: ${CONCURRENT_USERS}`);
    console.log(`   - Messages per user: ${MESSAGES_PER_USER}`);
    console.log(`   - Test duration: ${TEST_DURATION_MS}ms`);
    console.log('');

    this.startTime = performance.now();
    
    // Run all tests
    const loginResults = await this.testLoginPerformance();
    const messageResults = await this.testMessagePerformance();
    const fileResults = await this.testFileUploadPerformance();
    const dbResults = await this.testDatabasePerformance();
    
    // Combine all results
    this.results = [
      ...loginResults,
      ...messageResults,
      ...fileResults,
      ...dbResults
    ];
    
    this.endTime = performance.now();
    
    return this.calculateStats();
  }

  /**
   * Calculate performance statistics
   */
  private calculateStats(): PerformanceStats {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = this.results.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    const testDurationSeconds = (this.endTime - this.startTime) / 1000;
    const requestsPerSecond = totalRequests / testDurationSeconds;
    
    const errors = this.results
      .filter(r => !r.success && r.error)
      .map(r => r.error!)
      .filter((error, index, self) => self.indexOf(error) === index); // Remove duplicates
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      minResponseTime: Math.round(minResponseTime * 100) / 100,
      maxResponseTime: Math.round(maxResponseTime * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errors
    };
  }

  /**
   * Print performance report
   */
  printReport(stats: PerformanceStats): void {
    console.log('\n📊 PERFORMANCE TEST RESULTS');
    console.log('============================');
    console.log(`📈 Total Requests: ${stats.totalRequests}`);
    console.log(`✅ Successful: ${stats.successfulRequests} (${Math.round((stats.successfulRequests / stats.totalRequests) * 100)}%)`);
    console.log(`❌ Failed: ${stats.failedRequests} (${Math.round((stats.failedRequests / stats.totalRequests) * 100)}%)`);
    console.log(`⏱️  Average Response Time: ${stats.averageResponseTime}ms`);
    console.log(`⚡ Fastest Response: ${stats.minResponseTime}ms`);
    console.log(`🐌 Slowest Response: ${stats.maxResponseTime}ms`);
    console.log(`🚀 Requests per Second: ${stats.requestsPerSecond}`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎯 PERFORMANCE ANALYSIS:');
    if (stats.averageResponseTime < 100) {
      console.log('   ✅ Excellent response times (< 100ms)');
    } else if (stats.averageResponseTime < 500) {
      console.log('   ✅ Good response times (< 500ms)');
    } else if (stats.averageResponseTime < 1000) {
      console.log('   ⚠️  Acceptable response times (< 1s)');
    } else {
      console.log('   ❌ Slow response times (> 1s) - needs optimization');
    }
    
    if (stats.requestsPerSecond > 10) {
      console.log('   ✅ Good throughput (> 10 req/s)');
    } else if (stats.requestsPerSecond > 5) {
      console.log('   ⚠️  Moderate throughput (> 5 req/s)');
    } else {
      console.log('   ❌ Low throughput (< 5 req/s) - needs optimization');
    }
  }
}

// Export for use
export { PerformanceTester, TestResult, PerformanceStats };
