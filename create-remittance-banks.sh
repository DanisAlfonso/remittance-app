#!/bin/bash

# Production Banking Infrastructure Setup
# Creates master account banking structure for international remittance operations

echo "🏦 Creating Remittance Bank Structure..."
echo "======================================"

# Configuration
CONSUMER_KEY="fi4or5r0obmq5mwj2ywpqe52xrazlvxd2myx3y4m"
CONSUMER_SECRET="ybukbktzvc1lpokpbpetjynnemkq4u1e3edop1rw"
OBP_USERNAME="bootstrap"
OBP_PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

echo "🔑 Step 1: Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/my/logins/direct" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$OBP_USERNAME\",password=\"$OBP_PASSWORD\",consumer_key=\"$CONSUMER_KEY\"" \
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
    
    echo -e "\n🏦 Step 2: Creating European Transfer Bank..."
    EUR_BANK_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks" \
      -H "Content-Type: application/json" \
      -H "Authorization: DirectLogin username=\"$OBP_USERNAME\",password=\"$OBP_PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
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
          },
          {
            "scheme": "IBAN",
            "address": "DE**"
          }
        ]
      }')
    
    if echo "$EUR_BANK_RESPONSE" | grep -q "EURBANK"; then
        echo "✅ European Transfer Bank created successfully!"
    else
        echo "❌ Failed to create European bank: $EUR_BANK_RESPONSE"
    fi
    
    echo -e "\n🏦 Step 3: Creating Central American Transfer Bank..."
    HNL_BANK_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks" \
      -H "Content-Type: application/json" \
      -H "Authorization: DirectLogin username=\"$OBP_USERNAME\",password=\"$OBP_PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
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
          },
          {
            "scheme": "IBAN",
            "address": "HN**"
          }
        ]
      }')
    
    if echo "$HNL_BANK_RESPONSE" | grep -q "HNLBANK"; then
        echo "✅ Central American Transfer Bank created successfully!"
    else
        echo "❌ Failed to create Central American bank: $HNL_BANK_RESPONSE"
    fi
    
    echo -e "\n👤 Step 4a: Getting current user ID..."
    USER_RESPONSE=$(curl -s -X GET "$API_URL/obp/v5.1.0/users/current" \
      -H "Authorization: DirectLogin username=\"$OBP_USERNAME\",password=\"$OBP_PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"")
    
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
        
        echo -e "\n🏧 Step 4b: Creating Master EUR Account..."
        EUR_ACCOUNT_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks/EURBANK/accounts" \
          -H "Content-Type: application/json" \
          -H "Authorization: DirectLogin username=\"$OBP_USERNAME\",password=\"$OBP_PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
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
                \"address\": \"DE89370400440000000001\"
              }
            ]
          }")
    
    echo "EUR Account Response: $EUR_ACCOUNT_RESPONSE"
    
        echo -e "\n🏧 Step 5: Creating Master HNL Account..."
        HNL_ACCOUNT_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks/HNLBANK/accounts" \
          -H "Content-Type: application/json" \
          -H "Authorization: DirectLogin username=\"$OBP_USERNAME\",password=\"$OBP_PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
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
    
        echo "HNL Account Response: $HNL_ACCOUNT_RESPONSE"
        
        echo -e "\n📋 Step 6: Verifying bank structure..."
    else
        echo "❌ Failed to get user ID for account creation"
    fi
    
    echo -e "\n📋 Step 7: Final bank verification..."
    curl -s -X GET "$API_URL/obp/v5.1.0/banks" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    banks = data.get('banks', [])
    print(f'✅ Total banks: {len(banks)}')
    for bank in banks:
        print(f'  - {bank[\"id\"]}: {bank[\"full_name\"]}')
except:
    print('❌ Error parsing banks response')
"
    
    echo -e "\n✅ Remittance bank structure setup complete!"
    echo "🎯 Ready for Wise-like architecture implementation."
    
else
    echo "❌ Authentication failed: $TOKEN_RESPONSE"
    echo "💡 You may need to:"
    echo "   1. Verify bootstrap user exists and is activated"
    echo "   2. Check if DirectLogin is enabled"
    echo "   3. Ensure consumer key is correct"
    echo "   4. Try using OAuth instead of DirectLogin"
fi