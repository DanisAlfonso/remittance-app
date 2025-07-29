#!/usr/bin/env tsx

/**
 * Create and Fund HNL Account in HNLBANK2
 * 
 * Create an HNL account in HNLBANK2 and fund it with lempiras (HNL)
 */

import { obpApiService } from '../../src/services/obp-api';
import { prisma } from '../../src/config/database';

async function createAndFundHNLBank2() {
  try {
    console.log('🏦 Creating and funding HNL account in HNLBANK2...');
    
    // Create test user for HNLBANK2
    let testUser = await prisma.user.findFirst({
      where: { email: 'hnlbank2@master.test' }
    });
    
    if (!testUser) {
      console.log('👤 Creating HNLBANK2 master user...');
      testUser = await prisma.user.create({
        data: {
          email: 'hnlbank2@master.test',
          firstName: 'HNLBANK2',
          lastName: 'Master User',
          password: 'BootstrapPass123!',
        }
      });
      console.log(`✅ Created user: ${testUser.id}`);
    }
    
    // Step 1: Create HNL account in HNLBANK2
    console.log('\n📋 Step 1: Creating HNL account in HNLBANK2...');
    const accountResult = await obpApiService.createAccount({
      userId: testUser.id,
      currency: 'HNL',
      country: 'HN',
      type: 'CURRENT',
      name: 'HNLBANK2 Master Account',
      bankId: 'HNLBANK2'  // Force creation in HNLBANK2
    });
    
    if (!accountResult.success || !accountResult.data) {
      console.error('❌ Failed to create HNL account in HNLBANK2:', accountResult.error);
      return;
    }
    
    const accountId = accountResult.data.obp_account_id;
    console.log(`✅ HNL account created in HNLBANK2: ${accountId}`);
    console.log(`📋 Database ID: ${accountResult.data.id}`);
    console.log(`📋 IBAN: ${accountResult.data.iban}`);
    
    // Step 2: Fund the account with L 25,000
    console.log('\n💰 Step 2: Funding account with L 25,000...');
    const transactionResult = await obpApiService.createTransactionRequest({
      from_bank_id: 'HNLBANK2',
      from_account_id: accountId,
      to: {
        bank_id: 'HNLBANK2',
        account_id: accountId
      },
      value: {
        currency: 'HNL',
        amount: '25000.00'
      },
      description: 'HNLBANK2 Master Account Initial Funding - L 25,000',
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
      
      const challengeResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK2/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionId}/challenge`, {
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
        const statusResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK2/accounts/${accountId}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${transactionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
          }
        });
        
        const statusData = await statusResponse.json();
        console.log(`📊 Transaction Status: ${statusData.status || 'Unknown'}`);
        
        if (statusData.status === 'COMPLETED') {
          console.log('🎉 HNLBANK2 funding COMPLETED!');
        }
        
      } else {
        const errorData = await challengeResponse.json();
        console.log('❌ Challenge failed:', challengeResponse.status, errorData);
      }
      
    } else {
      console.log('ℹ️ No challenge required - transaction may be auto-approved');
    }
    
    // Step 4: Verify account details
    console.log('\n🔍 Step 4: Verifying HNLBANK2 account...');
    const verifyResult = await obpApiService.getAccountDetails('HNLBANK2', accountId);
    
    if (verifyResult.success && verifyResult.data) {
      console.log('✅ HNLBANK2 Account Verified:');
      console.log(`  Bank: HNLBANK2`);
      console.log(`  Account: ${verifyResult.data.account_holder_name}`);
      console.log(`  Currency: ${verifyResult.data.currency}`);
      console.log(`  IBAN: ${verifyResult.data.iban}`);
      console.log(`  Account ID: ${accountId}`);
      
      console.log('\n🎉 SUCCESS: HNLBANK2 now has a funded HNL account!');
      console.log('💰 L 25,000 is now available for remittance operations');
      
      // Display master account configuration info
      console.log('\n📝 Account ready for master account configuration:');
      console.log(`  bankId: 'HNLBANK2'`);
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

createAndFundHNLBank2();