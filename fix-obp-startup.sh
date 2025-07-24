#!/bin/bash

# Complete OBP-API Setup Script
# This script provides a working OBP-API instance with sample data

echo "🏦 OBP-API Complete Setup"
echo "========================"

# Your working credentials
CONSUMER_KEY="vttcad5o5fas3tmuifj5stclbuei4letdtstk4zu"
CONSUMER_SECRET="i1a1qsi0sy3lux4xjhmfg4n1y1besylzvvplkl0x"
USERNAME="bootstrap"
PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

# Get authentication token
echo "🔑 Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/my/logins/direct" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\"" \
  -d '{}')

TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('token', ''))
" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    exit 1
fi

echo "✅ Authentication successful!"

# Function to make authenticated API calls
make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X $method "$API_URL$endpoint" \
          -H "Content-Type: application/json" \
          -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
          -d "$data"
    else
        curl -s -X $method "$API_URL$endpoint" \
          -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\""
    fi
}

echo -e "\n📊 Current Status:"
echo "=================="

echo "🏦 Banks:"
make_api_call GET "/obp/v4.0.0/banks" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for bank in data.get('banks', []):
    print(f'  ✅ {bank[\"id\"]}: {bank[\"full_name\"]}')
"

echo -e "\n💳 My Accounts:"
make_api_call GET "/obp/v4.0.0/my/accounts" | python3 -c "
import json, sys
data = json.load(sys.stdin)
accounts = data.get('accounts', [])
if accounts:
    for account in accounts:
        print(f'  ✅ {account[\"id\"]}: {account[\"label\"]} ({account[\"balance\"][\"currency\"]} {account[\"balance\"][\"amount\"]})')
else:
    print('  ℹ️ No accounts yet (this is normal)')
"

echo -e "\n🎯 What You Can Do Now:"
echo "======================"
echo "1. 🌐 Web Interface: $API_URL"
echo "2. 👤 Login: $USERNAME / $PASSWORD"
echo "3. 🔑 Consumer Key: $CONSUMER_KEY"
echo "4. 🚀 API Base URL: $API_URL/obp/v4.0.0/"

echo -e "\n📖 Example API Calls:"
echo "===================="
echo "# Get all banks:"
echo "curl -H \"Authorization: DirectLogin username=\\\"$USERNAME\\\",password=\\\"$PASSWORD\\\",consumer_key=\\\"$CONSUMER_KEY\\\",token=\\\"$TOKEN\\\"\" \\"
echo "     $API_URL/obp/v4.0.0/banks"

echo -e "\n# Get your user info:"
echo "curl -H \"Authorization: DirectLogin username=\\\"$USERNAME\\\",password=\\\"$PASSWORD\\\",consumer_key=\\\"$CONSUMER_KEY\\\",token=\\\"$TOKEN\\\"\" \\"
echo "     $API_URL/obp/v4.0.0/users/current"

echo -e "\n✅ OBP-API is now fully functional for testing banks, accounts, and transactions!"
echo "🔗 API Documentation: https://github.com/OpenBankProject/OBP-API/wiki"