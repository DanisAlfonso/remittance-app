#!/usr/bin/env tsx

/**
 * Check Recipient Account Currency
 * 
 * Check what currency the recipient account was actually created with
 */

import { obpApiService } from '../../src/services/obp-api';

async function checkRecipientCurrency() {
  try {
    console.log('🔍 Checking recipient account currency...\n');

    const recipientAccountId = '625fede6-0750-485d-acd7-ca85eda46263';
    
    // Check account details
    const accountDetails = await obpApiService.getAccountDetails('HNLBANK2', recipientAccountId);
    
    if (accountDetails.success && accountDetails.data) {
      console.log('✅ Recipient Account Details:');
      console.log(`   Account ID: ${accountDetails.data.id}`);
      console.log(`   Label: ${accountDetails.data.label}`);
      console.log(`   Currency: ${accountDetails.data.currency}`);
      console.log(`   Balance: ${accountDetails.data.balance.amount} ${accountDetails.data.balance.currency}`);
      console.log(`   IBAN: ${accountDetails.data.iban}`);
      console.log(`   Bank: ${accountDetails.data.bank_id}`);
    } else {
      console.error('❌ Failed to get account details:', accountDetails.error);
    }

    // Also check master account
    console.log('\n🏦 Checking HNLBANK2 Master Account:');
    const masterAccountId = '4891dd74-b1e3-4c92-84d9-6f34b16e5845';
    const masterDetails = await obpApiService.getAccountDetails('HNLBANK2', masterAccountId);
    
    if (masterDetails.success && masterDetails.data) {
      console.log('✅ Master Account Details:');
      console.log(`   Account ID: ${masterDetails.data.id}`);
      console.log(`   Label: ${masterDetails.data.label}`);
      console.log(`   Currency: ${masterDetails.data.currency}`);
      console.log(`   Balance: ${masterDetails.data.balance.amount} ${masterDetails.data.balance.currency}`);
      console.log(`   IBAN: ${masterDetails.data.iban}`);
      console.log(`   Bank: ${masterDetails.data.bank_id}`);
    } else {
      console.error('❌ Failed to get master account details:', masterDetails.error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRecipientCurrency();