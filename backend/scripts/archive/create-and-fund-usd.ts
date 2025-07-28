#!/usr/bin/env tsx

/**
 * Create and Fund USD Account
 * 
 * This script creates a USD account and then funds it with $5,000
 * using the existing backend services.
 * 
 * Usage: npx tsx create-and-fund-usd.ts
 */

import { obpApiService } from './src/services/obp-api';
import { prisma } from './src/config/database';

async function createAndFundUSD() {
  try {
    console.log('🏦 Creating and funding USD account...');
    
    // Create a test user for the USD account
    let testUser = await prisma.user.findFirst({
      where: { email: 'bootstrap@usdbank.test' }
    });
    
    if (!testUser) {
      console.log('👤 Creating bootstrap user for USDBANK...');
      testUser = await prisma.user.create({
        data: {
          email: 'bootstrap@usdbank.test',
          firstName: 'Bootstrap',
          lastName: 'USD User',
          password: 'BootstrapPass123!',
        }
      });
      console.log(`✅ Created bootstrap user: ${testUser.id}`);
    }
    
    // Try to create USD account via OBP API
    console.log('🏦 Creating USD account via OBP-API...');
    const accountResult = await obpApiService.createAccount({
      userId: testUser.id,
      currency: 'USD',
      country: 'US',
      type: 'CURRENT',
      name: 'USD Master Account'
    });
    
    if (accountResult.success) {
      console.log(`✅ USD account created: ${accountResult.data?.id}`);
      
      // Now fund it using SANDBOX_TAN transaction
      console.log('💰 Funding account with $5,000...');
      
      // Create a SANDBOX_TAN transaction request to fund the account
      const transactionRequest = await obpApiService.createTransactionRequest({
        from_bank_id: 'USDBANK',
        from_account_id: accountResult.data?.obp_account_id || '',
        to: {
          bank_id: 'USDBANK',
          account_id: accountResult.data?.obp_account_id || ''
        },
        value: {
          currency: 'USD',
          amount: '5000.00'
        },
        description: 'USD Master account funding for virtual IBAN system',
        challenge_type: 'SANDBOX_TAN'
      });
      
      if (transactionRequest.success) {
        console.log(`✅ Transaction request created: ${transactionRequest.data?.id}`);
        const challengeId = transactionRequest.data?.challenge?.id;
        
        if (challengeId) {
          // Answer the challenge with "123"
          console.log('🔐 Answering challenge...');
          const challengeResult = await obpApiService.answerTransactionRequestChallenge(
            'USDBANK',
            accountResult.data?.obp_account_id || '',
            transactionRequest.data?.id || '',
            challengeId,
            '123'
          );
          
          if (challengeResult.success) {
            console.log('✅ Challenge answered successfully!');
            console.log('🎉 USD account created and funded with $5,000!');
          } else {
            console.error('❌ Challenge failed:', challengeResult.error);
          }
        }
      } else {
        console.error('❌ Transaction request failed:', transactionRequest.error);
      }
      
    } else {
      console.error('❌ USD account creation failed:', accountResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the script
createAndFundUSD();