# Performance Testing Guide

This directory contains performance testing tools for the Chat Platform. Since Artillery requires Node.js 22+ and you have Node.js 18.19.1, we've created alternative testing solutions.

## 🧪 Available Testing Tools

### 1. **Simple Performance Test (Node.js)**
- **File**: `simplePerformanceTest.js`
- **Description**: Basic performance testing using Node.js built-in modules
- **Features**: Concurrent users, response time measurement, success rate calculation

**Usage:**
```bash
cd /home/neo/Chatv2/backend
node src/tests/simplePerformanceTest.js
```

### 2. **Curl Performance Test (Shell)**
- **File**: `curlPerformanceTest.sh`
- **Description**: Performance testing using curl and shell scripts
- **Features**: Multiple test scenarios, load testing, stress testing

**Usage:**
```bash
cd /home/neo/Chatv2/backend
./src/tests/curlPerformanceTest.sh
```

### 3. **Real-time Performance Monitor**
- **File**: `monitorPerformance.js`
- **Description**: Real-time performance monitoring
- **Features**: Live metrics, historical data, performance alerts

**Usage:**
```bash
cd /home/neo/Chatv2/backend
node src/tests/monitorPerformance.js
```

## 🚀 Quick Start

### Prerequisites
1. **Start the server:**
   ```bash
   cd /home/neo/Chatv2/backend
   npm run dev
   ```

2. **Install required tools (if needed):**
   ```bash
   # For curl performance test
   sudo apt-get install bc
   ```

### Running Tests

#### Option 1: Quick Test
```bash
# Simple Node.js test
node src/tests/simplePerformanceTest.js

# Curl-based test
./src/tests/curlPerformanceTest.sh
```

#### Option 2: Real-time Monitoring
```bash
# Start monitoring
node src/tests/monitorPerformance.js
```

## 📊 Test Scenarios

### 1. **Basic Performance Test**
- **Users**: 10 concurrent
- **Requests**: 20 per user
- **Endpoints**: Health, Users, Groups, Auth
- **Duration**: ~30 seconds

### 2. **Load Test**
- **Users**: 1, 2, 5, 10, 15, 20 (increasing)
- **Requests**: 10 per user
- **Purpose**: Find breaking point

### 3. **Stress Test**
- **Users**: 50 concurrent
- **Requests**: 20 per user
- **Purpose**: Test system limits

### 4. **Real-time Monitoring**
- **Interval**: 5 seconds
- **Duration**: Continuous
- **Purpose**: Live performance tracking

## 📈 Metrics Measured

### **Response Time Metrics**
- **Average**: Mean response time
- **Min/Max**: Fastest/slowest responses
- **Percentiles**: 50th, 95th, 99th percentiles

### **Reliability Metrics**
- **Success Rate**: Percentage of successful requests
- **Error Rate**: Percentage of failed requests
- **Error Types**: HTTP status codes and error messages

### **Throughput Metrics**
- **Requests/Second**: System capacity
- **Concurrent Users**: User load capacity
- **Response Time**: System responsiveness

## 🎯 Performance Benchmarks

### **Excellent Performance**
- **Success Rate**: ≥99%
- **Response Time**: ≤100ms average
- **Throughput**: ≥100 req/s

### **Good Performance**
- **Success Rate**: 95-99%
- **Response Time**: 100-500ms average
- **Throughput**: 50-100 req/s

### **Poor Performance**
- **Success Rate**: <95%
- **Response Time**: >500ms average
- **Throughput**: <50 req/s

## 🔧 Customizing Tests

### **Modify Test Parameters**
Edit the configuration variables in each script:

```javascript
// simplePerformanceTest.js
const CONCURRENT_USERS = 10;
const REQUESTS_PER_USER = 20;
const TEST_DURATION_MS = 30000;
```

```bash
# curlPerformanceTest.sh
CONCURRENT_USERS=5
REQUESTS_PER_USER=10
TEST_DURATION=30
```

### **Add Custom Endpoints**
Add new test scenarios to the `testScenarios` array:

```javascript
const testScenarios = [
  {
    name: 'Custom Endpoint',
    url: `${BASE_URL}/api/custom`,
    method: 'GET'
  }
];
```

## 📊 Interpreting Results

### **Response Time Analysis**
- **<100ms**: Excellent (real-time feel)
- **100-500ms**: Good (acceptable for most use cases)
- **>500ms**: Poor (user experience issues)

### **Success Rate Analysis**
- **≥99%**: Excellent (production ready)
- **95-99%**: Good (minor issues)
- **<95%**: Poor (significant problems)

### **Throughput Analysis**
- **≥100 req/s**: Excellent (high capacity)
- **50-100 req/s**: Good (moderate capacity)
- **<50 req/s**: Poor (low capacity)

## 🚨 Troubleshooting

### **Common Issues**

#### 1. **Server Not Running**
```
❌ Server is not running at http://localhost:3003
```
**Solution**: Start the server first
```bash
cd /home/neo/Chatv2/backend && npm run dev
```

#### 2. **Permission Denied**
```
❌ Permission denied
```
**Solution**: Make scripts executable
```bash
chmod +x src/tests/curlPerformanceTest.sh
```

#### 3. **Missing Dependencies**
```
❌ 'bc' calculator is required
```
**Solution**: Install missing tools
```bash
sudo apt-get install bc
```

#### 4. **High Response Times**
- Check server resources (CPU, memory)
- Check database performance
- Check network latency
- Check for blocking operations

#### 5. **High Error Rates**
- Check server logs
- Check database connections
- Check authentication issues
- Check rate limiting

## 📁 Results Storage

### **Output Files**
- **Node.js tests**: Console output only
- **Curl tests**: Saved to `results/` directory
- **Monitoring**: Real-time display

### **Results Format**
```
results/performance_YYYYMMDD_HHMMSS.txt
results/load_test_X_users_YYYYMMDD_HHMMSS.txt
results/stress_test_YYYYMMDD_HHMMSS.txt
```

### **Results Structure**
```
user_id,request_id,http_code,response_time
1,1,200,0.123
1,2,200,0.145
...
```

## 🔄 Continuous Testing

### **Automated Testing**
Create a cron job for regular testing:

```bash
# Add to crontab
0 */6 * * * cd /home/neo/Chatv2/backend && node src/tests/simplePerformanceTest.js
```

### **CI/CD Integration**
Add performance tests to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Performance Test
  run: |
    cd backend
    node src/tests/simplePerformanceTest.js
```

## 📚 Advanced Testing

### **Database Performance**
Monitor MongoDB performance during tests:
```bash
# MongoDB monitoring
mongosh --eval "db.serverStatus()"
```

### **Memory Usage**
Monitor Node.js memory usage:
```bash
# Memory monitoring
node --inspect src/tests/simplePerformanceTest.js
```

### **Network Analysis**
Use network tools to analyze traffic:
```bash
# Network monitoring
netstat -an | grep 3003
ss -tuln | grep 3003
```

## 🎯 Best Practices

### **Before Testing**
1. **Clean Environment**: Restart server, clear caches
2. **Baseline Metrics**: Record normal performance
3. **Resource Monitoring**: Monitor CPU, memory, disk
4. **Database Optimization**: Ensure indexes are in place

### **During Testing**
1. **Gradual Load**: Start with low load, increase gradually
2. **Monitor Resources**: Watch for resource exhaustion
3. **Log Analysis**: Monitor server logs for errors
4. **Real-time Monitoring**: Use monitoring tools

### **After Testing**
1. **Result Analysis**: Analyze performance metrics
2. **Bottleneck Identification**: Find performance bottlenecks
3. **Optimization**: Implement performance improvements
4. **Documentation**: Document findings and improvements

## 🚀 Performance Optimization Tips

### **Server Optimization**
- **Connection Pooling**: Optimize database connections
- **Caching**: Implement Redis caching
- **Compression**: Enable gzip compression
- **Static Files**: Use CDN for static assets

### **Database Optimization**
- **Indexes**: Add proper database indexes
- **Query Optimization**: Optimize database queries
- **Connection Limits**: Set appropriate connection limits
- **Monitoring**: Use database monitoring tools

### **Application Optimization**
- **Code Profiling**: Profile application code
- **Memory Management**: Optimize memory usage
- **Async Operations**: Use async/await properly
- **Error Handling**: Implement proper error handling

## 📞 Support

If you encounter issues with performance testing:

1. **Check Server Logs**: Look for error messages
2. **Verify Configuration**: Ensure all settings are correct
3. **Test Individual Components**: Test each component separately
4. **Resource Monitoring**: Check system resources
5. **Documentation**: Refer to this guide and server documentation

## 🔗 Related Documentation

- [Server Architecture](../README.md)
- [Database Models](../models/README.md)
- [API Documentation](../routes/README.md)
- [Deployment Guide](../../../README.md)

---

**Happy Testing! 🚀**
