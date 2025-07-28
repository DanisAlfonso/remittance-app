#!/usr/bin/env node

/**
 * Configure Real-Time Exchange Rates for EUR-HNL
 * 
 * This script:
 * 1. Fetches current EUR-HNL exchange rates using real-time APIs
 * 2. Configures OBP-API with the current rates
 * 3. Funds the HNL master account with 100,000 lempiras
 * 
 * Uses multiple exchange rate sources for reliability:
 * - ExchangeRate-API.com (paid subscription)
 * - GitHub fawazahmed0/exchange-api (free)
 */

import { exchangeRateService } from './src/services/exchange-rates.ts';
import { obpApiService } from './src/services/obp-api.ts';

async function configureRealTimeExchangeRates() {
  console.log('🚀 Configuring Real-Time EUR-HNL Exchange Rates');
  console.log('=' .repeat(60));
  console.log('');
  
  try {
    // Step 1: Get current real-time exchange rates
    console.log('💱 Fetching current EUR-HNL exchange rates...');
    const ratesResult = await exchangeRateService.getEURHNLRates();
    
    if (!ratesResult.success) {
      throw new Error(`Failed to fetch exchange rates: ${ratesResult.error?.error_description}`);
    }
    
    console.log('✅ Real-time exchange rates fetched successfully!');
    console.log(`   Source: ${ratesResult.source}`);
    console.log(`   1 EUR = ${ratesResult.eurToHnl} HNL`);
    console.log(`   1 HNL = ${ratesResult.hnlToEur} EUR`);
    console.log(`   Timestamp: ${new Date(ratesResult.timestamp).toLocaleString()}`);
    console.log('');
    
    // Step 2: Test conversion
    console.log('🧮 Testing currency conversion...');
    const testConversion = await exchangeRateService.convertCurrency(100, 'EUR', 'HNL');
    if (testConversion.success) {
      console.log(`   Test: 100 EUR = ${testConversion.convertedAmount.toFixed(2)} HNL`);
    }
    console.log('');
    
    // Step 3: Attempt to configure OBP-API with these rates
    console.log('🔧 Attempting to configure OBP-API with real-time rates...');
    
    // Ensure OBP-API authentication
    const authCheck = await obpApiService.ensureValidToken();
    if (!authCheck) {
      throw new Error('OBP-API authentication failed');
    }
    
    // Try different potential FX configuration endpoints
    const fxConfigEndpoints = [
      '/obp/v5.1.0/banks/EURBANK/fx-rates',
      '/obp/v5.1.0/banks/HNLBANK/fx-rates',
      '/obp/v5.1.0/fx-rates',
      '/obp/v5.1.0/management/fx-rates',
      '/obp/v5.1.0/banks/EURBANK/foreign-exchange-rates',
      '/obp/v5.1.0/foreign-exchange-rates'
    ];
    
    // EUR → HNL rate configuration
    const eurToHnlConfig = {
      bank_id: 'EURBANK',
      from_currency_code: 'EUR',
      to_currency_code: 'HNL',
      conversion_value: ratesResult.eurToHnl,
      inverse_conversion_value: ratesResult.hnlToEur,
      effective_date: new Date().toISOString()
    };
    
    // HNL → EUR rate configuration  
    const hnlToEurConfig = {
      bank_id: 'HNLBANK',
      from_currency_code: 'HNL',
      to_currency_code: 'EUR',
      conversion_value: ratesResult.hnlToEur,
      inverse_conversion_value: ratesResult.eurToHnl,
      effective_date: new Date().toISOString()
    };
    
    let fxConfigured = false;
    
    console.log('   Testing FX configuration endpoints...');
    for (const endpoint of fxConfigEndpoints) {
      console.log(`   🔄 Trying: POST ${endpoint}`);
      
      // Try EUR → HNL
      const eurResult = await obpApiService.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(eurToHnlConfig)
      });
      
      if (eurResult.success) {
        console.log(`   ✅ EUR → HNL rate configured at ${endpoint}`);
        console.log(`      Response:`, eurResult.data);
        
        // Try HNL → EUR
        const hnlResult = await obpApiService.makeRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify(hnlToEurConfig)
        });
        
        if (hnlResult.success) {
          console.log(`   ✅ HNL → EUR rate configured at ${endpoint}`);
          fxConfigured = true;
          break;
        }
      } else if (eurResult.statusCode === 404) {
        console.log(`   ❌ ${endpoint} - Not Found`);
      } else {
        console.log(`   ⚠️  ${endpoint} - ${eurResult.error?.error_description || eurResult.error}`);
      }
    }
    
    if (!fxConfigured) {
      console.log('   ⚠️  Could not find working FX configuration endpoint');
      console.log('   💡 This may be expected if OBP-API handles FX differently');
    }
    console.log('');
    
    // Step 4: Attempt HNL funding with real-time rates configured
    console.log('💰 Attempting HNL master account funding...');
    const fundingResult = await obpApiService.fundHNLMasterAccount(100000);
    
    if (fundingResult.success) {
      console.log('✅ HNL Master Account funded successfully!');
      console.log(`   Transaction ID: ${fundingResult.data?.transaction_id}`);
      console.log(`   Amount Added: L.${fundingResult.data?.amount?.toLocaleString()}`);
      console.log(`   New Balance: L.${fundingResult.data?.new_balance}`);
      console.log(`   Status: ${fundingResult.data?.status}`);
    } else {
      console.log('❌ HNL funding failed:');
      console.log(`   Error: ${fundingResult.error?.error_description || fundingResult.error}`);
      
      // If still failing, the issue might be deeper in OBP-API configuration
      console.log('');
      console.log('🔍 ANALYSIS: The currency conversion error suggests that:');
      console.log('   1. OBP-API may not have a built-in FX configuration API in v5.1.0 BLEEDING_EDGE');
      console.log('   2. Exchange rates might need to be configured at the connector level');
      console.log('   3. The sandbox environment may have limitations with currency conversion');
      console.log('');
      console.log('💡 ALTERNATIVE APPROACHES:');
      console.log('   1. Use only EUR transactions and handle HNL conversion in our app layer');
      console.log('   2. Configure exchange rates in OBP-API props/configuration files');
      console.log('   3. Use direct database funding for development purposes');
    }
    console.log('');
    
    // Step 5: Show current exchange rate cache status
    console.log('📊 Exchange Rate Service Status:');
    const cacheStatus = exchangeRateService.getCacheStatus();
    console.log(`   Cached rates: ${cacheStatus.size}`);
    cacheStatus.entries.forEach(entry => {
      const ageMinutes = Math.floor(entry.age / 60000);
      const expiresMinutes = Math.floor(entry.expiresIn / 60000);
      console.log(`   ${entry.pair}: ${entry.rate} (age: ${ageMinutes}m, expires: ${expiresMinutes}m)`);
    });
    
    return {
      ratesFetched: ratesResult.success,
      fxConfigured,
      fundingSuccess: fundingResult.success,
      rates: {
        eurToHnl: ratesResult.eurToHnl,
        hnlToEur: ratesResult.hnlToEur,
        source: ratesResult.source
      }
    };
    
  } catch (error) {
    console.error('💥 Error during real-time FX configuration:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const result = await configureRealTimeExchangeRates();
    
    console.log('📋 FINAL SUMMARY:');
    console.log('=' .repeat(40));
    console.log(`✅ Real-time rates fetched: ${result.ratesFetched}`);
    console.log(`⚙️  OBP-API FX configured: ${result.fxConfigured}`);
    console.log(`💰 HNL funding successful: ${result.fundingSuccess}`);
    console.log(`💱 Current EUR → HNL: ${result.rates.eurToHnl}`);
    console.log(`💱 Current HNL → EUR: ${result.rates.hnlToEur}`);
    console.log(`📡 Source: ${result.rates.source}`);
    
    if (result.fundingSuccess) {
      console.log('');
      console.log('🎉 SUCCESS! The HNL master account now has 100,000 lempiras');
      console.log('   You can test "Import Test Data" with HNL accounts selected');
    } else {
      console.log('');
      console.log('⚠️  The exchange rate service is working, but OBP-API FX configuration needs investigation');
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\\n✅ Real-time FX configuration script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});