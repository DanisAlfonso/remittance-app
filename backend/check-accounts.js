const { obpApiService } = require('./dist/services/obp-api.js');

async function checkMasterAccounts() {
  console.log('🔍 Checking OBP-API master account balances...');
  
  try {
    // Test connectivity first
    const connectivity = await obpApiService.testConnectivity();
    console.log('📡 Connectivity test:', connectivity);
    
    if (!connectivity.success) {
      console.log('❌ Cannot connect to OBP-API');
      return;
    }
    
    // Get all accounts
    const accountsResult = await obpApiService.makeRequest('/obp/v5.1.0/my/accounts');
    console.log('📊 My accounts result:', JSON.stringify(accountsResult, null, 2));
    
    if (accountsResult.success && accountsResult.data && accountsResult.data.accounts) {
      console.log('🏦 Found accounts:', accountsResult.data.accounts.length);
      
      for (const account of accountsResult.data.accounts) {
        const balance = account.balance ? account.balance.amount : 'N/A';
        const currency = account.balance ? account.balance.currency : 'N/A';
        console.log(`💰 Account ${account.id} (${account.bank_id}): ${balance} ${currency}`);
        console.log(`   Label: ${account.label || 'N/A'}`);
        console.log(`   Number: ${account.number || 'N/A'}`);
        if (account.account_routings) {
          for (const routing of account.account_routings) {
            console.log(`   ${routing.scheme}: ${routing.address}`);
          }
        }
        console.log('');
      }
    } else {
      console.log('❌ Failed to get accounts:', accountsResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error checking master accounts:', error);
  }
}

checkMasterAccounts();