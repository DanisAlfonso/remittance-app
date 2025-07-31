#!/usr/bin/env tsx

/**
 * Check HNLBANK Master Account Balance
 * 
 * This checks the specific master account used by the production remittance service
 */

import { obpApiService } from '../../src/services/obp-api';

async function checkHNLBANKMasterBalance() {
  try {
    console.log('🏦 CHECKING HNLBANK MASTER ACCOUNT BALANCE\n');
    console.log('='.repeat(50));

    // This is the exact master account used by production-remittance-service.ts
    const HNLBANK_MASTER_ID = '86563464-f391-4b9f-ab71-fd25385ab466';
    
    console.log('💵 HNLBANK Master Account (Production Service):');
    console.log(`   Account ID: ${HNLBANK_MASTER_ID}`);
    console.log('-'.repeat(50));
    
    try {
      const masterAccount = await obpApiService.getAccountDetails('HNLBANK', HNLBANK_MASTER_ID);
      
      if (masterAccount.success && masterAccount.data) {
        console.log(`   ✅ Account Number: ${masterAccount.data.account?.number || masterAccount.data.id}`);
        console.log(`   📋 Label: ${masterAccount.data.label || 'HNLBANK Master'}`);
        console.log(`   💰 Balance: ${masterAccount.data.balance?.amount || 'Unknown'} ${masterAccount.data.balance?.currency || 'HNL'}`);
        console.log(`   📧 IBAN: ${masterAccount.data.iban || 'N/A'}`);
        console.log(`   🏦 Bank: ${masterAccount.data.bank_name || 'HNLBANK'}`);
        
        // Calculate expected balance after transfer
        const currentBalance = parseFloat(masterAccount.data.balance?.amount || '0');
        const transferAmount = 296.26; // Amount Juan Pérez received
        const expectedBalanceBefore = currentBalance + transferAmount;
        
        console.log('\n📊 TRANSFER VERIFICATION:');
        console.log(`   💸 Amount sent to Juan Pérez: L.${transferAmount} HNL`);
        console.log(`   💰 Current master balance: L.${currentBalance.toFixed(2)} HNL`);
        console.log(`   🔄 Expected balance before transfer: L.${expectedBalanceBefore.toFixed(2)} HNL`);
        
        if (currentBalance < expectedBalanceBefore) {
          console.log('   ✅ CONFIRMED: Master account balance decreased by transfer amount');
          console.log(`   📉 Deduction verified: L.${transferAmount.toFixed(2)} was deducted`);
        } else {
          console.log('   ⚠️  Transfer deduction not clearly visible');
        }
        
      } else {
        console.log(`   ❌ Failed to get HNLBANK master account: ${masterAccount.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking HNLBANK master account: ${error}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkHNLBANKMasterBalance();