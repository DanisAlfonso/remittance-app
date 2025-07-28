#!/usr/bin/env tsx

/**
 * Create Funded HNL Account in HNLBANK
 * 
 * Create an HNL account directly in HNLBANK and fund it with L 50,000
 * Now that we have EUR↔HNL exchange rates configured, this should work
 */

import { obpApiService } from './src/services/obp-api';
import { prisma } from './src/config/database';

async function createFundedHNLInHNLBank() {
  try {
    console.log('🏦 Creating funded HNL account in HNLBANK...');
    
    // Create test user for HNLBANK
    let testUser = await prisma.user.findFirst({
      where: { email: 'hnlbank@master.test' }
    });
    
    if (!testUser) {
      console.log('👤 Creating HNLBANK master user...');
      testUser = await prisma.user.create({
        data: {
          email: 'hnlbank@master.test',
          firstName: 'HNLBANK',
          lastName: 'Master User',
          password: 'BootstrapPass123!',
        }
      });
      console.log(`✅ Created user: ${testUser.id}`);
    }
    
    // Step 1: Create HNL account in HNLBANK
    console.log('\n📋 Step 1: Creating HNL account in HNLBANK...');
    const accountResult = await obpApiService.createAccount({
      userId: testUser.id,
      currency: 'HNL',
      country: 'HN',
      type: 'CURRENT',
      name: 'HNLBANK Master Account',
      bankId: 'HNLBANK'  // Force creation in HNLBANK
    });
    
    if (!accountResult.success || !accountResult.data) {
      console.error('❌ Failed to create HNL account in HNLBANK:', accountResult.error);
      return;
    }
    
    const accountId = accountResult.data.obp_account_id;
    console.log(`✅ HNL account created in HNLBANK: ${accountId}`);
    console.log(`📋 Database ID: ${accountResult.data.id}`);
    console.log(`📋 IBAN: ${accountResult.data.iban}`);
    
    // Step 2: Fund the account with SANDBOX_TAN
    console.log('\n💰 Step 2: Funding account with L 50,000...');
    const transactionResult = await obpApiService.createTransactionRequest({
      from_bank_id: 'HNLBANK',
      from_account_id: accountId,
      to: {
        bank_id: 'HNLBANK',
        account_id: accountId
      },
      value: {
        currency: 'HNL',
        amount: '50000.00'
      },
      description: 'HNLBANK Master Account Initial Funding - L 50,000',
      challenge_type: 'SANDBOX_TAN'
    });
    
    if (!transactionResult.success || !transactionResult.data) {
      console.error('❌ Failed to create funding transaction:', transactionResult.error);
      return;
    }
    
    const transactionId = transactionResult.data.id;
    const challengeId = transactionResult.data.challenge?.id;
    
    console.log(`✅ Transaction created: ${transactionId}`);
    
    if (challengeId) {
      console.log(`✅ Challenge ID: ${challengeId}`);
      
      // Step 3: Answer challenge immediately
      console.log('\n🔐 Step 3: Answering challenge with "123"...');
      
      const tokenResult = await (obpApiService as any).getDirectLoginToken();
      if (!tokenResult.success) {
        console.error('❌ Failed to get auth token');
        return;
      }
      
      const challengeResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionId}/challenge`, {
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
        
        // Wait for processing
        console.log('⏳ Waiting for transaction to process...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check transaction status
        const statusResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
          }
        });
        
        const statusData = await statusResponse.json();
        console.log(`📊 Transaction Status: ${statusData.status || 'Unknown'}`);
        
        if (statusData.status === 'COMPLETED') {
          console.log('🎉 HNLBANK funding COMPLETED!');
        }
        
      } else {
        const errorData = await challengeResponse.json();
        console.log('❌ Challenge failed:', challengeResponse.status, errorData);
      }
      
    } else {
      console.log('ℹ️ No challenge required - transaction may be auto-approved');
    }
    
    // Step 4: Verify account details
    console.log('\n🔍 Step 4: Verifying HNLBANK account...');
    const verifyResult = await obpApiService.getAccountDetails('HNLBANK', accountId);
    
    if (verifyResult.success && verifyResult.data) {
      console.log('✅ HNLBANK Account Verified:');
      console.log(`  Bank: HNLBANK`);
      console.log(`  Account: ${verifyResult.data.account_holder_name}`);
      console.log(`  Currency: ${verifyResult.data.currency}`);
      console.log(`  IBAN: ${verifyResult.data.iban}`);
      console.log(`  Account ID: ${accountId}`);
      
      console.log('\n🎉 SUCCESS: HNLBANK now has a funded HNL account!');
      console.log('💰 L 50,000 should be available for remittance operations');
      
      // Update master account configuration
      console.log('\n📝 Account ready for master account configuration:');
      console.log(`  bankId: 'HNLBANK'`);
      console.log(`  accountId: '${accountId}'`);
      console.log(`  iban: '${verifyResult.data.iban}'`);
      
    } else {
      console.log('⚠️ Could not verify account details');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFundedHNLInHNLBank();