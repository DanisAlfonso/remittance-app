#!/usr/bin/env tsx

/**
 * Check Bank Accounts and Funds
 * 
 * Check all accounts in EURBANK and HNLBANK2 and their current balances
 */

import { obpApiService } from '../../src/services/obp-api';

async function checkBankAccountsAndFunds() {
  try {
    console.log('🏦 CHECKING BANK ACCOUNTS AND FUNDS\n');
    console.log('='.repeat(50));

    // Check EURBANK accounts
    console.log('💶 EURBANK ACCOUNTS');
    console.log('-'.repeat(30));
    
    try {
      // Check EURBANK master account
      console.log('1. EURBANK Master Account:');
      const eurMaster = await obpApiService.getAccountDetails('EURBANK', 'f8ea80af-7e83-4211-bca7-d8fc53094c1c');
      
      if (eurMaster.success && eurMaster.data) {
        console.log(`   ✅ Account: ${eurMaster.data.id}`);
        console.log(`   📋 Label: ${eurMaster.data.label || 'EURBANK Master'}`);
        console.log(`   💰 Balance: ${eurMaster.data.balance?.amount || 'Unknown'} ${eurMaster.data.balance?.currency || 'EUR'}`);
        console.log(`   📧 IBAN: ${eurMaster.data.iban || 'N/A'}`);
      } else {
        console.log(`   ❌ Failed to get EURBANK master: ${eurMaster.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking EURBANK master: ${error}`);
    }

    console.log('\n💵 HNLBANK2 ACCOUNTS');
    console.log('-'.repeat(30));

    try {
      // Check HNLBANK2 master account
      console.log('1. HNLBANK2 Master Account:');
      const hnlMaster = await obpApiService.getAccountDetails('HNLBANK2', '4891dd74-b1e3-4c92-84d9-6f34b16e5845');
      
      if (hnlMaster.success && hnlMaster.data) {
        console.log(`   ✅ Account: ${hnlMaster.data.id}`);
        console.log(`   📋 Label: ${hnlMaster.data.label || 'HNLBANK2 Master'}`);
        console.log(`   💰 Balance: ${hnlMaster.data.balance?.amount || 'Unknown'} ${hnlMaster.data.balance?.currency || 'HNL'}`);
        console.log(`   📧 IBAN: ${hnlMaster.data.iban || 'N/A'}`);
      } else {
        console.log(`   ❌ Failed to get HNLBANK2 master: ${hnlMaster.error}`);
      }

      // Check recipient accounts in HNLBANK2
      const recipients = [
        { name: 'Juan Pérez', id: '625fede6-0750-485d-acd7-ca85eda46263' },
        { name: 'María López', id: '5820cb10-0b27-43d5-87af-223f9e1ba076' },
        { name: 'Carlos Mendoza', id: '55c0f41a-cbca-4704-b5b2-f155f60eb3b2' }
      ];

      console.log('\n2. HNLBANK2 Recipient Accounts:');
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        console.log(`   ${i + 1}. ${recipient.name}:`);
        
        try {
          const account = await obpApiService.getAccountDetails('HNLBANK2', recipient.id);
          
          if (account.success && account.data) {
            console.log(`      ✅ Account: ${account.data.id}`);
            console.log(`      📋 Label: ${account.data.label || recipient.name}`);
            console.log(`      💰 Balance: ${account.data.balance?.amount || 'Unknown'} ${account.data.balance?.currency || 'HNL'}`);
            console.log(`      📧 IBAN: ${account.data.iban || 'N/A'}`);
          } else {
            console.log(`      ❌ Failed to get account: ${account.error}`);
          }
        } catch (error) {
          console.log(`      ❌ Error: ${error}`);
        }
        console.log('');
      }

    } catch (error) {
      console.log(`   ❌ Error checking HNLBANK2 accounts: ${error}`);
    }

    // Summary
    console.log('\n📊 FUNDS SUMMARY');
    console.log('='.repeat(50));
    
    // Check if master accounts have sufficient funds for testing
    const eurMasterCheck = await obpApiService.getAccountDetails('EURBANK', 'f8ea80af-7e83-4211-bca7-d8fc53094c1c');
    const hnlMasterCheck = await obpApiService.getAccountDetails('HNLBANK2', '4891dd74-b1e3-4c92-84d9-6f34b16e5845');
    
    console.log('💶 EURBANK Master:');
    if (eurMasterCheck.success && eurMasterCheck.data?.balance) {
      const eurBalance = parseFloat(eurMasterCheck.data.balance.amount || '0');
      console.log(`   Balance: €${eurBalance.toFixed(2)}`);
      if (eurBalance >= 1000) {
        console.log('   ✅ Sufficient EUR funds for testing');
      } else {
        console.log('   ⚠️  Low EUR funds - may need funding');
      }
    } else {
      console.log('   ❌ Cannot determine EUR balance');
    }

    console.log('\n💵 HNLBANK2 Master:');
    if (hnlMasterCheck.success && hnlMasterCheck.data?.balance) {
      const hnlBalance = parseFloat(hnlMasterCheck.data.balance.amount || '0');
      console.log(`   Balance: L.${hnlBalance.toFixed(2)} HNL`);
      if (hnlBalance >= 50000) {
        console.log('   ✅ Sufficient HNL funds for remittances');
      } else {
        console.log('   ⚠️  Low HNL funds - may need funding');
      }
    } else {
      console.log('   ❌ Cannot determine HNL balance');
    }

    console.log('\n🎯 REMITTANCE READINESS:');
    const eurReady = eurMasterCheck.success && parseFloat(eurMasterCheck.data?.balance?.amount || '0') >= 1000;
    const hnlReady = hnlMasterCheck.success && parseFloat(hnlMasterCheck.data?.balance?.amount || '0') >= 50000;
    
    if (eurReady && hnlReady) {
      console.log('✅ Both banks have sufficient funds for EUR → HNL remittances');
      console.log('🚀 Ready for testing remittance flow!');
    } else {
      console.log('⚠️  One or both banks may need funding:');
      if (!eurReady) console.log('   - EURBANK needs EUR funding');
      if (!hnlReady) console.log('   - HNLBANK2 needs HNL funding');
      console.log('\n💡 Use funding scripts if needed:');
      console.log('   - npm run fund-eur-master (for EURBANK)');
      console.log('   - npm run fund-hnl-master (for HNLBANK2)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBankAccountsAndFunds();