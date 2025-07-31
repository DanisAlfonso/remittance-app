const axios = require('axios');

// OBP-API Configuration
const OBP_BASE_URL = 'http://127.0.0.1:8080';
const CONSUMER_KEY = 'mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme';

async function getDirectLoginToken() {
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
}

async function checkHNLBANKMaster() {
  try {
    console.log('🔐 Getting OBP-API access token...');
    const token = await getDirectLoginToken();
    
    console.log('🏦 Checking HNLBANK Master Account...');
    
    // Check HNLBANK master account (used by production service)
    const masterAccountId = '86563464-f391-4b9f-ab71-fd25385ab466';
    
    const accountResponse = await axios.get(
      `${OBP_BASE_URL}/obp/v5.1.0/banks/HNLBANK/accounts/${masterAccountId}/owner/account`,
      {
        headers: {
          'Authorization': `DirectLogin token="${token}"`
        }
      }
    );
    
    console.log('💰 HNLBANK Master Account:');
    console.log(`   Account ID: ${accountResponse.data.id}`);
    console.log(`   Account Number: ${accountResponse.data.account_number}`);
    console.log(`   Label: ${accountResponse.data.label || 'HNLBANK Master'}`);
    console.log(`   💰 Balance: ${accountResponse.data.balance?.amount || 'Unknown'} ${accountResponse.data.balance?.currency || 'HNL'}`);
    console.log(`   IBAN: ${accountResponse.data.iban || 'N/A'}`);
    console.log(`   Bank: ${accountResponse.data.bank_name || 'HNLBANK'}`);
    
  } catch (error) {
    console.error('❌ Error checking HNLBANK master:', error.response?.data || error.message);
  }
}

checkHNLBANKMaster();