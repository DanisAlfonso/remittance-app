#!/bin/bash

# Grant CanCreateAccount permission for specific banks
echo "🔑 Granting CanCreateAccount permissions for remittance banks..."
echo "============================================================="

# Configuration
CONSUMER_KEY="fi4or5r0obmq5mwj2ywpqe52xrazlvxd2myx3y4m"
CONSUMER_SECRET="ybukbktzvc1lpokpbpetjynnemkq4u1e3edop1rw"
USERNAME="bootstrap"
PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

echo "🔑 Step 1: Getting authentication token..."
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
    
    echo -e "\n👤 Step 2: Getting current user ID..."
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
        
        echo -e "\n🎯 Step 3: Granting CanCreateAccount for EURBANK..."
        EUR_ENTITLEMENT_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
          -H "Content-Type: application/json" \
          -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
          -d '{
            "role_name": "CanCreateAccount",
            "bank_id": "EURBANK"
          }')
        
        echo "EUR Account Permission Response: $EUR_ENTITLEMENT_RESPONSE"
        
        echo -e "\n🎯 Step 4: Granting CanCreateAccount for HNLBANK..."
        HNL_ENTITLEMENT_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
          -H "Content-Type: application/json" \
          -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
          -d '{
            "role_name": "CanCreateAccount",
            "bank_id": "HNLBANK"
          }')
        
        echo "HNL Account Permission Response: $HNL_ENTITLEMENT_RESPONSE"
        
        echo -e "\n✅ Account creation permissions granted!"
        echo "🏦 You can now create accounts in EURBANK and HNLBANK"
        
    else
        echo "❌ Failed to get user info. Response: $USER_RESPONSE"
    fi
    
else
    echo "❌ Failed to get token: $TOKEN_RESPONSE"
fi

echo -e "\n🏁 Account permissions script completed."