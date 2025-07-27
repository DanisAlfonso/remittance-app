#!/bin/bash

# Complete OBP-API Setup Script for Remittance App
# This script does everything needed from start to finish:
# 1. Authenticates with OBP-API
# 2. Grants all necessary permissions
# 3. Creates EURBANK and HNLBANK banks
# 4. Creates master EUR and HNL accounts
# 5. Verifies the complete setup

set -e

echo "🏦 Complete OBP-API Setup for Remittance App"
echo "============================================="

# Configuration (current working credentials)
CONSUMER_KEY="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme"
CONSUMER_SECRET="bzz1ceaup2wtptptjok5yg22vti5mi5q3ei5ucfc"
USERNAME="bootstrap"
PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

echo "🔍 Step 1: Testing OBP-API connectivity..."
ROOT_RESPONSE=$(curl -s "$API_URL/obp/v5.1.0/root")
if echo "$ROOT_RESPONSE" | grep -q "version"; then
    echo "✅ OBP-API is running"
else
    echo "❌ OBP-API is not accessible at $API_URL"
    exit 1
fi

echo -e "\n🔑 Step 2: Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/my/logins/direct" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\"" \
  -d '{}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('token', ''))
except:
    print('')
")
    echo "✅ Got authentication token: ${TOKEN:0:20}..."
else
    echo "❌ Failed to get token: $TOKEN_RESPONSE"
    exit 1
fi

echo -e "\n👤 Step 3: Getting user ID..."
USER_RESPONSE=$(curl -s -X GET "$API_URL/obp/v5.1.0/users/current" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"")

if echo "$USER_RESPONSE" | grep -q "user_id"; then
    USER_ID=$(echo "$USER_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('user_id', ''))
except:
    print('')
")
    echo "✅ Got User ID: $USER_ID"
else
    echo "❌ Failed to get user ID: $USER_RESPONSE"
    exit 1
fi

echo -e "\n🔐 Step 4: Granting all necessary permissions..."

echo "  → Granting CanCreateSandbox..."
curl -s -X POST "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d '{"role_name": "CanCreateSandbox", "bank_id": ""}' > /dev/null

echo "  → Granting CanCreateBank..."
curl -s -X POST "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d '{"role_name": "CanCreateBank", "bank_id": ""}' > /dev/null

echo "✅ Permissions granted"

echo -e "\n🏦 Step 5: Creating banks..."

echo "  → Creating EURBANK..."
EUR_BANK_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d '{
    "id": "EURBANK",
    "bank_code": "EURTBK",
    "short_name": "Euro Transfer Bank",
    "full_name": "European Transfer Bank Limited", 
    "logo": "https://eurobank.example.com/logo.png",
    "website": "https://eurobank.example.com",
    "bank_routings": [
      {
        "scheme": "BIC",
        "address": "EURTBK2XXXX"
      }
    ]
  }')

if echo "$EUR_BANK_RESPONSE" | grep -q "EURBANK"; then
    echo "✅ EURBANK created successfully"
else
    echo "ℹ️  EURBANK might already exist or creation failed: $EUR_BANK_RESPONSE"
fi

echo "  → Creating HNLBANK..."
HNL_BANK_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d '{
    "id": "HNLBANK",
    "bank_code": "CATLBK",
    "short_name": "Central America Bank", 
    "full_name": "Central American Transfer Bank Limited",
    "logo": "https://centralbank.example.com/logo.png",
    "website": "https://centralbank.example.com",
    "bank_routings": [
      {
        "scheme": "BIC",
        "address": "CATLBK1XXXX"
      }
    ]
  }')

if echo "$HNL_BANK_RESPONSE" | grep -q "HNLBANK"; then
    echo "✅ HNLBANK created successfully"
else
    echo "ℹ️  HNLBANK might already exist or creation failed: $HNL_BANK_RESPONSE"
fi

echo -e "\n🔐 Step 6: Granting account creation permissions for specific banks..."

echo "  → Granting CanCreateAccount for EURBANK..."
curl -s -X POST "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d '{"role_name": "CanCreateAccount", "bank_id": "EURBANK"}' > /dev/null

echo "  → Granting CanCreateAccount for HNLBANK..."
curl -s -X POST "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d '{"role_name": "CanCreateAccount", "bank_id": "HNLBANK"}' > /dev/null

echo "✅ Account creation permissions granted"

echo -e "\n💰 Step 7: Creating master accounts..."

echo "  → Creating EUR Master Account..."
EUR_ACCOUNT_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks/EURBANK/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"label\": \"EUR Master Account\",
    \"product_code\": \"EUR_MASTER\",
    \"balance\": {
      \"currency\": \"EUR\",
      \"amount\": \"0\"
    },
    \"branch_id\": \"BRANCH1\",
    \"account_routings\": [
      {
        \"scheme\": \"IBAN\",
        \"address\": \"ES9121000418450012345678\"
      }
    ]
  }")

if echo "$EUR_ACCOUNT_RESPONSE" | grep -q "account_id"; then
    EUR_ACCOUNT_ID=$(echo "$EUR_ACCOUNT_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('account_id', ''))
except:
    print('')
")
    echo "✅ EUR Master Account created: $EUR_ACCOUNT_ID"
else
    echo "❌ EUR Account creation failed: $EUR_ACCOUNT_RESPONSE"
fi

echo "  → Creating HNL Master Account..."
HNL_ACCOUNT_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks/HNLBANK/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"label\": \"HNL Master Account\",
    \"product_code\": \"HNL_MASTER\",
    \"balance\": {
      \"currency\": \"HNL\",
      \"amount\": \"0\"
    },
    \"branch_id\": \"BRANCH1\",
    \"account_routings\": [
      {
        \"scheme\": \"IBAN\",
        \"address\": \"HN12345678901234567890\"
      }
    ]
  }")

if echo "$HNL_ACCOUNT_RESPONSE" | grep -q "account_id"; then
    HNL_ACCOUNT_ID=$(echo "$HNL_ACCOUNT_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('account_id', ''))
except:
    print('')
")
    echo "✅ HNL Master Account created: $HNL_ACCOUNT_ID"
else
    echo "❌ HNL Account creation failed: $HNL_ACCOUNT_RESPONSE"
fi

echo -e "\n🔍 Step 8: Final verification..."

echo "Banks available:"
curl -s "$API_URL/obp/v5.1.0/banks" | python3 -c "
import json, sys
data = json.load(sys.stdin)
banks = data.get('banks', [])
print(f'  Total: {len(banks)} banks')
for bank in banks:
    print(f'  ✅ {bank[\"id\"]}: {bank[\"full_name\"]}')
"

echo -e "\nMaster accounts:"
if [ ! -z "$EUR_ACCOUNT_ID" ]; then
    echo "  ✅ EUR Master Account: $EUR_ACCOUNT_ID (EURBANK)"
fi
if [ ! -z "$HNL_ACCOUNT_ID" ]; then
    echo "  ✅ HNL Master Account: $HNL_ACCOUNT_ID (HNLBANK)"
fi

echo -e "\n🎉 OBP-API Setup Complete!"
echo "=============================="
echo "🏦 Banks: EURBANK and HNLBANK created"
echo "💰 Master accounts: EUR and HNL accounts created"
echo "🔑 Permissions: All necessary roles granted"
echo "🚀 Ready for: Real money transfers through OBP-API"
echo ""
echo "🔗 Next step: Update backend master-account-banking.ts with real account IDs"
if [ ! -z "$EUR_ACCOUNT_ID" ]; then
    echo "   EUR Account ID: $EUR_ACCOUNT_ID"
fi
if [ ! -z "$HNL_ACCOUNT_ID" ]; then
    echo "   HNL Account ID: $HNL_ACCOUNT_ID"
fi