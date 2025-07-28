#!/usr/bin/env node

/**
 * Check Banks and Master Account Balances
 * 
 * This script queries the OBP-API to get information about:
 * - Available banks
 * - Master account balances for EUR and HNL
 */

import { obpApiService } from './src/services/obp-api.ts';

async function checkBanksAndFunds() {
  console.log('🏦 Checking banks and master account funds in OBP-API...\n');
  
  try {
    // Use the new comprehensive status check
    const result = await obpApiService.getBanksAndMasterAccountStatus();
    
    if (!result.success) {
      console.error('❌ Failed to get banks status:', result.error);
      return;
    }
    
    const data = result.data;
    
    console.log('📊 BANKS AND FUNDS REPORT');
    console.log('=' .repeat(50));
    
    // Summary
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Banks: ${data.summary.total_banks}`);
    console.log(`   Active Master Accounts: ${data.summary.total_master_accounts}`);
    console.log(`   Supported Currencies: ${data.summary.currencies_supported.join(', ')}`);
    
    // Master Accounts Status
    console.log(`\n💰 MASTER ACCOUNTS:`);
    console.log(`   EUR Master Account (EURBANK):`);
    console.log(`     Bank ID: ${data.master_accounts.EUR.bank_id}`);
    console.log(`     Account ID: ${data.master_accounts.EUR.account_id}`);
    console.log(`     Balance: ${data.master_accounts.EUR.balance} EUR`);
    console.log(`     Status: ${data.master_accounts.EUR.status}`);
    
    console.log(`   HNL Master Account (HNLBANK):`);
    console.log(`     Bank ID: ${data.master_accounts.HNL.bank_id}`);
    console.log(`     Account ID: ${data.master_accounts.HNL.account_id}`);
    console.log(`     Balance: ${data.master_accounts.HNL.balance} HNL`);
    console.log(`     Status: ${data.master_accounts.HNL.status}`);
    
    // All Banks
    console.log(`\n🏛️ ALL BANKS:`);
    data.banks.forEach((bank, index) => {
      console.log(`   ${index + 1}. ${bank.name} (${bank.id})`);
      if (bank.accounts.length > 0) {
        bank.accounts.forEach((account) => {
          const masterFlag = account.is_master_account ? ' 🎯 MASTER' : '';
          console.log(`      📋 ${account.label} (${account.id.substring(0, 8)}...)`);
          console.log(`         Currency: ${account.currency}`);
          console.log(`         Balance: ${account.balance} ${account.currency}${masterFlag}`);
        });
      } else {
        console.log(`      No accessible accounts`);
      }
      console.log('');
    });
    
    // Funding Status
    console.log(`\n💵 FUNDING STATUS:`);
    const eurBalance = parseFloat(data.master_accounts.EUR.balance) || 0;
    const hnlBalance = parseFloat(data.master_accounts.HNL.balance) || 0;
    
    console.log(`   EUR Master Account: ${eurBalance > 0 ? '✅ FUNDED' : '❌ EMPTY'} (€${eurBalance})`);
    console.log(`   HNL Master Account: ${hnlBalance > 0 ? '✅ FUNDED' : '❌ EMPTY'} (L.${hnlBalance})`);
    
    if (eurBalance === 0 && hnlBalance === 0) {
      console.log(`\n⚠️  WARNING: Both master accounts appear to be empty!`);
      console.log(`   Run "Import Test Data" to fund the accounts.`);
    }
    
  } catch (error) {
    console.error('❌ Error checking banks and funds:', error);
  }
}

// Run the check
checkBanksAndFunds().then(() => {
  console.log('\n✅ Banks and funds check completed.');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});