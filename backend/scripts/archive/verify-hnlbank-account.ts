#!/usr/bin/env tsx

/**
 * Verify HNLBANK Account
 * 
 * Verify the account we created in HNLBANK exists and check its status
 */

import { obpApiService } from './src/services/obp-api';

async function verifyHNLBankAccount() {
  try {
    console.log('🔍 Verifying HNLBANK account...');
    
    const bankId = 'HNLBANK';
    const accountId = '86563464-f391-4b9f-ab71-fd25385ab466';
    
    console.log(`📋 Checking account ${accountId} in ${bankId}...`);
    
    try {
      const result = await obpApiService.getAccountDetails(bankId, accountId);
      
      if (result.success && result.data) {
        console.log('✅ HNLBANK Account Verified:');
        console.log(`  Bank: ${bankId}`);
        console.log(`  Account Holder: ${result.data.account_holder_name}`);
        console.log(`  Currency: ${result.data.currency}`);
        console.log(`  IBAN: ${result.data.iban}`);
        console.log(`  Account Number: ${result.data.account_number}`);
        console.log(`  Account ID: ${accountId}`);
        
        console.log('\n🎉 SUCCESS: HNLBANK now has a working HNL account!');
        
        console.log('\n📝 Master Account Configuration for HNLBANK:');
        console.log(`  HNL: {`);
        console.log(`    bankId: '${bankId}',`);
        console.log(`    accountId: '${accountId}',`);
        console.log(`    iban: '${result.data.iban}',`);
        console.log(`    bic: 'CATLBK1XXXX',`);
        console.log(`    currency: 'HNL',`);
        console.log(`    country: 'HN'`);
        console.log(`  }`);
        
        return {
          bankId,
          accountId,
          iban: result.data.iban,
          currency: result.data.currency,
          accountHolder: result.data.account_holder_name
        };
        
      } else {
        console.log('❌ Could not verify account:', result.error);
        return null;
      }
      
    } catch (error) {
      console.log('❌ Error accessing HNLBANK account:', error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Also update the master account configuration
async function updateMasterAccountConfig() {
  const accountInfo = await verifyHNLBankAccount();
  
  if (accountInfo) {
    console.log('\n✅ HNLBANK account verified successfully!');
    console.log('\n🔄 Updating master account configuration...');
    
    // The configuration should be updated in master-account-banking.ts to use HNLBANK
    console.log('\n📝 Update needed in src/services/master-account-banking.ts:');
    console.log('Change the HNL configuration from EURBANK to:');
    console.log(`  HNL: {`);
    console.log(`    bankId: '${accountInfo.bankId}',  // Now using HNLBANK!`);
    console.log(`    accountId: '${accountInfo.accountId}',`);
    console.log(`    iban: '${accountInfo.iban}',`);
    console.log(`    bic: 'CATLBK1XXXX',`);
    console.log(`    currency: 'HNL',`);
    console.log(`    country: 'HN'`);
    console.log(`  }`);
  }
}

updateMasterAccountConfig();