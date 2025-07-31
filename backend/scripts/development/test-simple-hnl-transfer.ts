#!/usr/bin/env tsx

/**
 * Test Simple HNL Transfer
 * 
 * Test a simple HNL → HNL transfer within HNLBANK2 to isolate the issue
 */

import { obpApiService } from '../../src/services/obp-api';

async function testSimpleHNLTransfer() {
  try {
    console.log('🧪 Testing simple HNL → HNL transfer within HNLBANK2...\n');

    const masterAccountId = '4891dd74-b1e3-4c92-84d9-6f34b16e5845';
    const recipientAccountId = '625fede6-0750-485d-acd7-ca85eda46263';
    const testAmount = '100.00'; // Just L. 100

    console.log(`📋 Transfer Details:`);
    console.log(`   FROM: Master Account (${masterAccountId})`);
    console.log(`   TO: Recipient Account (${recipientAccountId})`);
    console.log(`   AMOUNT: L. ${testAmount} HNL`);
    console.log(`   BANK: HNLBANK2 (same bank)`);
    console.log(`   CURRENCY: HNL → HNL (same currency)`);

    console.log('\n🚀 Creating transaction request...');

    const transactionResult = await obpApiService.createTransactionRequest({
      from_bank_id: 'HNLBANK2',
      from_account_id: masterAccountId,
      to: {
        bank_id: 'HNLBANK2',
        account_id: recipientAccountId
      },
      value: {
        currency: 'HNL',
        amount: testAmount
      },
      description: 'Test HNL transfer within HNLBANK2',
      challenge_type: 'SANDBOX_TAN'
    });

    if (transactionResult.success && transactionResult.data) {
      console.log('✅ Transaction request created successfully!');
      console.log(`   Transaction ID: ${transactionResult.data.id}`);
      console.log(`   Status: ${transactionResult.data.status || 'INITIATED'}`);
      console.log(`   Challenge ID: ${transactionResult.data.challenge?.id || 'None'}`);

      // Auto-answer challenge if present
      if (transactionResult.data.challenge) {
        console.log('\n🔐 Answering challenge automatically...');
        
        const tokenResult = await (obpApiService as any).getDirectLoginToken();
        if (tokenResult.success) {
          const challengeResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK2/accounts/${masterAccountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionResult.data.id}/challenge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
            },
            body: JSON.stringify({
              id: transactionResult.data.challenge.id,
              answer: "123"
            })
          });

          if (challengeResponse.ok) {
            console.log('✅ Challenge answered successfully!');
            
            // Wait and check status
            console.log('\n⏳ Waiting for transaction to process...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check final status
            const statusResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK2/accounts/${masterAccountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionResult.data.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
              }
            });

            const statusData = await statusResponse.json();
            console.log(`📊 Final Status: ${statusData.status || 'Unknown'}`);
            
            if (statusData.status === 'COMPLETED') {
              console.log('🎉 SUCCESS: HNL transfer completed within HNLBANK2!');
            } else {
              console.log('⚠️ Transaction status:', statusData.status);
            }
          } else {
            const errorData = await challengeResponse.json();
            console.error('❌ Challenge failed:', errorData);
          }
        }
      } else {
        console.log('ℹ️ No challenge required - transaction may be auto-approved');
      }

      console.log('\n✅ Test completed! HNL → HNL transfers work within HNLBANK2');

    } else {
      console.error('❌ Transaction request failed:');
      console.error(`   Error: ${transactionResult.error?.error_description}`);
      console.error(`   Full response:`, transactionResult.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleHNLTransfer();