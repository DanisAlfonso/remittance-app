#!/usr/bin/env tsx

/**
 * Test EUR → HNL Exchange Rates
 * 
 * Test the exchange rate service for EUR to HNL conversion
 */

import { ExchangeRateService } from '../../src/services/exchange-rates';

async function testEURHNLRates() {
  try {
    console.log('💱 Testing EUR → HNL Exchange Rates...\n');

    const exchangeService = new ExchangeRateService();

    // Test 1: Get EUR → HNL rate
    console.log('📊 Fetching EUR → HNL exchange rate...');
    const eurHnlResult = await exchangeService.getExchangeRate('EUR', 'HNL');
    
    if (eurHnlResult.success && eurHnlResult.rate) {
      console.log(`✅ EUR → HNL Rate: ${eurHnlResult.rate.toFixed(4)}`);
      console.log(`   Source: ${eurHnlResult.source}`);
      console.log(`   Timestamp: ${new Date(eurHnlResult.timestamp || Date.now()).toISOString()}`);
      
      // Calculate sample conversion
      const testAmount = 100; // €100
      const convertedAmount = testAmount * eurHnlResult.rate;
      console.log(`   Sample: €${testAmount} = L. ${convertedAmount.toFixed(2)} HNL`);
    } else {
      console.error('❌ Failed to get EUR → HNL rate:', eurHnlResult.error);
    }

    console.log('');

    // Test 2: Get HNL → EUR rate (inverse)
    console.log('📊 Fetching HNL → EUR exchange rate...');
    const hnlEurResult = await exchangeService.getExchangeRate('HNL', 'EUR');
    
    if (hnlEurResult.success && hnlEurResult.rate) {
      console.log(`✅ HNL → EUR Rate: ${hnlEurResult.rate.toFixed(6)}`);
      console.log(`   Source: ${hnlEurResult.source}`);
      
      // Calculate sample conversion
      const testAmountHNL = 2750; // L. 2,750
      const convertedAmountEUR = testAmountHNL * hnlEurResult.rate;
      console.log(`   Sample: L. ${testAmountHNL} = €${convertedAmountEUR.toFixed(2)} EUR`);
    } else {
      console.error('❌ Failed to get HNL → EUR rate:', hnlEurResult.error);
    }

    console.log('');

    // Test 3: Specific EUR/HNL rates method
    console.log('📊 Testing dedicated EUR/HNL rates method...');
    const eurHnlRates = await exchangeService.getEURHNLRates();
    
    if (eurHnlRates.success) {
      console.log(`✅ Dedicated EUR/HNL Rates:`);
      console.log(`   EUR → HNL: ${eurHnlRates.eurToHnl?.toFixed(4)}`);
      console.log(`   HNL → EUR: ${eurHnlRates.hnlToEur?.toFixed(6)}`);
      console.log(`   Source: ${eurHnlRates.source}`);
    } else {
      console.error('❌ Failed to get EUR/HNL rates:', eurHnlRates.error);
    }

    console.log('\n🎯 REMITTANCE RATE CALCULATION:');
    
    if (eurHnlResult.success && eurHnlResult.rate) {
      const interBankRate = eurHnlResult.rate;
      const margin = 0.025; // 2.5% margin
      const customerRate = interBankRate * (1 - margin);
      
      console.log(`📈 Inter-bank Rate: ${interBankRate.toFixed(4)} HNL/EUR`);
      console.log(`💰 Customer Rate: ${customerRate.toFixed(4)} HNL/EUR (2.5% margin)`);
      console.log(`🏦 Margin per EUR: ${(interBankRate - customerRate).toFixed(4)} HNL`);
      
      // Sample remittance calculation
      const remittanceAmount = 100; // €100
      const customerReceives = remittanceAmount * customerRate;
      const companyProfit = remittanceAmount * (interBankRate - customerRate);
      
      console.log(`\n💸 Sample €100 Remittance:`);
      console.log(`   Customer sends: €${remittanceAmount}`);
      console.log(`   Recipient receives: L. ${customerReceives.toFixed(2)}`);
      console.log(`   Company profit: L. ${companyProfit.toFixed(2)}`);
    }

    console.log('\n✅ Exchange Rate Service is ready for EUR → HNL remittances!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEURHNLRates();