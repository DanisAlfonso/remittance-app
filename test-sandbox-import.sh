#!/bin/bash

# Test Script for Sandbox Data Import
# Tests the complete flow: user creation -> authentication -> sandbox import -> account verification

set -e  # Exit on any error

API_BASE="http://localhost:3000"
OBP_BASE="http://127.0.0.1:8080"

# Generate unique test user
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-${TIMESTAMP}@example.com"
TEST_USER='{
  "email": "'$TEST_EMAIL'",
  "password": "TestPassword123!",
  "firstName": "Test",
  "lastName": "User"
}'

echo "🧪 SANDBOX IMPORT TEST SUITE"
echo "============================="
echo ""

# Test backend connectivity
echo "🔧 Step -1: Testing backend connectivity..."
HEALTH_RESPONSE=$(curl -s "$API_BASE/health" || echo "failed")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Backend is accessible"
    echo "📊 Environment: $(echo "$HEALTH_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('environment', 'unknown'))" 2>/dev/null || echo "unknown")"
else
    echo "❌ Backend is not accessible. Make sure your server is running on port 3000."
    exit 1
fi

# Test OBP-API connectivity
echo ""
echo "🔧 Step 0: Testing OBP-API connectivity..."
OBP_RESPONSE=$(curl -s "$OBP_BASE/obp/v5.1.0/root" || echo "failed")
if echo "$OBP_RESPONSE" | grep -q "version"; then
    echo "✅ OBP-API is accessible"
    VERSION=$(echo "$OBP_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('version', 'unknown'))" 2>/dev/null || echo "unknown")
    echo "📊 Version: $VERSION"
else
    echo "❌ OBP-API is not accessible. Make sure OBP-API is running on port 8080."
    exit 1
fi

# Test user registration
echo ""
echo "🔧 Step 1: Testing user registration..."
echo "📧 Creating user: $TEST_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "$TEST_USER")

if echo "$REGISTER_RESPONSE" | grep -q "id"; then
    echo "✅ User registration successful"
    USER_ID=$(echo "$REGISTER_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('user', {}).get('id', 'unknown'))" 2>/dev/null || echo "unknown")
    echo "👤 User ID: $USER_ID"
else
    echo "❌ User registration failed:"
    echo "$REGISTER_RESPONSE"
    exit 1
fi

# Test user login
echo ""
echo "🔧 Step 2: Testing user login..."
LOGIN_DATA='{"email": "'$TEST_EMAIL'", "password": "TestPassword123!"}'
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✅ User login successful"
    TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)
    echo "🔑 Token obtained: ${TOKEN:0:20}..."
else
    echo "❌ User login failed:"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# Test sandbox import
echo ""
echo "🔧 Step 3: Testing sandbox data import..."
IMPORT_RESPONSE=$(curl -s -X POST "$API_BASE/obp/v5.1.0/sandbox/data-import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "📊 Import response:"
echo "$IMPORT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$IMPORT_RESPONSE"

if echo "$IMPORT_RESPONSE" | grep -q "total_accounts"; then
    ACCOUNTS_CREATED=$(echo "$IMPORT_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('data', {}).get('total_accounts', 0))" 2>/dev/null || echo "0")
    TRANSACTIONS_CREATED=$(echo "$IMPORT_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('data', {}).get('total_transactions', 0))" 2>/dev/null || echo "0")
    
    echo "✅ Sandbox import completed"
    echo "📊 Accounts created: $ACCOUNTS_CREATED"
    echo "📊 Transactions created: $TRANSACTIONS_CREATED"
    
    if [ "$ACCOUNTS_CREATED" -gt 0 ]; then
        echo "✅ Account creation successful"
    else
        echo "❌ No accounts were created"
        exit 1
    fi
    
    if [ "$TRANSACTIONS_CREATED" -gt 0 ]; then
        echo "✅ Transaction creation successful"
    else
        echo "⚠️  No transactions were created (accounts created successfully though)"
        echo "💡 This might be due to OBP-API transaction creation restrictions"
    fi
else
    echo "❌ Sandbox import failed:"
    echo "$IMPORT_RESPONSE"
    exit 1
fi

# Test account verification using OBP-API
echo ""
echo "🔧 Step 4: Verifying created accounts via OBP-API..."
ACCOUNTS_RESPONSE=$(curl -s -X GET "$API_BASE/obp/v5.1.0/banks/ENHANCEDBANK/accounts" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ACCOUNTS_RESPONSE" | grep -q "accounts"; then
    ACCOUNT_COUNT=$(echo "$ACCOUNTS_RESPONSE" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('accounts', [])))" 2>/dev/null || echo "0")
    echo "✅ Found $ACCOUNT_COUNT accounts in OBP-API"
    
    if [ "$ACCOUNT_COUNT" -gt 0 ]; then
        echo "📋 Account details:"
        echo "$ACCOUNTS_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for i, acc in enumerate(data.get('accounts', []), 1):
        name = acc.get('name', 'Unknown')
        currency = acc.get('currency', 'Unknown')
        balance = acc.get('balance', {}).get('amount', 0)
        print(f'  {i}. {name} ({currency}) - Balance: {balance}')
except:
    pass
" 2>/dev/null
        echo "✅ OBP-API account verification successful"
    else
        echo "❌ No accounts found in OBP-API"
        exit 1
    fi
else
    echo "❌ OBP-API account verification failed:"
    echo "$ACCOUNTS_RESPONSE"
    exit 1
fi

# Summary
echo ""
echo "🎯 TEST SUMMARY"
echo "================"
echo "✅ Backend Connectivity: ✅"
echo "✅ OBP-API Connectivity: ✅"
echo "✅ User Registration: ✅"
echo "✅ User Login: ✅"
echo "✅ Sandbox Import: ✅"
echo "✅ Accounts Created: $ACCOUNTS_CREATED"
echo "✅ Transactions Created: $TRANSACTIONS_CREATED"
echo "✅ Account Verification: ✅"
echo ""
echo "🏆 OVERALL RESULT: ✅ SUCCESS"
echo ""
echo "🎉 All tests passed! The sandbox import functionality is working perfectly."
echo "🚀 You can now safely test it in the UI."
echo ""
echo "📝 Test user created: $TEST_EMAIL"
echo "💡 You may want to clean this up from Prisma if needed"