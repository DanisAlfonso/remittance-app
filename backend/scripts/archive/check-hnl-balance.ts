#!/usr/bin/env tsx

/**
 * Check HNL Account Balance
 * 
 * Verify if the HNL account funding was successful
 */

import { obpApiService } from './src/services/obp-api';

async function checkHNLBalance() {
  try {
    console.log('🔍 Checking HNL account balance...');
    
    const bankId = 'EURBANK'; // HNL account was created in EURBANK
    const accountId = 'c9b78aaa-e968-4be0-ad27-907ee0c435d5';
    
    // Get account details
    const result = await obpApiService.getAccountDetails(bankId, accountId);
    
    if (result.success && result.data) {
      console.log('✅ HNL Account Details:');
      console.log(`  Account Holder: ${result.data.account_holder_name}`);
      console.log(`  Currency: ${result.data.currency}`);
      console.log(`  IBAN: ${result.data.iban}`);
      console.log(`  Account Number: ${result.data.account_number}`);
      
      // Also check current balance status from banks overview
      console.log('\n🏦 Checking master account status...');
      const banksResult = await obpApiService.getBanksAndMasterAccountStatus();
      
      if (banksResult.success && banksResult.data) {
        console.log('\n📊 Current Master Account Balances:');
        const masterAccounts = banksResult.data.master_accounts;
        
        for (const [currency, account] of Object.entries(masterAccounts)) {
          console.log(`  💰 ${currency}: ${(account as any).balance} ${currency} (${(account as any).status})`);
        }
      }
      
    } else {
      console.error('❌ Failed to get account details:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkHNLBalance();