#!/usr/bin/env tsx

/**
 * Add HNL Exchange Rate to OBP-API
 * 
 * Add EUR↔HNL exchange rate using real market rates from exchange API
 * This enables HNL funding via SANDBOX_TAN without modifying source code
 */

import { obpApiService } from './src/services/obp-api';

async function getRealExchangeRate(): Promise<{ eurToHnl: number; hnlToEur: number }> {
  try {
    console.log('🌐 Fetching real EUR/HNL exchange rate from API...');
    
    const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');
    const data = await response.json();
    
    const eurToHnlRate = data.eur.hnl;
    const hnlToEurRate = 1 / eurToHnlRate;
    
    console.log(`✅ Live rates fetched:`);
    console.log(`  • 1 EUR = ${eurToHnlRate} HNL`);
    console.log(`  • 1 HNL = ${hnlToEurRate.toFixed(8)} EUR`);
    
    return { eurToHnl: eurToHnlRate, hnlToEur: hnlToEurRate };
    
  } catch (error) {
    console.error('❌ Failed to fetch live rates, using fallback...');
    // Fallback to a reasonable rate if API fails
    const eurToHnlRate = 30.85;
    const hnlToEurRate = 1 / eurToHnlRate;
    return { eurToHnl: eurToHnlRate, hnlToEur: hnlToEurRate };
  }
}

async function addHNLExchangeRate() {
  try {
    console.log('💱 Adding EUR↔HNL exchange rate to OBP-API...\n');
    
    // Get real exchange rates
    const rates = await getRealExchangeRate();
    
    // Add EUR to HNL rate for EURBANK
    console.log('\n➡️ Adding EUR → HNL exchange rate to EURBANK...');
    const eurToHnlResult = await addExchangeRate('EURBANK', 'EUR', 'HNL', rates.eurToHnl, rates.hnlToEur);
    
    if (eurToHnlResult.success) {
      console.log('✅ EUR → HNL rate added successfully');
    } else {
      console.log('❌ EUR → HNL rate failed:', eurToHnlResult.error);
    }
    
    // Add HNL to EUR rate for HNLBANK
    console.log('\n⬅️ Adding HNL → EUR exchange rate to HNLBANK...');
    const hnlToEurResult = await addExchangeRate('HNLBANK', 'HNL', 'EUR', rates.hnlToEur, rates.eurToHnl);
    
    if (hnlToEurResult.success) {
      console.log('✅ HNL → EUR rate added successfully');
    } else {
      console.log('❌ HNL → EUR rate failed:', hnlToEurResult.error);
    }
    
    // Also try adding to both banks for completeness
    console.log('\n🔄 Adding cross-rates for completeness...');
    await addExchangeRate('EURBANK', 'HNL', 'EUR', rates.hnlToEur, rates.eurToHnl);
    await addExchangeRate('HNLBANK', 'EUR', 'HNL', rates.eurToHnl, rates.hnlToEur);
    
    if (eurToHnlResult.success || hnlToEurResult.success) {
      console.log('\n🎉 Exchange rates configured! Now try funding the HNL account again.');
      console.log('💡 Run: npx tsx create-and-fund-hnl.ts');
    } else {
      console.log('\n⚠️ Exchange rate configuration failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Error adding exchange rates:', error);
  }
}

async function addExchangeRate(
  bankId: string, 
  fromCurrency: string, 
  toCurrency: string, 
  rate: number, 
  inverseRate: number
): Promise<{ success: boolean; error?: any }> {
  
  try {
    // Get authentication token
    const tokenResult = await (obpApiService as any).getDirectLoginToken();
    if (!tokenResult.success) {
      return { success: false, error: 'Failed to get auth token' };
    }
    
    const token = tokenResult.token;
    // OBP-API expects date format: "yyyy-MM-dd'T'HH:mm:ss'Z'" (no milliseconds)
    const today = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    
    // Prepare exchange rate data according to OBP-API v5.1.0 format
    const exchangeRateData = {
      bank_id: bankId,
      from_currency_code: fromCurrency,
      to_currency_code: toCurrency,
      conversion_value: rate,
      inverse_conversion_value: inverseRate,
      effective_date: today
    };
    
    console.log(`📋 Adding rate: ${fromCurrency} → ${toCurrency} = ${rate.toFixed(6)}`);
    
    // Make the API call to add exchange rate using v5.1.0 endpoint
    const response = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/${bankId}/fx`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${token}"`
      },
      body: JSON.stringify(exchangeRateData)
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      console.log(`  ✅ Success: ${response.status}`);
      return { success: true };
    } else {
      console.log(`  ❌ Failed: ${response.status} - ${responseText}`);
      return { success: false, error: `HTTP ${response.status}: ${responseText}` };
    }
    
  } catch (error) {
    console.log(`  ❌ Exception: ${error}`);
    return { success: false, error: error };
  }
}

addHNLExchangeRate();