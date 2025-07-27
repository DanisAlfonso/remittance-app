import { obpApiService } from './src/services/obp-api';

async function resetMasterAccountTo5000() {
  console.log('🔄 Resetting EURBANK master account to exactly 5000 EUR...');
  
  try {
    // Get current balance
    console.log('📊 Checking current balance...');
    const accountResult = await obpApiService.makeRequest('/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/owner/account');
    
    if (!accountResult.success || !accountResult.data?.balance) {
      console.log('❌ Failed to get current balance:', accountResult.error);
      return;
    }
    
    const currentBalance = parseFloat(accountResult.data.balance.amount);
    console.log(`💰 Current balance: ${currentBalance} EUR`);
    
    if (currentBalance === 5000) {
      console.log('✅ Master account already at 5000 EUR');
      return;
    }
    
    // Calculate adjustment needed
    const adjustment = 5000 - currentBalance;
    console.log(`🔧 Need to adjust by: ${adjustment} EUR`);
    
    if (adjustment > 0) {
      // Need to add money - use sandbox data import which sets to 5000
      console.log('💸 Adding money using sandbox import...');
      
      // Use the internal sandbox data import that resets to 5000
      const importResult = await obpApiService.makeRequest('/obp/v5.1.0/sandbox/data-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (importResult.success) {
        console.log('✅ Sandbox import completed');
      } else {
        console.log('❌ Sandbox import failed:', importResult.error);
      }
      
    } else {
      // Need to remove money - create a withdrawal transaction
      console.log('📤 Removing excess money...');
      
      const withdrawalAmount = Math.abs(adjustment);
      
      // Create a withdrawal transaction request
      const withdrawalResult = await obpApiService.makeRequest('/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/transaction-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'SANDBOX_TAN',
          to: {
            bank_id: 'EURBANK',
            account_id: 'SYSTEM_ADJUSTMENT' // System adjustment account
          },
          value: {
            currency: 'EUR',
            amount: withdrawalAmount.toString()
          },
          description: 'Master account balance adjustment to 5000 EUR'
        })
      });
      
      if (withdrawalResult.success) {
        console.log('✅ Withdrawal transaction created');
        
        // Answer any challenge automatically for sandbox
        if (withdrawalResult.data?.challenge?.id) {
          const challengeResult = await obpApiService.makeRequest(`/obp/v5.1.0/transaction-requests/${withdrawalResult.data.id}/challenge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: withdrawalResult.data.challenge.id,
              answer: '123456' // Default sandbox challenge answer
            })
          });
          
          if (challengeResult.success) {
            console.log('✅ Challenge answered successfully');
          } else {
            console.log('❌ Challenge answer failed:', challengeResult.error);
          }
        }
      } else {
        console.log('❌ Withdrawal failed:', withdrawalResult.error);
      }
    }
    
    // Verify final balance
    console.log('🔍 Checking final balance...');
    const finalResult = await obpApiService.makeRequest('/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/owner/account');
    
    if (finalResult.success && finalResult.data?.balance) {
      const finalBalance = parseFloat(finalResult.data.balance.amount);
      console.log(`💰 Final balance: ${finalBalance} EUR`);
      
      if (finalBalance === 5000) {
        console.log('🎉 Successfully reset EURBANK master account to 5000 EUR!');
      } else {
        console.log(`⚠️ Balance is ${finalBalance} EUR instead of 5000 EUR`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error resetting master account:', error);
  }
  
  process.exit(0);
}

resetMasterAccountTo5000();