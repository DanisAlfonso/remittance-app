#!/usr/bin/env tsx

/**
 * Debug Account Structure
 * 
 * Check the exact OBP-API response structure for HNLBANK2 accounts
 */

async function debugAccountStructure() {
  try {
    console.log('🔍 Debug: Getting raw OBP-API account structure...\n');

    const OBP_BASE_URL = 'http://127.0.0.1:8080/obp/v5.1.0';
    const CONSUMER_KEY = 'mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme';
    const USERNAME = 'bootstrap';
    const PASSWORD = 'BootstrapPass123!';

    // Get auth token
    const tokenResponse = await fetch('http://127.0.0.1:8080/my/logins/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DirectLogin': `username=${USERNAME},password=${PASSWORD},consumer_key=${CONSUMER_KEY}`
      }
    });
    
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;
    const authHeader = `DirectLogin username="${USERNAME}",password="${PASSWORD}",consumer_key="${CONSUMER_KEY}",token="${token}"`;

    // Check recipient account
    const recipientAccountId = '625fede6-0750-485d-acd7-ca85eda46263';
    console.log('📋 Recipient Account Raw Response:');
    
    const recipientResponse = await fetch(`${OBP_BASE_URL}/banks/HNLBANK2/accounts/${recipientAccountId}/owner/account`, {
      headers: { 'Authorization': authHeader }
    });
    
    const recipientData = await recipientResponse.json();
    console.log(JSON.stringify(recipientData, null, 2));

    console.log('\n📋 Master Account Raw Response:');
    
    // Check master account
    const masterAccountId = '4891dd74-b1e3-4c92-84d9-6f34b16e5845';
    const masterResponse = await fetch(`${OBP_BASE_URL}/banks/HNLBANK2/accounts/${masterAccountId}/owner/account`, {
      headers: { 'Authorization': authHeader }
    });
    
    const masterData = await masterResponse.json();
    console.log(JSON.stringify(masterData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAccountStructure();