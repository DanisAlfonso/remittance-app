#!/usr/bin/env node

/**
 * Check All Accounts in HNLBANK2
 * 
 * Query OBP-API directly to see all accounts within HNLBANK2 bank
 * This will help us understand the current account structure for remittance simulation
 */

const OBP_BASE_URL = 'http://127.0.0.1:8080/obp/v5.1.0';
const CONSUMER_KEY = 'mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme';
const USERNAME = 'bootstrap';
const PASSWORD = 'BootstrapPass123!';

async function getAuthToken() {
  const response = await fetch('http://127.0.0.1:8080/my/logins/direct', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DirectLogin': `username=${USERNAME},password=${PASSWORD},consumer_key=${CONSUMER_KEY}`
    }
  });
  
  const data = await response.json();
  
  if (!data.token) {
    throw new Error(`Failed to get token: ${JSON.stringify(data)}`);
  }
  
  return data.token;
}

function getAuthHeader(token) {
  return `DirectLogin username="${USERNAME}",password="${PASSWORD}",consumer_key="${CONSUMER_KEY}",token="${token}"`;
}

async function getHNLBANK2Accounts(token) {
  console.log('🔍 Querying all accounts in HNLBANK2...\n');
  
  // Method 1: Try to get bank accounts directly
  try {
    const response = await fetch(`${OBP_BASE_URL}/banks/HNLBANK2/accounts`, {
      headers: { 'Authorization': getAuthHeader(token) }
    });
    
    const data = await response.json();
    
    if (response.ok && data.accounts) {
      console.log(`✅ Found ${data.accounts.length} accounts in HNLBANK2:\n`);
      
      for (let i = 0; i < data.accounts.length; i++) {
        const account = data.accounts[i];
        console.log(`📋 Account ${i + 1}:`);
        console.log(`   ID: ${account.id}`);
        console.log(`   Label: ${account.label}`);
        console.log(`   Number: ${account.number || 'N/A'}`);
        console.log(`   Type: ${account.type || 'N/A'}`);
        console.log(`   Currency: ${account.balance?.currency || 'Unknown'}`);
        console.log(`   Balance: ${account.balance?.amount || '0'} ${account.balance?.currency || ''}`);
        
        // Check for IBAN routing
        const iban = account.account_routings?.find(r => r.scheme === 'IBAN');
        if (iban) {
          console.log(`   IBAN: ${iban.address}`);
        }
        
        console.log(''); // Empty line
      }
      
      return data.accounts;
    } else {
      console.log('❌ No accounts found or no permission to view HNLBANK2 accounts');
      console.log(`Response: ${response.status} - ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error('❌ Error querying HNLBANK2 accounts:', error.message);
  }
  
  // Method 2: Check known accounts directly
  console.log('\n🔍 Checking known HNLBANK2 accounts directly...\n');
  
  const knownAccounts = [
    { id: '4891dd74-b1e3-4c92-84d9-6f34b16e5845', name: 'HNLBANK2 Master Account' }
  ];
  
  for (const known of knownAccounts) {
    try {
      const response = await fetch(`${OBP_BASE_URL}/banks/HNLBANK2/accounts/${known.id}/owner/account`, {
        headers: { 'Authorization': getAuthHeader(token) }
      });
      
      if (response.ok) {
        const accountData = await response.json();
        console.log(`✅ ${known.name}:`);
        console.log(`   Account ID: ${accountData.id}`);
        console.log(`   Label: ${accountData.label}`);
        console.log(`   Balance: ${accountData.balance.amount} ${accountData.balance.currency}`);
        console.log(`   Type: ${accountData.type}`);
        
        const iban = accountData.account_routings?.find(r => r.scheme === 'IBAN');
        if (iban) {
          console.log(`   IBAN: ${iban.address}`);
        }
        
        console.log('');
      } else {
        console.log(`❌ Could not access ${known.name} (${known.id})`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${known.name}: ${error.message}`);
    }
  }
  
  return [];
}

async function main() {
  try {
    console.log('🏦 HNLBANK2 Account Analysis');
    console.log('='.repeat(50));
    
    // Get authentication token
    const token = await getAuthToken();
    console.log('✅ Authentication successful\n');
    
    // Query HNLBANK2 accounts
    const accounts = await getHNLBANK2Accounts(token);
    
    // Summary
    console.log('📊 SUMMARY');
    console.log('='.repeat(30));
    
    if (accounts && accounts.length > 0) {
      console.log(`Found ${accounts.length} accounts in HNLBANK2`);
      console.log('\nFor remittance simulation:');
      console.log('- Master account: Available for disbursements');
      console.log('- Recipient accounts: Need to create for each customer');
      console.log('- Internal transfers: Possible within HNLBANK2');
    } else {
      console.log('Only 1 master account found in HNLBANK2');
      console.log('\nTo simulate remittances, we need:');
      console.log('1. Keep existing master account for company funds');
      console.log('2. Create recipient accounts for customers like Juan Pérez');
      console.log('3. Execute internal transfers: Master → Recipient');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

main();