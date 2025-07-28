#!/usr/bin/env tsx

/**
 * Answer HNL Challenge Directly
 * 
 * Complete the HNL funding by answering the SANDBOX_TAN challenge
 */

async function answerHNLChallenge() {
  try {
    console.log('🔐 Answering HNL funding challenge directly...');
    
    const bankId = 'EURBANK'; // HNL account was created in EURBANK
    const accountId = 'c9b78aaa-e968-4be0-ad27-907ee0c435d5';
    const transactionRequestId = '7a9d4c8f-82f7-4093-a4ff-0ab9b7a92002';
    
    // Get auth token
    console.log('🔑 Getting authentication token...');
    const tokenResponse = await fetch('http://127.0.0.1:8080/my/logins/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme"'
      },
      body: JSON.stringify({})
    });
    
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;
    
    if (!token) {
      console.error('❌ Failed to get token:', tokenData);
      return;
    }
    
    console.log('✅ Got authentication token');
    
    // Get transaction request to find challenge ID
    console.log('📋 Getting transaction request details...');
    const transactionResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionRequestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
      }
    });
    
    const transactionData = await transactionResponse.json();
    
    if (transactionData.challenge && transactionData.challenge.id) {
      const challengeId = transactionData.challenge.id;
      console.log(`✅ Found challenge ID: ${challengeId}`);
      
      // Answer the challenge with "123"
      console.log('🔐 Answering challenge with "123"...');
      const challengeResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/${bankId}/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionRequestId}/challenge`, {
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
      
      const challengeResponseText = await challengeResponse.text();
      
      if (challengeResponse.ok) {
        console.log('✅ Challenge answered successfully!');
        console.log('🎉 HNL account funding completed!');
        
        // Wait a moment and check the balance
        console.log('\n⏳ Waiting 3 seconds for processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check final balance
        console.log('🔍 Checking final HNL account balance...');
        const balanceResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/EURBANK/accounts/${accountId}/owner/account`, {
          method: 'GET',
          headers: {
            'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
          }
        });
        
        const balanceData = await balanceResponse.json();
        if (balanceData.balance) {
          console.log(`💰 Final Balance: ${balanceData.balance.amount} ${balanceData.balance.currency}`);
        } else {
          console.log('💰 Balance info not available in response, but funding should be complete');
        }
        
      } else {
        console.log('❌ Challenge failed:', challengeResponse.status, challengeResponseText);
      }
      
    } else {
      console.log('❌ No challenge found in transaction');
      console.log('Response:', JSON.stringify(transactionData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

answerHNLChallenge();