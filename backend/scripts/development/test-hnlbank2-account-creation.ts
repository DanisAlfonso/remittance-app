#!/usr/bin/env tsx

/**
 * Test HNLBANK2 Account Creation
 * 
 * Test the fixed OBP-API service to ensure accounts are created in HNLBANK2
 */

import { obpApiService } from '../../src/services/obp-api';
import { prisma } from '../../src/config/database';

async function testHNLBANK2AccountCreation() {
  try {
    console.log('🧪 Testing HNLBANK2 account creation...\n');

    // Create test user
    console.log('👤 Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        email: 'test.hnlbank2@honduras.test',
        firstName: 'Test',
        lastName: 'HNLBANK2 User',
        password: 'TestPass123!',
        phone: '+504-1234-5678',
        country: 'HN',
        emailVerified: true,
        kycStatus: 'APPROVED'
      }
    });
    console.log(`✅ Test user created: ${testUser.id}`);

    // Test account creation in HNLBANK2
    console.log('\n🏦 Creating account in HNLBANK2...');
    const accountResult = await obpApiService.createAccount({
      userId: testUser.id,
      currency: 'HNL',
      country: 'HN',
      type: 'CURRENT',
      name: 'Test HNLBANK2 Account',
      bankId: 'HNLBANK2'  // This should now work!
    });

    if (!accountResult.success || !accountResult.data) {
      console.error('❌ Failed to create account in HNLBANK2:', accountResult.error);
      return;
    }

    const account = accountResult.data;
    console.log('✅ Account successfully created in HNLBANK2:');
    console.log(`   Account ID: ${account.obp_account_id}`);
    console.log(`   IBAN: ${account.iban}`);
    console.log(`   Balance: ${account.balance} ${account.currency}`);
    console.log(`   Bank: ${account.obp_bank_id}`);

    // Verify the account was created in HNLBANK2
    if (account.obp_bank_id === 'HNLBANK2') {
      console.log('\n🎉 SUCCESS: Account correctly created in HNLBANK2!');
    } else {
      console.log(`\n❌ FAILURE: Account created in ${account.obp_bank_id} instead of HNLBANK2`);
    }

    // Clean up test user
    console.log('\n🧹 Cleaning up test user...');
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('✅ Test user cleaned up');

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHNLBANK2AccountCreation();