#!/usr/bin/env tsx

/**
 * Check USD Account Balance
 * 
 * Simple script to verify the USD account funding was successful
 * using the existing backend services.
 */

import { obpApiService } from './src/services/obp-api';

async function checkUSDBalance() {
  try {
    console.log('🔍 Checking USD account balance...');
    
    // First get account details
    const accountResult = await obpApiService.getAccountDetails('EURBANK', '85f53bab-2fb5-4002-ab64-f92a1d88de15');
    
    if (accountResult.success) {
      console.log('✅ Account exists:', accountResult.data?.account_holder_name);
      console.log('Currency:', accountResult.data?.currency);
      console.log('IBAN:', accountResult.data?.iban);
    }
    
    // Then get the balance
    const result = await obpApiService.getAccountBalance('85f53bab-2fb5-4002-ab64-f92a1d88de15');
    
    if (result.success && result.data) {
      console.log('📋 Full account data:', JSON.stringify(result.data, null, 2));
      
      const balance = result.data.balance;
      if (balance) {
        console.log(`✅ USD Account Balance: ${balance.amount} ${balance.currency}`);
        console.log(`Account ID: ${result.data.id}`);
        console.log(`Bank: ${result.data.bank_id}`);
        console.log(`Label: ${result.data.label}`);
        
        if (parseFloat(balance.amount) > 0) {
          console.log('🎉 USD account funding was successful!');
        } else {
          console.log('⚠️ Account balance is still zero - funding may not have completed');
        }
      } else {
        console.log('⚠️ No balance information found in account data');
        console.log(`Account ID: ${result.data.id}`);
        console.log(`Bank: ${result.data.bank_id}`);
        console.log(`Label: ${result.data.label}`);
      }
    } else {
      console.error('❌ Failed to get account info:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUSDBalance();