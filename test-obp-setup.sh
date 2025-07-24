#!/bin/bash

# OBP-API Local Testing Script
# This script tests your local OBP-API instance and creates sample banking data

echo "🏦 Testing OBP-API Local Instance..."
echo "=================================="

# Your credentials
CONSUMER_KEY="vttcad5o5fas3tmuifj5stclbuei4letdtstk4zu"
CONSUMER_SECRET="i1a1qsi0sy3lux4xjhmfg4n1y1besylzvvplkl0x"
USERNAME="bootstrap"
PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

echo "🔍 Step 1: Testing API Root..."
curl -s "$API_URL/obp/v4.0.0/root" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'✅ API Version: {data[\"version\"]}')
print(f'✅ Status: {data[\"version_status\"]}')
print(f'✅ Hostname: {data[\"hostname\"]}')
"

echo -e "\n🔑 Step 2: Getting Direct Login Token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/my/logins/direct" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\"" \
  -d '{}')

echo "Token Response: $TOKEN_RESPONSE"

# Check if we got a token
if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('token', ''))
")
    echo "✅ Got Direct Login Token: $TOKEN"
    
    echo -e "\n🏦 Step 3: Testing Authenticated API Call..."
    curl -s -X GET "$API_URL/obp/v4.0.0/banks" \
      -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" | \
      python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'banks' in data:
    print(f'✅ Found {len(data[\"banks\"])} banks')
    for bank in data['banks']:
        print(f'  - {bank[\"id\"]}: {bank[\"full_name\"]}')
else:
    print('❌ Error:', data)
"
else
    echo "❌ Failed to get token. Response: $TOKEN_RESPONSE"
    echo -e "\n🔧 Let's try a different approach..."
    
    echo -e "\n📋 Available endpoints that might work without full authentication:"
    echo "1. Banks: $API_URL/obp/v4.0.0/banks"
    echo "2. Bank OBP branches: $API_URL/obp/v4.0.0/banks/OBP/branches"  
    echo "3. Bank OBP ATMs: $API_URL/obp/v4.0.0/banks/OBP/atms"
    echo "4. Bank OBP products: $API_URL/obp/v4.0.0/banks/OBP/products"
    
    echo -e "\n🏦 Testing basic endpoints..."
    echo "Banks:"
    curl -s "$API_URL/obp/v4.0.0/banks" | python3 -m json.tool
fi

echo -e "\n✅ OBP-API is running and accessible!"
echo "🔗 Web Interface: $API_URL"
echo "🔑 Consumer Key: $CONSUMER_KEY"
echo "👤 Username: $USERNAME"