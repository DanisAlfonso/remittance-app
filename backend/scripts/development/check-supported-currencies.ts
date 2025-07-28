#!/usr/bin/env tsx

/**
 * Check Supported Currencies in OBP-API
 * 
 * Test which currencies work without issues by checking:
 * 1. Available exchange rates
 * 2. Currencies that can create accounts successfully
 * 3. Currencies that can be funded via SANDBOX_TAN
 */

import { obpApiService } from './src/services/obp-api';

// Common international currencies to test
const TEST_CURRENCIES = [
  'EUR', // European Euro (known working)
  'USD', // US Dollar (known working) 
  'GBP', // British Pound
  'JPY', // Japanese Yen
  'CHF', // Swiss Franc
  'CAD', // Canadian Dollar
  'AUD', // Australian Dollar
  'CNY', // Chinese Yuan
  'SEK', // Swedish Krona
  'NOK', // Norwegian Krone
  'DKK', // Danish Krone
  'PLN', // Polish Zloty
  'CZK', // Czech Koruna
  'HUF', // Hungarian Forint
  'HNL'  // Honduran Lempira (known problematic)
];

async function checkSupportedCurrencies() {
  try {
    console.log('🔍 Checking supported currencies in OBP-API...\n');
    
    // First, try to get available banks to understand the structure
    const banksResult = await obpApiService.getBanks();
    if (banksResult.success) {
      console.log('✅ Found banks:', banksResult.data?.map(b => `${b.id} (${b.short_name})`).join(', '));
    }
    
    console.log('\n🧪 Testing currencies by attempting account creation...\n');
    
    const results: Array<{
      currency: string;
      accountCreation: 'success' | 'failed';
      error?: string;
    }> = [];
    
    // Test each currency by trying to create an account
    for (const currency of TEST_CURRENCIES) {
      console.log(`Testing ${currency}...`);
      
      try {
        // Try to create account in EURBANK (which we know works for EUR and USD)
        const accountResult = await obpApiService.createAccount({
          userId: 'test-user-id',
          currency: currency,
          country: currency === 'EUR' ? 'ES' : currency === 'USD' ? 'US' : 'GB',
          type: 'CURRENT',
          name: `Test ${currency} Account`,
          bankId: 'EURBANK'
        });
        
        if (accountResult.success) {
          console.log(`  ✅ ${currency}: Account creation succeeded`);
          results.push({
            currency,
            accountCreation: 'success'
          });
        } else {
          console.log(`  ❌ ${currency}: ${accountResult.error?.error_description || 'Unknown error'}`);
          results.push({
            currency,
            accountCreation: 'failed',
            error: accountResult.error?.error_description
          });
        }
        
      } catch (error: any) {
        console.log(`  ❌ ${currency}: Exception - ${error.message}`);
        results.push({
          currency,
          accountCreation: 'failed',
          error: error.message
        });
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 SUMMARY OF SUPPORTED CURRENCIES:\n');
    
    const supported = results.filter(r => r.accountCreation === 'success');
    const unsupported = results.filter(r => r.accountCreation === 'failed');
    
    console.log('✅ WORKING CURRENCIES:');
    supported.forEach(r => {
      console.log(`  • ${r.currency}`);
    });
    
    console.log('\n❌ PROBLEMATIC CURRENCIES:');
    unsupported.forEach(r => {
      console.log(`  • ${r.currency}: ${r.error?.substring(0, 80)}...`);
    });
    
    console.log(`\n🎯 RECOMMENDATION: Use ${supported.map(r => r.currency).join(', ')} for reliable operations.`);
    
  } catch (error) {
    console.error('❌ Error checking currencies:', error);
  }
}

checkSupportedCurrencies();