#!/usr/bin/env tsx

/**
 * Fund HNL Account Completely
 * 
 * Create a new SANDBOX_TAN transaction and complete it immediately
 */

import { obpApiService } from './src/services/obp-api';

async function fundHNLAccount() {
  try {
    console.log('💰 Funding HNL account with L 10,000...');
    
    const bankId = 'EURBANK'; // HNL account is in EURBANK
    const accountId = 'c9b78aaa-e968-4be0-ad27-907ee0c435d5';
    
    // Create new transaction request
    console.log('📋 Creating new SANDBOX_TAN transaction request...');
    const transactionRequest = await obpApiService.createTransactionRequest({
      from_bank_id: bankId,
      from_account_id: accountId,
      to: {
        bank_id: bankId,
        account_id: accountId
      },
      value: {
        currency: 'HNL',
        amount: '10000.00'
      },
      description: 'HNL Master account funding for remittance system',
      challenge_type: 'SANDBOX_TAN'
    });
    
    if (transactionRequest.success && transactionRequest.data) {
      console.log(`✅ Transaction request created: ${transactionRequest.data.id}`);
      const challengeId = transactionRequest.data.challenge?.id;
      
      if (challengeId) {
        console.log(`✅ Challenge ID: ${challengeId}`);
        
        // Answer the challenge immediately
        console.log('🔐 Answering challenge with "123"...');
        
        // Get auth token
        const tokenResult = await (obpApiService as any).getDirectLoginToken();
        if (!tokenResult.success) {
          console.error('❌ Failed to get auth token');
          return;
        }
        
        const token = tokenResult.token;
        
        // Answer challenge
        const challengeResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionRequest.data.id}/challenge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
          },
          body: JSON.stringify({
            id: challengeId,
            answer: "123"
          })
        });
        
        const challengeResult = await challengeResponse.json();
        
        if (challengeResponse.ok) {
          console.log('✅ Challenge answered successfully!');
          console.log('🎉 HNL account funding completed!');
          console.log(`💰 L 10,000 should now be available in account ${accountId}`);
          
          // Check transaction status
          console.log('\n🔍 Checking transaction status...');
          const statusResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionRequest.data.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
            }
          });
          
          const statusData = await statusResponse.json();
          console.log(`📊 Transaction Status: ${statusData.status || 'Unknown'}`);
          
        } else {
          console.log('❌ Challenge failed:', challengeResponse.status, challengeResult);
        }
        
      } else {
        console.log('❌ No challenge ID found in transaction request');
      }
      
    } else {
      console.error('❌ Failed to create transaction request:', transactionRequest.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fundHNLAccount();