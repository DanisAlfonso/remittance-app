const axios = require('axios');

// OBP-API Configuration
const OBP_BASE_URL = 'http://127.0.0.1:8080';
const OBP_API_VERSION = 'v5.1.0';
const CONSUMER_KEY = 'mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme';
const CONSUMER_SECRET = 'bzz1ceaup2wtptptjok5yg22vti5mi5q3ei5ucfc';

async function getDirectLoginToken() {
  try {
    const response = await axios.post(`${OBP_BASE_URL}/my/logins/direct`,
      {
        username: 'bootstrap',
        password: 'BootstrapPass123!',
        consumer_key: CONSUMER_KEY
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `DirectLogin username="bootstrap", password="BootstrapPass123!", consumer_key="${CONSUMER_KEY}"`
        }
      }
    );
    return response.data.token;
  } catch (error) {
    console.error('Failed to get DirectLogin token:', error.response?.data || error.message);
    throw error;
  }
}

async function checkJuanBalanceInOBP() {
  try {
    console.log('🔐 Getting OBP-API access token...');
    const token = await getDirectLoginToken();
    
    console.log('🏦 Checking HNLBANK2 accounts...');
    
    // Get all accounts in HNLBANK2
    const accountsResponse = await axios.get(
      `${OBP_BASE_URL}/obp/${OBP_API_VERSION}/banks/HNLBANK2/accounts/private`,
      {
        headers: {
          'Authorization': `DirectLogin token="${token}"`
        }
      }
    );
    
    console.log(`📋 Found ${accountsResponse.data.accounts.length} accounts in HNLBANK2:`);
    
    for (const account of accountsResponse.data.accounts) {
      console.log(`\n👤 Account: ${account.id}`);
      console.log(`   Label: ${account.label}`);
      console.log(`   Currency: ${account.bank_id}`);
      
      try {
        // Get account balance
        const balanceResponse = await axios.get(
          `${OBP_BASE_URL}/obp/${OBP_API_VERSION}/banks/HNLBANK2/accounts/${account.id}/balances`,
          {
            headers: {
              'Authorization': `DirectLogin token="${token}"`
            }
          }
        );
        
        if (balanceResponse.data.balances && balanceResponse.data.balances.length > 0) {
          const balance = balanceResponse.data.balances[0];
          console.log(`   💰 Balance: ${balance.amount} ${balance.currency}`);
          
          // Check if this is Juan Pérez's account (based on account ID from our database)
          if (account.id === '4d21f8a9-f820-442d-8f2d-0d672b814a4c') {
            console.log('   🎯 *** This is Juan Pérez\'s account! ***');
          }
        } else {
          console.log(`   💰 Balance: No balance data available`);
        }
        
      } catch (balanceError) {
        console.log(`   ❌ Could not get balance: ${balanceError.response?.data?.error_message || balanceError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking OBP accounts:', error.response?.data || error.message);
  }
}

checkJuanBalanceInOBP();