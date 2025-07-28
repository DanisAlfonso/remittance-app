#!/usr/bin/env node

/**
 * Fund HNL Master Account
 * 
 * This script adds 100,000 lempiras to the HNLBANK master account
 */

import { obpApiService } from './src/services/obp-api.ts';

async function fundHNLAccount() {
  console.log('💰 Adding 100,000 lempiras to HNLBANK master account...\n');
  
  try {
    // Fund the HNL master account with 100,000 lempiras
    console.log('🏦 Calling fundHNLMasterAccount(100000)...');
    const result = await obpApiService.fundHNLMasterAccount(100000);
    
    if (result.success) {
      console.log('✅ HNL Master Account funded successfully!');
      console.log(`   Transaction ID: ${result.data?.transaction_id}`);
      console.log(`   Amount Added: L.${result.data?.amount}`);
      console.log(`   Currency: ${result.data?.currency}`);
      console.log(`   New Balance: L.${result.data?.new_balance}`);
      console.log(`   Status: ${result.data?.status}`);
    } else {
      console.error('❌ Failed to fund HNL master account:', result.error);
      console.error('   Error Code:', result.error?.error);
      console.error('   Description:', result.error?.error_description);
    }
    
  } catch (error) {
    console.error('💥 Error funding HNL master account:', error);
  }
}

// Run the funding
fundHNLAccount().then(() => {
  console.log('\n✅ HNL funding script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});