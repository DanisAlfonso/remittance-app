#!/bin/bash

# Answer the challenges to complete the funding

set -e

# Configuration
CONSUMER_KEY="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme"
USERNAME="bootstrap"
PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

# Transaction details from previous step
EUR_BANK_ID="EURBANK"
EUR_ACCOUNT_ID="f8ea80af-7e83-4211-bca7-d8fc53094c1c"
EUR_TRANSACTION_REQUEST_ID="9a789edb-bdf1-4abd-ba01-2c53fe94a430"
EUR_CHALLENGE_ID="d8f59290-9c2b-42d6-8271-d77454841121"

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

echo -e "\n🔐 Answering EUR challenge..."
echo "Transaction Request ID: $EUR_TRANSACTION_REQUEST_ID"
echo "Challenge ID: $EUR_CHALLENGE_ID"

EUR_CHALLENGE_RESPONSE=$(curl -s -X POST "$API_URL/obp/v5.1.0/banks/$EUR_BANK_ID/accounts/$EUR_ACCOUNT_ID/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/$EUR_TRANSACTION_REQUEST_ID/challenge" \
  -H "Content-Type: application/json" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"" \
  -d "{
    \"id\": \"$EUR_CHALLENGE_ID\",
    \"answer\": \"123\"
  }")

if echo "$EUR_CHALLENGE_RESPONSE" | grep -q "COMPLETED\|SUCCESS"; then
    echo "✅ EUR challenge answered successfully!"
else
    echo "❌ EUR challenge response: $EUR_CHALLENGE_RESPONSE"
fi

echo -e "\n🔍 Checking final account balances..."
sleep 3  # Give time for processing

FINAL_ACCOUNTS=$(curl -s -X GET "$API_URL/obp/v5.1.0/my/accounts" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"")

echo "$FINAL_ACCOUNTS" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'accounts' in data:
        accounts = data['accounts']
        print(f'Final account balances:')
        for acc in accounts:
            bank = acc.get('bank_id', 'Unknown')
            acc_id = acc.get('id', 'Unknown')
            label = acc.get('label', 'No label')
            balance = acc.get('balance', {})
            amount = balance.get('amount', '0')
            currency = balance.get('currency', 'Unknown')
            print(f'💰 {bank}: {amount} {currency} ({label})')
    else:
        print(f'❌ Error: {data.get(\"message\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Parse error: {e}')
"

echo -e "\n🎉 Funding process complete!"