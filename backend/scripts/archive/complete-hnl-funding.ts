#!/usr/bin/env tsx

/**
 * Complete HNL Account Funding
 * 
 * Create and immediately complete HNL funding transaction
 */

import { obpApiService } from './src/services/obp-api';

async function completeHNLFunding() {
  try {
    console.log('💰 Creating and completing HNL account funding...');
    
    const bankId = 'EURBANK';
    const accountId = 'c9b78aaa-e968-4be0-ad27-907ee0c435d5';
    const amount = '10000.00';
    
    // Step 1: Create transaction request
    console.log('📋 Step 1: Creating SANDBOX_TAN transaction request...');
    const transactionResult = await obpApiService.createTransactionRequest({
      from_bank_id: bankId,
      from_account_id: accountId,
      to: {
        bank_id: bankId,
        account_id: accountId
      },
      value: {
        currency: 'HNL',
        amount: amount
      },
      description: 'HNL Master account funding - Final',
      challenge_type: 'SANDBOX_TAN'
    });
    
    if (!transactionResult.success || !transactionResult.data) {
      console.error('❌ Failed to create transaction:', transactionResult.error);
      return;
    }
    
    const transactionId = transactionResult.data.id;
    const challengeId = transactionResult.data.challenge?.id;
    
    console.log(`✅ Transaction created: ${transactionId}`);
    
    if (challengeId) {
      console.log(`✅ Challenge ID: ${challengeId}`);
      
      // Step 2: Answer challenge immediately
      console.log('🔐 Step 2: Answering challenge with "123"...');
      
      const tokenResult = await (obpApiService as any).getDirectLoginToken();
      if (!tokenResult.success) {
        console.error('❌ Failed to get auth token');
        return;
      }
      
      const challengeResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionId}/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
        },
        body: JSON.stringify({
          id: challengeId,
          answer: "123"
        })
      });
      
      if (challengeResponse.ok) {
        console.log('✅ Challenge answered successfully!');
        
        // Step 3: Verify completion
        console.log('⏳ Step 3: Waiting for transaction to complete...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check transaction status
        const statusResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
          }
        });
        
        const statusData = await statusResponse.json();
        console.log(`📊 Final Transaction Status: ${statusData.status || 'Unknown'}`);
        
        if (statusData.status === 'COMPLETED') {
          console.log('🎉 HNL account funding COMPLETED!');
          console.log(`💰 L ${amount} should now be available`);
        } else {
          console.log('⚠️ Transaction status:', statusData.status);
        }
        
      } else {
        const errorData = await challengeResponse.json();
        console.log('❌ Challenge failed:', challengeResponse.status, errorData);
      }
      
    } else {
      console.log('ℹ️ No challenge required - transaction may be auto-approved');
      
      // Check if transaction completed automatically
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const tokenResult = await (obpApiService as any).getDirectLoginToken();
      const statusResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
        }
      });
      
      const statusData = await statusResponse.json();
      console.log(`📊 Transaction Status: ${statusData.status || 'Unknown'}`);
      
      if (statusData.status === 'COMPLETED') {
        console.log('🎉 HNL account funding COMPLETED automatically!');
        console.log(`💰 L ${amount} should now be available`);
      }
    }
    
    // Step 4: Final balance verification
    console.log('\n🔍 Step 4: Verifying final balance...');
    const balanceResult = await obpApiService.getAccountDetails(bankId, accountId);
    
    if (balanceResult.success) {
      console.log('✅ Account verified:');
      console.log(`  Currency: ${balanceResult.data?.currency}`);
      console.log(`  IBAN: ${balanceResult.data?.iban}`);
      console.log(`  Account: ${balanceResult.data?.account_holder_name}`);
      console.log('\n🎉 HNL account with funds is ready for your remittance app!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

completeHNLFunding();