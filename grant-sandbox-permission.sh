#!/bin/bash

# Grant CanCreateSandbox permission to bootstrap user
# This script will grant the necessary permission for sandbox data import

echo "🔑 Granting CanCreateSandbox permission to bootstrap user..."
echo "============================================================="

# Your OBP-API credentials
CONSUMER_KEY="vttcad5o5fas3tmuifj5stclbuei4letdtstk4zu"
CONSUMER_SECRET="i1a1qsi0sy3lux4xjhmfg4n1y1besylzvvplkl0x"
USERNAME="bootstrap"
PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

echo "🔍 Step 1: Testing OBP-API connectivity..."
ROOT_RESPONSE=$(curl -s "$API_URL/obp/v5.1.0/root")
if echo "$ROOT_RESPONSE" | grep -q "version"; then
    echo "✅ OBP-API is running"
else
    echo "❌ OBP-API is not accessible at $API_URL"
    echo "Response: $ROOT_RESPONSE"
    exit 1
fi

echo -e "\n🔑 Step 2: Getting Direct Login Token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/my/logins/direct" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\"" \
  -d '{}')

echo "Token Response: $TOKEN_RESPONSE"

# Check if we got a token or an error
if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('token', ''))
except:
    print('')
")
    echo "✅ Got Direct Login Token: ${TOKEN:0:20}..."
    
    echo -e "\n👤 Step 3: Getting current user ID..."
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
        
        echo -e "\n🎯 Step 4: Granting CanCreateSandbox role..."
        ENTITLEMENT_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
          -H "Content-Type: application/json" \
          -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
          -d '{
            "role_name": "CanCreateSandbox",
            "bank_id": ""
          }')
        
        echo "Entitlement Response: $ENTITLEMENT_RESPONSE"
        
        if echo "$ENTITLEMENT_RESPONSE" | grep -q "CanCreateSandbox"; then
            echo "✅ CanCreateSandbox role granted successfully!"
        else
            echo "⚠️  Role might already exist or there was an issue"
        fi
        
        echo -e "\n🎯 Step 5: Also granting CanCreateSandboxDataImport role..."
        IMPORT_ENTITLEMENT_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
          -H "Content-Type: application/json" \
          -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
          -d '{
            "role_name": "CanCreateSandboxDataImport",
            "bank_id": ""
          }')
        
        echo "Import Entitlement Response: $IMPORT_ENTITLEMENT_RESPONSE"
        
        echo -e "\n🔍 Step 6: Verifying current entitlements..."
        ENTITLEMENTS_RESPONSE=$(curl -s -X GET "$API_URL/obp/v5.1.0/users/$USER_ID/entitlements" \
          -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"")
        
        echo "Current Entitlements:"
        echo "$ENTITLEMENTS_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'list' in data:
        entitlements = data['list']
        print(f'✅ User has {len(entitlements)} entitlements:')
        for ent in entitlements:
            print(f'  - {ent.get(\"role_name\", \"Unknown\")}')
    else:
        print('❌ Could not parse entitlements')
        print(data)
except Exception as e:
    print(f'❌ Error parsing response: {e}')
"
        
        echo -e "\n✅ Setup complete! You can now use sandbox data import."
        echo "🔗 Try your app's 'Import Test Data' button now."
        
    else
        echo "❌ Failed to get user info. Response: $USER_RESPONSE"
    fi
    
else
    echo "❌ Failed to get token. This might be because:"
    echo "  1. The bootstrap user doesn't exist"
    echo "  2. The credentials are incorrect"
    echo "  3. OBP-API needs to be restarted"
    echo ""
    echo "💡 Let's try to create the bootstrap user..."
    
    # Try to create the bootstrap user
    echo -e "\n👤 Creating bootstrap user..."
    CREATE_USER_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/users" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "bootstrap@example.com",
        "username": "bootstrap",
        "password": "BootstrapPass123!",
        "first_name": "Bootstrap",
        "last_name": "User"
      }')
    
    echo "Create User Response: $CREATE_USER_RESPONSE"
fi

echo -e "\n🏁 Script completed."