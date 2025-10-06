#!/bin/bash

# Simple Performance Testing Script using curl
# Tests the chat platform's performance using curl

BASE_URL="http://localhost:3003"
CONCURRENT_USERS=5
REQUESTS_PER_USER=10

echo "🚀 Starting Simple Performance Test with curl..."
echo "📊 Configuration:"
echo "   - Base URL: $BASE_URL"
echo "   - Concurrent Users: $CONCURRENT_USERS"
echo "   - Requests per User: $REQUESTS_PER_USER"
echo ""

# Create results directory
mkdir -p results
RESULTS_FILE="results/simple_test_$(date +%Y%m%d_%H%M%S).txt"

# Function to make a single request and measure time
make_request() {
    local url="$1"
    local method="$2"
    local data="$3"
    local user_id="$4"
    local request_id="$5"
    
    local start_time=$(date +%s.%N)
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null "$url" 2>/dev/null)
    else
        response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null -X "$method" -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null)
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l)
    
    echo "$user_id,$request_id,$response,$duration" >> "$RESULTS_FILE"
}

# Function to simulate a user session
simulate_user() {
    local user_id="$1"
    
    echo "👤 User $user_id starting session..."
    
    # Test scenarios
    local scenarios=(
        "GET|/api/users"
        "GET|/api/groups"
        "POST|/api/auth/login|{\"email\":\"admin@chatplatform.com\",\"password\":\"admin123\"}"
    )
    
    for ((i=1; i<=REQUESTS_PER_USER; i++)); do
        local scenario_index=$((i % ${#scenarios[@]}))
        local scenario="${scenarios[$scenario_index]}"
        
        IFS='|' read -r method endpoint data <<< "$scenario"
        local url="${BASE_URL}${endpoint}"
        
        make_request "$url" "$method" "$data" "$user_id" "$i"
        
        # Small delay between requests
        sleep 0.1
    done
    
    echo "✅ User $user_id completed session"
}

# Function to run concurrent users
run_concurrent_test() {
    echo "🔄 Starting concurrent user simulation..."
    
    # Start all user simulations in background
    for ((user=1; user<=CONCURRENT_USERS; user++)); do
        simulate_user "$user" &
    done
    
    # Wait for all background processes
    wait
    
    echo "✅ All users completed"
}

# Function to generate report
generate_report() {
    echo ""
    echo "📈 PERFORMANCE TEST RESULTS"
    echo "=========================="
    
    if [ ! -f "$RESULTS_FILE" ]; then
        echo "❌ No results file found"
        return
    fi
    
    # Calculate statistics
    local total_requests=$(wc -l < "$RESULTS_FILE")
    local successful_requests=$(awk -F',' '$3 >= 200 && $3 < 300' "$RESULTS_FILE" | wc -l)
    local failed_requests=$((total_requests - successful_requests))
    local success_rate=$(echo "scale=2; $successful_requests * 100 / $total_requests" | bc -l)
    
    # Calculate response times
    local avg_response_time=$(awk -F',' '{sum+=$4; count++} END {print sum/count}' "$RESULTS_FILE")
    local min_response_time=$(awk -F',' 'BEGIN{min=999999} $4<min{min=$4} END{print min}' "$RESULTS_FILE")
    local max_response_time=$(awk -F',' 'BEGIN{max=0} $4>max{max=$4} END{print max}' "$RESULTS_FILE")
    
    echo "⏱️  Test Duration: ${duration}s"
    echo "📊 Total Requests: $total_requests"
    echo "✅ Successful: $successful_requests ($success_rate%)"
    echo "❌ Failed: $failed_requests"
    echo ""
    echo "📊 RESPONSE TIMES"
    echo "-----------------"
    echo "⚡ Average: ${avg_response_time}s"
    echo "🏃 Min: ${min_response_time}s"
    echo "🐌 Max: ${max_response_time}s"
    
    # Show error summary
    if [ $failed_requests -gt 0 ]; then
        echo ""
        echo "❌ ERROR SUMMARY"
        echo "----------------"
        awk -F',' '$3 < 200 || $3 >= 300 {print $3}' "$RESULTS_FILE" | sort | uniq -c | sort -nr
    fi
    
    # Performance assessment
    echo ""
    echo "🎯 PERFORMANCE ASSESSMENT"
    echo "------------------------"
    
    if (( $(echo "$success_rate >= 99" | bc -l) )); then
        echo "✅ Excellent reliability (99%+ success rate)"
    elif (( $(echo "$success_rate >= 95" | bc -l) )); then
        echo "⚠️  Good reliability (95-99% success rate)"
    else
        echo "❌ Poor reliability (<95% success rate)"
    fi
    
    if (( $(echo "$avg_response_time <= 0.1" | bc -l) )); then
        echo "✅ Excellent response time (≤100ms average)"
    elif (( $(echo "$avg_response_time <= 0.5" | bc -l) )); then
        echo "⚠️  Good response time (100-500ms average)"
    else
        echo "❌ Poor response time (>500ms average)"
    fi
    
    echo ""
    echo "📁 Results saved to: $RESULTS_FILE"
    echo "🏁 Test completed!"
}

# Check if server is running
check_server() {
    echo "🔍 Checking if server is running..."
    if curl -s "$BASE_URL/api/users" > /dev/null 2>&1; then
        echo "✅ Server is running at $BASE_URL"
        return 0
    else
        echo "❌ Server is not running at $BASE_URL"
        echo "Please start the server first:"
        echo "   cd /home/neo/Chatv2/backend && npm run dev"
        return 1
    fi
}

# Main execution
main() {
    echo "🧪 Chat Platform Performance Testing Tool"
    echo "=========================================="
    
    if ! check_server; then
        exit 1
    fi
    
    # Check if bc is installed
    if ! command -v bc &> /dev/null; then
        echo "❌ 'bc' calculator is required but not installed"
        echo "Install it with: sudo apt-get install bc"
        exit 1
    fi
    
    echo "🚀 Starting performance test..."
    run_concurrent_test
    generate_report
}

# Run main function
main "$@"
