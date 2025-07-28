#!/usr/bin/env tsx

/**
 * Verify New HNL Account
 * 
 * Check the details and balance of the newly created HNL account
 */

import { obpApiService } from './src/services/obp-api';

async function verifyNewHNLAccount() {
  try {
    console.log('🔍 Verifying new HNL account...');
    
    const bankId = 'EURBANK';
    const accountId = '692702d5-11f3-4af3-b38b-a532f43978e3';
    
    // Get account details
    console.log('📋 Getting account details...');
    const result = await obpApiService.getAccountDetails(bankId, accountId);
    
    if (result.success && result.data) {
      console.log('✅ HNL Account Details:');
      console.log(`  Bank: ${bankId}`);
      console.log(`  Account Holder: ${result.data.account_holder_name}`);
      console.log(`  Currency: ${result.data.currency}`);
      console.log(`  IBAN: ${result.data.iban}`);
      console.log(`  Account Number: ${result.data.account_number}`);
      console.log(`  Account ID: ${accountId}`);
      
      // Check if this account shows up in the master account status
      console.log('\n🏦 Checking updated master account status...');
      const banksResult = await obpApiService.getBanksAndMasterAccountStatus();
      
      if (banksResult.success && banksResult.data) {
        console.log('\n📊 Current Master Account Balances:');
        const masterAccounts = banksResult.data.master_accounts;
        
        for (const [currency, account] of Object.entries(masterAccounts)) {
          console.log(`  💰 ${currency}: ${(account as any).balance} ${currency} (${(account as any).status})`);
        }
        
        // Verify the HNL account is using the new one
        const hnlAccount = masterAccounts.HNL as any;
        if (hnlAccount && hnlAccount.account_id === accountId) {
          console.log('\n✅ Master account configuration updated successfully!');
          console.log(`💰 HNL Balance: ${hnlAccount.balance} HNL`);
        } else {
          console.log('\n⚠️ Master account configuration may need restart to update');
          console.log(`Expected account: ${accountId}`);
          console.log(`Current account: ${hnlAccount?.account_id || 'Unknown'}`);
        }
      }
      
      console.log('\n🎉 New HNL account verification complete!');
      console.log('💰 Account should now have L 50,000 available for remittance operations');
      
    } else {
      console.error('❌ Failed to get account details:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyNewHNLAccount();