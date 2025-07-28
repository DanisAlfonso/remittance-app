#!/usr/bin/env tsx

/**
 * List All Accounts
 * 
 * Check all accounts to see the USD account and its balance
 */

import { obpApiService } from '../../src/services/obp-api';

async function listAllAccounts() {
  try {
    console.log('🔍 Getting all accounts...');
    
    const result = await obpApiService.getBanksAndMasterAccountStatus();
    
    if (result.success && result.data) {
      console.log('📋 Banks and accounts:', JSON.stringify(result.data, null, 2));
    } else {
      console.error('❌ Failed to get banks:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

listAllAccounts();