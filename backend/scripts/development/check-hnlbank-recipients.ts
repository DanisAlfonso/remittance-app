#!/usr/bin/env tsx

/**
 * Check HNLBANK Recipients Balance
 */

import { obpApiService } from '../../src/services/obp-api';

const recipients = [
  {
    name: 'Juan Pérez',
    accountId: '4d21f8a9-f820-442d-8f2d-0d672b814a4c'
  },
  {
    name: 'María López',
    accountId: '7237c7a3-8318-474a-bb68-d6a173add54e'
  },
  {
    name: 'Carlos Mendoza',
    accountId: '30c38721-7d35-4a6f-8cd9-7faa5c2cbb04'
  }
];

async function checkHNLBANKRecipients() {
  try {
    console.log('🏦 Checking HNLBANK Recipients...\n');
    console.log('='.repeat(50));

    for (const recipient of recipients) {
      console.log(`👤 ${recipient.name}:`);
      
      try {
        const accountDetails = await obpApiService.getAccountDetails('HNLBANK', recipient.accountId);
        
        if (accountDetails.success && accountDetails.data) {
          console.log(`   ✅ Account: ${accountDetails.data.id}`);
          console.log(`   💰 Balance: ${accountDetails.data.balance?.amount || 'Unknown'} ${accountDetails.data.balance?.currency || 'HNL'}`);
          console.log(`   📧 IBAN: ${accountDetails.data.iban || 'N/A'}`);
          console.log(`   🏦 Bank: ${accountDetails.data.bank_name || 'HNLBANK'}`);
        } else {
          console.log(`   ❌ Failed to get account details: ${accountDetails.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
      
      console.log('');
    }

    console.log('🎉 HNLBANK recipients check completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkHNLBANKRecipients();