#!/bin/bash

echo "Testing KRAPI Project API..."
echo "==============================="

# Base URL
BASE_URL="http://localhost:3470/krapi/k1"

# Test credentials
TEST_USER="admin"
TEST_PASS="admin123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local description=$5
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    if [ -z "$data" ]; then
        if [ -z "$token" ]; then
            response=$(curl -s -X $method "$BASE_URL$endpoint" -H "Content-Type: application/json")
        else
            response=$(curl -s -X $method "$BASE_URL$endpoint" -H "Content-Type: application/json" -H "Authorization: Bearer $token")
        fi
    else
        if [ -z "$token" ]; then
            response=$(curl -s -X $method "$BASE_URL$endpoint" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -X $method "$BASE_URL$endpoint" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$data")
        fi
    fi
    
    echo "Response: $response"
    
    # Check if response contains success:true
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Test passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Test failed${NC}"
        return 1
    fi
}

# Step 1: Test health endpoint
echo -e "\n${YELLOW}1. Testing Health Endpoint${NC}"
health_response=$(curl -s "$BASE_URL/../../../health")
echo "Health Response: $health_response"
if echo "$health_response" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✓ Server is healthy${NC}"
else
    echo -e "${RED}✗ Server health check failed${NC}"
    echo "Attempting to check database status..."
fi

# Step 2: Login to get auth token
echo -e "\n${YELLOW}2. Testing Login${NC}"
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

echo "Login Response: $login_response"

# Extract token
TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Login failed - no token received${NC}"
    echo "Creating default admin user..."
    
    # Try to create admin user
    create_admin_response=$(curl -s -X POST "$BASE_URL/auth/setup" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","email":"admin@example.com","password":"admin123"}')
    
    echo "Create Admin Response: $create_admin_response"
    
    # Try login again
    login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")
    
    TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Token: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ Failed to obtain auth token${NC}"
    exit 1
fi

# Step 3: Test project listing
test_endpoint "GET" "/projects" "" "$TOKEN" "List all projects"

# Step 4: Create a new project
PROJECT_DATA='{"name":"Test Project","description":"Created by test script"}'
test_endpoint "POST" "/projects" "$PROJECT_DATA" "$TOKEN" "Create new project"

# Extract project ID from response
create_response=$(curl -s -X POST "$BASE_URL/projects" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$PROJECT_DATA")

PROJECT_ID=$(echo "$create_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$PROJECT_ID" ]; then
    echo -e "${GREEN}✓ Project created with ID: $PROJECT_ID${NC}"
    
    # Step 5: Get project by ID
    test_endpoint "GET" "/projects/$PROJECT_ID" "" "$TOKEN" "Get project by ID"
    
    # Step 6: Update project
    UPDATE_DATA='{"description":"Updated by test script","active":true}'
    test_endpoint "PUT" "/projects/$PROJECT_ID" "$UPDATE_DATA" "$TOKEN" "Update project"
    
    # Step 7: Get project stats
    test_endpoint "GET" "/projects/$PROJECT_ID/stats" "" "$TOKEN" "Get project statistics"
fi

# Step 8: Test database health
if [ -n "$TOKEN" ]; then
    echo -e "\n${YELLOW}Testing Database Health${NC}"
    db_health_response=$(curl -s -X GET "$BASE_URL/admin/system/db-health" \
        -H "Authorization: Bearer $TOKEN")
    echo "Database Health Response: $db_health_response"
fi

echo -e "\n${YELLOW}===============================${NC}"
echo -e "${YELLOW}Test Summary:${NC}"
echo "All critical project operations have been tested."
echo "Check the responses above for any errors."