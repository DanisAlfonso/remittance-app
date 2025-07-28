#!/usr/bin/env tsx

/**
 * Find HNL Account Location
 * 
 * Determine which bank actually contains the HNL account
 */

import { obpApiService } from './src/services/obp-api';

async function findHNLAccount() {
  try {
    console.log('🔍 Finding where HNL account 692702d5-11f3-4af3-b38b-a532f43978e3 actually exists...');
    
    const accountId = '692702d5-11f3-4af3-b38b-a532f43978e3';
    const banksToCheck = ['EURBANK', 'HNLBANK', 'HNLBANK2', 'USDBANK', 'OBP'];
    
    for (const bankId of banksToCheck) {
      console.log(`\n🏦 Checking ${bankId}...`);
      
      try {
        const result = await obpApiService.getAccountDetails(bankId, accountId);
        
        if (result.success && result.data) {
          console.log(`✅ FOUND in ${bankId}!`);
          console.log(`  Account Holder: ${result.data.account_holder_name}`);
          console.log(`  Currency: ${result.data.currency}`);
          console.log(`  IBAN: ${result.data.iban}`);
          console.log(`  Account Number: ${result.data.account_number}`);
          
          console.log(`\n🎯 ANSWER: The HNL account is in ${bankId}, not HNLBANK!`);
          console.log(`\n📝 Correct master account configuration should be:`);
          console.log(`  HNL: {`);
          console.log(`    bankId: '${bankId}',`);
          console.log(`    accountId: '${accountId}',`);
          console.log(`    iban: '${result.data.iban}',`);
          console.log(`    currency: 'HNL'`);
          console.log(`  }`);
          
          return; // Found it, stop searching
          
        } else {
          console.log(`❌ Not found in ${bankId}`);
        }
        
      } catch (error) {
        console.log(`❌ Error checking ${bankId}: ${error}`);
      }
    }
    
    console.log('\n❌ HNL account not found in any bank!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findHNLAccount();