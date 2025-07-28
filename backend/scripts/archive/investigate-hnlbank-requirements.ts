#!/usr/bin/env tsx

/**
 * Investigate HNLBANK Requirements
 * 
 * Verify what's needed to create an account with funds directly in HNLBANK
 */

import { obpApiService } from './src/services/obp-api';

async function investigateHNLBankRequirements() {
  try {
    console.log('🔍 Investigating HNLBANK requirements...\n');
    
    // Step 1: Verify HNLBANK exists and get details
    console.log('📋 Step 1: Checking HNLBANK details...');
    const banksResult = await obpApiService.getBanks();
    
    if (banksResult.success && banksResult.data) {
      const hnlbank = banksResult.data.find(bank => bank.id === 'HNLBANK');
      
      if (hnlbank) {
        console.log('✅ HNLBANK found:');
        console.log(`  ID: ${hnlbank.id}`);
        console.log(`  Short Name: ${hnlbank.short_name}`);
        console.log(`  Full Name: ${hnlbank.full_name}`);
        console.log(`  Website: ${hnlbank.website || 'N/A'}`);
      } else {
        console.log('❌ HNLBANK not found in banks list');
        return;
      }
    }
    
    // Step 2: Check current accounts in HNLBANK
    console.log('\n📋 Step 2: Checking existing accounts in HNLBANK...');
    
    const tokenResult = await (obpApiService as any).getDirectLoginToken();
    if (!tokenResult.success) {
      console.error('❌ Failed to get auth token');
      return;
    }
    
    const accountsResponse = await fetch('http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
      }
    });
    
    const accountsData = await accountsResponse.json();
    
    if (accountsResponse.ok && accountsData.accounts) {
      console.log(`✅ HNLBANK has ${accountsData.accounts.length} accounts:`);
      for (const acc of accountsData.accounts) {
        console.log(`  • ${acc.id}: ${acc.label || 'No label'} (${acc.balance?.amount || '0'} ${acc.balance?.currency || 'Unknown'})`);
      }
    } else {
      console.log('❌ Could not get HNLBANK accounts:', accountsData.message || 'Unknown error');
    }
    
    // Step 3: Test account creation directly in HNLBANK via raw API
    console.log('\n📋 Step 3: Testing direct account creation in HNLBANK...');
    
    // Get current user ID
    const userResponse = await fetch('http://127.0.0.1:8080/obp/v5.1.0/users/current', {
      method: 'GET',
      headers: {
        'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
      }
    });
    
    const userData = await userResponse.json();
    const obpUserId = userData.user_id;
    
    console.log(`✅ OBP User ID: ${obpUserId}`);
    
    // Try creating account directly in HNLBANK
    const accountData = {
      user_id: obpUserId,
      label: "Direct HNLBANK Test Account",
      product_code: "HNL_CURRENT",
      balance: {
        currency: "HNL",
        amount: "0"
      },
      branch_id: "BRANCH1",
      account_routings: [
        {
          scheme: "IBAN",
          address: "HN4012345678900394759999"
        }
      ]
    };
    
    console.log('📋 Attempting direct account creation in HNLBANK...');
    console.log('Request data:', JSON.stringify(accountData, null, 2));
    
    const createResponse = await fetch('http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
      },
      body: JSON.stringify(accountData)
    });
    
    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log('✅ SUCCESS: Account created directly in HNLBANK!');
      console.log(`  Account ID: ${createResult.id}`);
      console.log(`  IBAN: ${createResult.account_routings?.[0]?.address}`);
      console.log(`  Label: ${createResult.label}`);
      
      // Step 4: Test funding the new HNLBANK account
      console.log('\n📋 Step 4: Testing funding of HNLBANK account...');
      
      const fundingData = {
        to: {
          bank_id: "HNLBANK",
          account_id: createResult.id
        },
        value: {
          currency: "HNL",
          amount: "25000.00"
        },
        description: "Direct HNLBANK funding test - L 25,000",
        challenge_type: "SANDBOX_TAN"
      };
      
      const fundingResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts/${createResult.id}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
        },
        body: JSON.stringify(fundingData)
      });
      
      const fundingResult = await fundingResponse.json();
      
      if (fundingResponse.ok) {
        console.log('✅ SUCCESS: Funding transaction created in HNLBANK!');
        console.log(`  Transaction ID: ${fundingResult.id}`);
        console.log(`  Challenge ID: ${fundingResult.challenge?.id || 'None'}`);
        
        if (fundingResult.challenge?.id) {
          console.log('\n🔐 Challenge available - can be completed with answer "123"');
          console.log('\n🎉 CONCLUSION: HNLBANK can create and fund HNL accounts!');
          console.log('\n📝 Required information for HNLBANK account with funds:');
          console.log(`  • Bank ID: HNLBANK`);
          console.log(`  • Account ID: ${createResult.id}`);
          console.log(`  • Transaction ID: ${fundingResult.id}`);
          console.log(`  • Challenge ID: ${fundingResult.challenge.id}`);
          console.log(`  • Answer: "123"`);
        } else {
          console.log('\n✅ No challenge required - funding may be automatic');
        }
        
      } else {
        console.log('❌ Funding failed:', fundingResult.message || 'Unknown error');
      }
      
    } else {
      console.log('❌ Account creation in HNLBANK failed:', createResult.message || 'Unknown error');
      console.log('Full error:', JSON.stringify(createResult, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

investigateHNLBankRequirements();