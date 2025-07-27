import { obpApiService } from './src/services/obp-api';

async function checkEURBANKBalance() {
  console.log('🔍 Checking current EURBANK master account balance...');
  
  try {
    const accountResult = await obpApiService.makeRequest('/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/owner/account');
    
    if (accountResult.success && accountResult.data?.balance) {
      const currentBalance = parseFloat(accountResult.data.balance.amount);
      const currency = accountResult.data.balance.currency;
      
      console.log(`💰 EURBANK Master Account Balance: ${currentBalance} ${currency}`);
      
      // Also show account details
      if (accountResult.data.id) {
        console.log(`🏦 Account ID: ${accountResult.data.id}`);
        console.log(`🏷️  Account Label: ${accountResult.data.label || 'N/A'}`);
        console.log(`🔢 Account Number: ${accountResult.data.number || 'N/A'}`);
      }
      
    } else {
      console.log('❌ Failed to get EURBANK balance:', accountResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error checking balance:', error);
  }
  
  process.exit(0);
}

checkEURBANKBalance();