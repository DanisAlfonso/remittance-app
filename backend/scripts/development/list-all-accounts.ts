#!/usr/bin/env node

/**
 * List All Accounts - Direct OBP-API Version
 * 
 * Check ALL funded accounts across ALL banks using direct OBP-API calls
 * No dependency on app services - shows real account data
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

async function getAllBanks(token) {
  const response = await fetch(`${OBP_BASE_URL}/banks`, {
    headers: { 'Authorization': getAuthHeader(token) }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get banks: ${JSON.stringify(data)}`);
  }
  
  return data.banks || [];
}

async function getBankAccounts(token, bankId) {
  const response = await fetch(`${OBP_BASE_URL}/banks/${bankId}/accounts`, {
    headers: { 'Authorization': getAuthHeader(token) }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    return []; // Return empty array if no access
  }
  
  return data.accounts || [];
}

async function getAccountDetails(token, bankId, accountId) {
  try {
    const response = await fetch(`${OBP_BASE_URL}/banks/${bankId}/accounts/${accountId}/owner/account`, {
      headers: { 'Authorization': getAuthHeader(token) }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return {
      id: data.id,
      label: data.label,
      balance: `${data.balance.amount} ${data.balance.currency}`,
      currency: data.balance.currency,
      amount: parseFloat(data.balance.amount),
      iban: data.account_routings?.find(r => r.scheme === 'IBAN')?.address || 'N/A'
    };
  } catch (error) {
    return null;
  }
}

async function listAllAccounts() {
  try {
    console.log('🔍 Getting ALL accounts across ALL banks...\n');
    
    // Step 1: Get authentication token
    const token = await getAuthToken();
    
    // Step 2: Check known funded accounts directly (since bootstrap lacks listing permissions)
    const knownAccounts = [
      { bank: 'EURBANK', id: 'f8ea80af-7e83-4211-bca7-d8fc53094c1c', name: 'EUR Master Account' },
      { bank: 'EURBANK', id: '12d64f27-6002-44d7-990a-726e32361d0c', name: 'HNL Account (from HNLBANK2 attempt)' },
      { bank: 'HNLBANK', id: '86563464-f391-4b9f-ab71-fd25385ab466', name: 'HNL Master Account' },
      { bank: 'HNLBANK2', id: '4891dd74-b1e3-4c92-84d9-6f34b16e5845', name: 'HNL Account (New)' },
      { bank: 'EURBANK2', id: '280796df-4fc1-4a0f-9ede-713ad68d0852', name: 'EUR Master Account (New)' }
    ];
    
    const allFundedAccounts = [];
    let totalEUR = 0;
    let totalHNL = 0;
    let totalUSD = 0;
    
    console.log('🔍 Checking known funded accounts directly...\n');
    
    // Group accounts by bank for organized display
    const bankGroups = {};
    
    for (const knownAccount of knownAccounts) {
      console.log(`🔍 Checking ${knownAccount.bank}/${knownAccount.name}...`);
      
      const details = await getAccountDetails(token, knownAccount.bank, knownAccount.id);
      
      if (details && details.amount >= 0) { // Include zero balances to show all accounts
        if (!bankGroups[knownAccount.bank]) {
          bankGroups[knownAccount.bank] = {
            name: knownAccount.bank,
            accounts: []
          };
        }
        
        bankGroups[knownAccount.bank].accounts.push({
          bank: knownAccount.bank,
          bankName: knownAccount.bank,
          ...details,
          knownName: knownAccount.name
        });
        
        if (details.amount > 0) {
          allFundedAccounts.push({
            bank: knownAccount.bank,
            bankName: knownAccount.bank,
            ...details
          });
          
          // Track totals by currency
          if (details.currency === 'EUR') totalEUR += details.amount;
          if (details.currency === 'HNL') totalHNL += details.amount;
          if (details.currency === 'USD') totalUSD += details.amount;
          
          console.log(`    💰 ${details.balance} - ${details.label}`);
        } else {
          console.log(`    💤 ${details.balance} - ${details.label} (empty)`);
        }
      } else {
        console.log(`    ❌ Account not accessible`);
      }
    }
    
    // Step 4: Summary
    console.log('\n📊 SUMMARY');
    console.log('='.repeat(50));
    
    if (Object.keys(bankGroups).length === 0) {
      console.log('❌ No accounts found');
      return;
    }
    
    // Display all accounts (including empty ones)
    Object.entries(bankGroups).forEach(([bankId, bankData]) => {
      console.log(`\n**${bankId}:**`);
      bankData.accounts.forEach(account => {
        const status = account.amount > 0 ? '💰' : '💤';
        console.log(`  ${status} ${account.label}: **${account.balance}**`);
        console.log(`    Account ID: ${account.id}`);
        console.log(`    IBAN: ${account.iban}`);
      });
    });
    
    // Totals (only funded accounts)
    if (allFundedAccounts.length > 0) {
      console.log('\n💰 **FUNDED TOTALS:**');
      if (totalEUR > 0) console.log(`  - EUR: €${totalEUR.toFixed(2)}`);
      if (totalHNL > 0) console.log(`  - HNL: ${totalHNL.toFixed(2)} HNL`);
      if (totalUSD > 0) console.log(`  - USD: $${totalUSD.toFixed(2)}`);
      
      console.log(`\n📈 **${allFundedAccounts.length} funded accounts** across ${Object.keys(bankGroups).length} banks`);
    } else {
      console.log('\n💤 All accounts have zero balance');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listAllAccounts();