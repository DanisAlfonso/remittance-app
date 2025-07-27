#!/bin/bash

# Complete the funding by answering transaction request challenges
# For SANDBOX_TAN challenges, the answer is typically "123"

set -e

# Configuration
CONSUMER_KEY="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme"
USERNAME="bootstrap"
PASSWORD="BootstrapPass123!"
API_URL="http://127.0.0.1:8080"

# Master account details
EUR_BANK_ID="EURBANK"
EUR_ACCOUNT_ID="f8ea80af-7e83-4211-bca7-d8fc53094c1c"
HNL_BANK_ID="HNLBANK" 
HNL_ACCOUNT_ID="0ce45ba7-7cde-4999-9f94-a0d087a2d516"

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

echo -e "\n🔍 Step 1: Getting pending transaction requests..."

# Get EUR transaction requests
EUR_REQUESTS=$(curl -s -X GET "$API_URL/obp/v5.1.0/banks/$EUR_BANK_ID/accounts/$EUR_ACCOUNT_ID/owner/transaction-requests" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"")

echo "EUR Transaction Requests:"
echo "$EUR_REQUESTS" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'transaction_requests_with_charges' in data:
        requests = data['transaction_requests_with_charges']
        print(f'Found {len(requests)} EUR transaction requests')
        for req in requests:
            req_id = req.get('id', 'Unknown')
            status = req.get('status', 'Unknown')
            amount = req.get('body', {}).get('value', {}).get('amount', '0')
            currency = req.get('body', {}).get('value', {}).get('currency', 'Unknown')
            print(f'  📋 {req_id}: {status} - {amount} {currency}')
            
            # Check for challenge
            if 'challenge' in req and req['challenge']:
                challenge = req['challenge']
                challenge_id = challenge.get('id', 'Unknown')
                challenge_type = challenge.get('challenge_type', 'Unknown')
                print(f'    🔐 Challenge: {challenge_id} ({challenge_type})')
                
                # Save for answering
                print(f'ANSWER_EUR_CHALLENGE={req_id}:{challenge_id}')
    else:
        print(f'❌ No transaction requests found: {data}')
except Exception as e:
    print(f'❌ Parse error: {e}')
"

# Get HNL transaction requests  
HNL_REQUESTS=$(curl -s -X GET "$API_URL/obp/v5.1.0/banks/$HNL_BANK_ID/accounts/$HNL_ACCOUNT_ID/owner/transaction-requests" \
  -H "Authorization: DirectLogin username=\"$USERNAME\",password=\"$PASSWORD\",consumer_key=\"$CONSUMER_KEY\",token=\"$TOKEN\"")

echo -e "\nHNL Transaction Requests:"
echo "$HNL_REQUESTS" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'transaction_requests_with_charges' in data:
        requests = data['transaction_requests_with_charges']
        print(f'Found {len(requests)} HNL transaction requests')
        for req in requests:
            req_id = req.get('id', 'Unknown')
            status = req.get('status', 'Unknown')
            amount = req.get('body', {}).get('value', {}).get('amount', '0')
            currency = req.get('body', {}).get('value', {}).get('currency', 'Unknown')
            print(f'  📋 {req_id}: {status} - {amount} {currency}')
            
            # Check for challenge
            if 'challenge' in req and req['challenge']:
                challenge = req['challenge']
                challenge_id = challenge.get('id', 'Unknown')
                challenge_type = challenge.get('challenge_type', 'Unknown')
                print(f'    🔐 Challenge: {challenge_id} ({challenge_type})')
                
                # Save for answering
                print(f'ANSWER_HNL_CHALLENGE={req_id}:{challenge_id}')
    else:
        print(f'❌ No transaction requests found: {data}')
except Exception as e:
    print(f'❌ Parse error: {e}')
"

echo -e "\n💡 For SANDBOX_TAN challenges, we can answer with '123'"
echo "If you see challenges above, you can manually answer them using the challenge IDs."
echo ""
echo "Example command to answer EUR challenge:"
echo "curl -X POST \"\$API_URL/obp/v5.1.0/banks/$EUR_BANK_ID/accounts/$EUR_ACCOUNT_ID/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/TRANSACTION_REQUEST_ID/challenge\" \\"
echo "  -H \"Authorization: DirectLogin username=\\\"$USERNAME\\\",password=\\\"$PASSWORD\\\",consumer_key=\\\"$CONSUMER_KEY\\\",token=\\\"$TOKEN\\\"\" \\"
echo "  -d '{\"id\": \"CHALLENGE_ID\", \"answer\": \"123\"}'"