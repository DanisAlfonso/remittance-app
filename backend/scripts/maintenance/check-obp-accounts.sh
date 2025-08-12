#!/bin/bash

# Check OBP-API accounts using exact same method as setup script

set -e

# Configuration (same as setup script)
CONSUMER_KEY="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme"
CONSUMER_SECRET="bzz1ceaup2wtptptjok5yg22vti5mi5q3ei5ucfc"
USERNAME="bootstrap"
PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

echo "🔑 Getting authentication token..."
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

echo -e "\n🏦 Checking banks..."
curl -s "$API_URL/obp/v5.1.0/banks" | python3 -c "
import json, sys
data = json.load(sys.stdin)
banks = data.get('banks', [])
print(f'Total: {len(banks)} banks')
for bank in banks:
    print(f'  ✅ {bank[\"id\"]}: {bank[\"full_name\"]}')
"

echo -e "\n💰 Checking my accounts..."
ACCOUNTS_RESPONSE=$(curl -s -X GET "$API_URL/obp/v5.1.0/my/accounts" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"")

echo "$ACCOUNTS_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'accounts' in data:
        accounts = data['accounts']
        print(f'Total accounts: {len(accounts)}')
        for acc in accounts:
            bank = acc.get('bank_id', 'Unknown')
            acc_id = acc.get('id', 'Unknown')
            label = acc.get('label', 'No label')
            balance = acc.get('balance', {})
            amount = balance.get('amount', '0')
            currency = balance.get('currency', 'Unknown')
            print(f'🏦 {bank}/{acc_id}: {label} - {amount} {currency}')
            if 'account_routings' in acc:
                for routing in acc['account_routings']:
                    scheme = routing.get('scheme', 'Unknown')
                    address = routing.get('address', 'Unknown')
                    print(f'   📍 {scheme}: {address}')
    else:
        print(f'❌ Error: {data.get(\"message\", \"Unknown error\")}')
        print(f'Full response: {data}')
except Exception as e:
    print(f'❌ Parse error: {e}')
    print('Raw response:')
    print(sys.stdin.read())
"