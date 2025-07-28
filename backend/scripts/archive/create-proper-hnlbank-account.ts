#!/usr/bin/env tsx

/**
 * Create Proper HNLBANK Account
 * 
 * Create an account directly in HNLBANK and fund it properly
 */

async function createProperHNLBankAccount() {
  try {
    console.log('🏦 Creating proper HNLBANK account with funds...');
    
    // Get authentication token
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
    
    // Get current user ID
    const userResponse = await fetch('http://127.0.0.1:8080/obp/v5.1.0/users/current', {
      method: 'GET',
      headers: {
        'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
      }
    });
    
    const userData = await userResponse.json();
    const obpUserId = userData.user_id;
    
    console.log(`✅ OBP User ID: ${obpUserId}`);
    
    // Create account directly in HNLBANK with proper data
    const accountData = {
      user_id: obpUserId,
      label: "HNLBANK HNL Master Account",
      product_code: "HNL_CURRENT",
      balance: {
        currency: "HNL",
        amount: "0"
      },
      branch_id: "BRANCH1",
      account_routings: [
        {
          scheme: "IBAN", 
          address: "HN5012345678900394750000"
        }
      ]
    };
    
    console.log('\n📋 Creating account in HNLBANK...');
    
    const createResponse = await fetch('http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
      },
      body: JSON.stringify(accountData)
    });
    
    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      // The account ID should be in the response
      const accountId = createResult.id || createResult.account_id;
      const iban = createResult.account_routings?.[0]?.address || accountData.account_routings[0].address;
      
      console.log('✅ Account created in HNLBANK!');
      console.log(`  Account ID: ${accountId}`);
      console.log(`  IBAN: ${iban}`);
      console.log(`  Label: ${createResult.label}`);
      console.log('Full response:', JSON.stringify(createResult, null, 2));
      
      if (accountId) {
        // Create funding transaction
        console.log('\n💰 Creating funding transaction...');
        
        const fundingData = {
          to: {
            bank_id: "HNLBANK",
            account_id: accountId
          },
          value: {
            currency: "HNL",
            amount: "30000.00"
          },
          description: "HNLBANK HNL Master Account Funding - L 30,000",
          challenge_type: "SANDBOX_TAN"
        };
        
        const fundingResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
          },
          body: JSON.stringify(fundingData)
        });
        
        const fundingResult = await fundingResponse.json();
        
        if (fundingResponse.ok) {
          console.log('✅ Funding transaction created!');
          console.log(`  Transaction ID: ${fundingResult.id}`);
          console.log(`  Challenge ID: ${fundingResult.challenge?.id || 'None'}`);
          
          if (fundingResult.challenge?.id) {
            // Answer the challenge
            console.log('\n🔐 Answering challenge...');
            
            const challengeResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${fundingResult.id}/challenge`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
              },
              body: JSON.stringify({
                id: fundingResult.challenge.id,
                answer: "123"
              })
            });
            
            if (challengeResponse.ok) {
              console.log('✅ Challenge answered successfully!');
              
              // Wait for processing
              console.log('⏳ Waiting for transaction to process...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Check transaction status
              const statusResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${fundingResult.id}`, {
                method: 'GET',
                headers: {
                  'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
                }
              });
              
              const statusData = await statusResponse.json();
              console.log(`📊 Transaction Status: ${statusData.status || 'Unknown'}`);
              
              if (statusData.status === 'COMPLETED') {
                console.log('\n🎉 SUCCESS: HNLBANK account created and funded!');
                console.log('\n📝 HNLBANK Master Account Details:');
                console.log(`  Bank: HNLBANK`);
                console.log(`  Account ID: ${accountId}`);
                console.log(`  IBAN: ${iban}`);
                console.log(`  Currency: HNL`);
                console.log(`  Amount: L 30,000`);
                console.log(`  Status: FUNDED`);
                
                console.log('\n🔧 Update master-account-banking.ts with:');
                console.log(`  HNL: {`);
                console.log(`    bankId: 'HNLBANK',`);
                console.log(`    accountId: '${accountId}',`);
                console.log(`    iban: '${iban}',`);
                console.log(`    bic: 'CATLBK1XXXX',`);
                console.log(`    currency: 'HNL',`);
                console.log(`    country: 'HN'`);
                console.log(`  }`);
                
              } else {
                console.log('⚠️ Transaction not completed yet:', statusData.status);
              }
              
            } else {
              const challengeError = await challengeResponse.json();
              console.log('❌ Challenge failed:', challengeError);
            }
            
          } else {
            console.log('ℹ️ No challenge required - transaction may be automatic');
          }
          
        } else {
          console.log('❌ Funding transaction failed:', fundingResult);
        }
        
      } else {
        console.log('❌ No account ID returned in response');
      }
      
    } else {
      console.log('❌ Account creation failed:', createResult);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createProperHNLBankAccount();