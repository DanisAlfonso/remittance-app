#!/usr/bin/env tsx

/**
 * Create and Fund HNL Account in HNLBANK
 * 
 * Test if we can create an HNL account directly in HNLBANK
 * using the same SANDBOX_TAN approach that worked for USD in EURBANK
 */

import { obpApiService } from './src/services/obp-api';
import { prisma } from './src/config/database';

async function createAndFundHNL() {
  try {
    console.log('🏦 Creating and funding HNL account in HNLBANK...');
    
    // Create a test user for the HNL account
    let testUser = await prisma.user.findFirst({
      where: { email: 'bootstrap@hnlbank.test' }
    });
    
    if (!testUser) {
      console.log('👤 Creating bootstrap user for HNLBANK...');
      testUser = await prisma.user.create({
        data: {
          email: 'bootstrap@hnlbank.test',
          firstName: 'Bootstrap',
          lastName: 'HNL User',
          password: 'BootstrapPass123!',
        }
      });
      console.log(`✅ Created bootstrap user: ${testUser.id}`);
    }
    
    // Try to create HNL account directly in HNLBANK
    console.log('🏦 Creating HNL account in HNLBANK...');
    const accountResult = await obpApiService.createAccount({
      userId: testUser.id,
      currency: 'HNL',
      country: 'HN',
      type: 'CURRENT',
      name: 'HNL Master Account',
      bankId: 'HNLBANK'  // Specify HNLBANK directly
    });
    
    if (accountResult.success) {
      console.log(`✅ HNL account created: ${accountResult.data?.id}`);
      console.log(`Account ID in HNLBANK: ${accountResult.data?.obp_account_id}`);
      
      // Now fund it using SANDBOX_TAN transaction
      console.log('💰 Funding account with L 10,000...');
      
      const transactionRequest = await obpApiService.createTransactionRequest({
        from_bank_id: 'HNLBANK',
        from_account_id: accountResult.data?.obp_account_id || '',
        to: {
          bank_id: 'HNLBANK',
          account_id: accountResult.data?.obp_account_id || ''
        },
        value: {
          currency: 'HNL',
          amount: '10000.00'
        },
        description: 'HNL Master account funding for virtual IBAN system',
        challenge_type: 'SANDBOX_TAN'
      });
      
      if (transactionRequest.success) {
        console.log(`✅ Transaction request created: ${transactionRequest.data?.id}`);
        const challengeId = transactionRequest.data?.challenge?.id;
        
        if (challengeId) {
          console.log('🔐 Challenge ID found:', challengeId);
          console.log('💡 You can answer this challenge with answer "123" using curl or the backend service');
          console.log(`Transaction Request ID: ${transactionRequest.data?.id}`);
          console.log(`Challenge ID: ${challengeId}`);
        }
      } else {
        console.error('❌ Transaction request failed:', transactionRequest.error);
      }
      
    } else {
      console.error('❌ HNL account creation failed:', accountResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAndFundHNL();