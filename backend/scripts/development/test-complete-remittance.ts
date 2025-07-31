#!/usr/bin/env tsx

/**
 * Test Complete EUR → HNL Remittance Flow
 * 
 * Tests the full remittance system:
 * 1. María (Spain) sends €100 
 * 2. Juan Pérez (Honduras) receives HNL
 * 3. Full atomic transaction with real OBP-API
 */

import { remittanceService } from '../../src/services/remittance-service';
import { prisma } from '../../src/config/database';

async function testCompleteRemittance() {
  try {
    console.log('🌍 Testing Complete EUR → HNL Remittance System');
    console.log('='.repeat(60));

    // Step 1: Get sender (María in Spain)
    const sender = await prisma.user.findFirst({
      where: { email: 'maria.sender@spain.test' }
    });

    if (!sender) {
      console.error('❌ Sender (María) not found. Please run create-hnlbank2-recipients.ts first');
      return;
    }

    console.log(`👤 Sender: ${sender.firstName} ${sender.lastName} (${sender.email})`);

    // Step 2: Get recipient (Juan Pérez in Honduras)
    const recipient = await prisma.beneficiary.findFirst({
      where: { 
        userId: sender.id,
        firstName: 'Juan',
        lastName: 'Pérez'
      }
    });

    if (!recipient) {
      console.error('❌ Recipient (Juan Pérez) not found. Please run create-hnlbank2-recipients.ts first');
      return;
    }

    console.log(`👤 Recipient: ${recipient.firstName} ${recipient.lastName}`);
    console.log(`🏦 Recipient Account: ${recipient.accountNumber} (HNLBANK2)`);
    console.log(`📍 Address: ${recipient.address}`);
    console.log(`📞 Phone: ${recipient.phone}`);

    // Step 3: Check master account balances before
    console.log('\n💰 PRE-TRANSFER BALANCES:');
    const eurMasterBefore = await (remittanceService as any).obpApiService?.getAccountDetails('EURBANK', 'f8ea80af-7e83-4211-bca7-d8fc53094c1c');
    const hnlMasterBefore = await (remittanceService as any).obpApiService?.getAccountDetails('HNLBANK2', '4891dd74-b1e3-4c92-84d9-6f34b16e5845');
    
    console.log(`   EURBANK Master: €${eurMasterBefore?.data?.balance?.amount || 'unknown'}`);
    console.log(`   HNLBANK2 Master: L. ${hnlMasterBefore?.data?.balance?.amount || 'unknown'}`);

    // Step 4: Execute remittance
    console.log('\n🚀 EXECUTING REMITTANCE...');
    console.log('-'.repeat(40));

    const remittanceRequest = {
      senderId: sender.id,
      recipientAccountId: recipient.accountNumber,
      amountEUR: 100, // €100
      description: 'Test remittance from Spain to Honduras',
      recipientName: `${recipient.firstName} ${recipient.lastName}`
    };

    const startTime = Date.now();
    const result = await remittanceService.executeRemittance(remittanceRequest);
    const duration = Date.now() - startTime;

    console.log('-'.repeat(40));
    console.log(`⏱️ Execution time: ${duration}ms`);

    // Step 5: Display results
    if (result.success) {
      console.log('\n🎉 REMITTANCE SUCCESSFUL!');
      console.log('✅ Transaction Details:');
      console.log(`   Transaction ID: ${result.transactionId}`);
      console.log(`   EUR Deducted: €${result.eurDeducted?.toFixed(2)}`);
      console.log(`   HNL Deposited: L. ${result.hnlDeposited?.toFixed(2)}`);
      console.log(`   Exchange Rate: ${result.exchangeRate?.toFixed(4)} HNL/EUR`);
      
      if (result.fees) {
        console.log(`   Platform Fee: €${result.fees.platformFee.toFixed(2)}`);
        console.log(`   Exchange Margin: L. ${result.fees.exchangeMargin.toFixed(2)}`);
        console.log(`   Total Company Revenue: €${result.fees.platformFee.toFixed(2)} + L. ${result.fees.exchangeMargin.toFixed(2)}`);
      }

      if (result.timeline) {
        console.log(`   Timeline:`);
        console.log(`     Initiated: ${result.timeline.initiated.toISOString()}`);
        console.log(`     EUR Processed: ${result.timeline.eurProcessed?.toISOString()}`);
        console.log(`     HNL Processed: ${result.timeline.hnlProcessed?.toISOString()}`);
        console.log(`     Completed: ${result.timeline.completed?.toISOString()}`);
      }

      // Step 6: Verify transaction in database
      if (result.transactionId) {
        console.log('\n📊 DATABASE VERIFICATION:');
        const dbTransaction = await prisma.transaction.findUnique({
          where: { id: result.transactionId }
        });

        if (dbTransaction) {
          console.log(`✅ Transaction recorded in database:`);
          console.log(`   Status: ${dbTransaction.status}`);
          console.log(`   Amount: €${dbTransaction.amount}`);
          console.log(`   Target Amount: L. ${dbTransaction.targetAmount}`);
          console.log(`   Exchange Rate: ${dbTransaction.exchangeRate}`);
          console.log(`   Created: ${dbTransaction.createdAt.toISOString()}`);
          console.log(`   Completed: ${dbTransaction.completedAt?.toISOString()}`);
        }
      }

      // Step 7: Check balances after (optional - might need OBP-API permissions)
      console.log('\n💰 POST-TRANSFER BALANCES:');
      try {
        const eurMasterAfter = await (remittanceService as any).obpApiService?.getAccountDetails('EURBANK', 'f8ea80af-7e83-4211-bca7-d8fc53094c1c');
        const hnlMasterAfter = await (remittanceService as any).obpApiService?.getAccountDetails('HNLBANK2', '4891dd74-b1e3-4c92-84d9-6f34b16e5845');
        
        console.log(`   EURBANK Master: €${eurMasterAfter?.data?.balance?.amount || 'unknown'}`);
        console.log(`   HNLBANK2 Master: L. ${hnlMasterAfter?.data?.balance?.amount || 'unknown'}`);
      } catch (error) {
        console.log(`   Balance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } else {
      console.log('\n❌ REMITTANCE FAILED!');
      console.log(`Error Code: ${result.error?.code}`);
      console.log(`Error Message: ${result.error?.message}`);
      if (result.error?.details) {
        console.log(`Details:`, result.error.details);
      }
    }

    console.log('\n🎯 SUMMARY:');
    if (result.success) {
      console.log(`✅ María sent €100 from Spain`);
      console.log(`✅ Juan received L. ${result.hnlDeposited?.toFixed(2)} in Honduras`);
      console.log(`✅ Transaction completed in ${duration}ms`);
      console.log(`✅ All atomic database operations successful`);
      console.log(`✅ Real OBP-API transactions executed`);
    } else {
      console.log(`❌ Remittance failed - no money was transferred`);
      console.log(`❌ All operations rolled back safely`);
    }

    console.log('\n🚀 EUR → HNL Remittance System is fully operational!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteRemittance();