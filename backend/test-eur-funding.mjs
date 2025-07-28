#!/usr/bin/env node

/**
 * Test EUR Funding to verify if it actually works
 * 
 * This will test if EUR funding has the same currency conversion issue
 */

import { obpApiService } from './src/services/obp-api.ts';

async function testEURFunding() {
  console.log('🧪 Testing EUR Master Account Funding...\n');
  
  try {
    console.log('💰 Attempting to fund EUR master account with €1000...');
    const result = await obpApiService.fundMasterAccount(1000);
    
    if (result.success) {
      console.log('✅ EUR funding SUCCEEDED!');
      console.log(`   Transaction ID: ${result.data?.transaction_id}`);
      console.log(`   Amount Added: €${result.data?.amount}`);
      console.log(`   New Balance: €${result.data?.new_balance}`);
      console.log(`   Status: ${result.data?.status}`);
    } else {
      console.log('❌ EUR funding FAILED!');
      console.log(`   Error: ${result.error?.error_description}`);
      console.log('   Full error:', result.error);
    }
    
  } catch (error) {
    console.error('💥 EUR funding threw an error:', error.message);
  }
}

testEURFunding().then(() => {
  console.log('\n✅ EUR funding test completed.');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});