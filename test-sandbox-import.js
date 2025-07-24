#!/usr/bin/env node

/**
 * Test Script for Sandbox Data Import
 * Tests the complete flow: user creation -> authentication -> sandbox import -> account verification
 */

// Use built-in fetch (Node.js 18+) or http module
const fetch = globalThis.fetch || require('http');

const API_BASE = 'http://localhost:3000';
const OBP_BASE = 'http://127.0.0.1:8080';

// Test configuration
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

let testResults = {
  userRegistration: false,
  userLogin: false,
  sandboxImport: false,
  accountsCreated: 0,
  transactionsCreated: 0,
  accountsVerification: false
};

// Helper functions
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testUserRegistration() {
  console.log('🔧 Step 1: Testing user registration...');
  
  const result = await makeRequest(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    body: JSON.stringify(TEST_USER)
  });
  
  if (result.success) {
    console.log('✅ User registration successful');
    testResults.userRegistration = true;
    return result.data;
  } else {
    console.log('❌ User registration failed:', result.data || result.error);
    return null;
  }
}

async function testUserLogin() {
  console.log('🔧 Step 2: Testing user login...');
  
  const result = await makeRequest(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  if (result.success && result.data.token) {
    console.log('✅ User login successful');
    testResults.userLogin = true;
    return result.data.token;
  } else {
    console.log('❌ User login failed:', result.data || result.error);
    return null;
  }
}

async function testSandboxImport(token) {
  console.log('🔧 Step 3: Testing sandbox data import...');
  
  const result = await makeRequest(`${API_BASE}/obp/v5.1.0/sandbox/data-import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (result.success) {
    console.log('✅ Sandbox import successful');
    console.log(`📊 Result: ${result.data.data?.total_accounts || 0} accounts, ${result.data.data?.total_transactions || 0} transactions`);
    testResults.sandboxImport = true;
    testResults.accountsCreated = result.data.data?.total_accounts || 0;
    testResults.transactionsCreated = result.data.data?.total_transactions || 0;
    return result.data;
  } else {
    console.log('❌ Sandbox import failed:', result.data || result.error);
    return null;
  }
}

async function testAccountsVerification(token) {
  console.log('🔧 Step 4: Verifying created accounts...');
  
  const result = await makeRequest(`${API_BASE}/api/v1/banking/accounts`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (result.success && result.data.accounts) {
    const accounts = result.data.accounts;
    console.log(`✅ Found ${accounts.length} accounts in banking service`);
    
    for (const account of accounts) {
      console.log(`  📋 Account: ${account.name} (${account.currency}) - Balance: ${account.balance?.amount || 0}`);
    }
    
    testResults.accountsVerification = accounts.length > 0;
    return accounts;
  } else {
    console.log('❌ Account verification failed:', result.data || result.error);
    return [];
  }
}

async function testOBPConnectivity() {
  console.log('🔧 Step 0: Testing OBP-API connectivity...');
  
  const result = await makeRequest(`${OBP_BASE}/obp/v5.1.0/root`);
  
  if (result.success) {
    console.log('✅ OBP-API is accessible');
    console.log(`📊 Version: ${result.data.version} (${result.data.version_status})`);
    return true;
  } else {
    console.log('❌ OBP-API is not accessible:', result.error);
    return false;
  }
}

async function testBackendConnectivity() {
  console.log('🔧 Step -1: Testing backend connectivity...');
  
  const result = await makeRequest(`${API_BASE}/health`);
  
  if (result.success) {
    console.log('✅ Backend is accessible');
    console.log(`📊 Environment: ${result.data.environment}`);
    return true;
  } else {
    console.log('❌ Backend is not accessible:', result.error);
    return false;
  }
}

async function cleanupTestUser(token) {
  console.log('🧹 Cleaning up test user...');
  
  // Note: We don't have a delete user endpoint, so we'll just log the user info
  console.log(`📝 Test user created: ${TEST_USER.email}`);
  console.log('💡 You may want to clean this up from Prisma if needed');
}

function printSummary() {
  console.log('\n🎯 TEST SUMMARY');
  console.log('================');
  console.log(`✅ Backend Connectivity: ${testResults.backendConnectivity ? '✅' : '❌'}`);
  console.log(`✅ OBP-API Connectivity: ${testResults.obpConnectivity ? '✅' : '❌'}`);
  console.log(`✅ User Registration: ${testResults.userRegistration ? '✅' : '❌'}`);
  console.log(`✅ User Login: ${testResults.userLogin ? '✅' : '❌'}`);
  console.log(`✅ Sandbox Import: ${testResults.sandboxImport ? '✅' : '❌'}`);
  console.log(`✅ Accounts Created: ${testResults.accountsCreated}`);
  console.log(`✅ Transactions Created: ${testResults.transactionsCreated}`);
  console.log(`✅ Account Verification: ${testResults.accountsVerification ? '✅' : '❌'}`);
  
  const overallSuccess = testResults.userRegistration && 
                         testResults.userLogin && 
                         testResults.sandboxImport && 
                         testResults.accountsCreated > 0 && 
                         testResults.transactionsCreated > 0 &&
                         testResults.accountsVerification;
  
  console.log(`\n🏆 OVERALL RESULT: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (overallSuccess) {
    console.log('\n🎉 All tests passed! The sandbox import functionality is working perfectly.');
    console.log('🚀 You can now safely test it in the UI.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above.');
  }
  
  return overallSuccess;
}

// Main test execution
async function runTests() {
  console.log('🧪 SANDBOX IMPORT TEST SUITE');
  console.log('=============================\n');
  
  // Test connectivity first
  testResults.backendConnectivity = await testBackendConnectivity();
  if (!testResults.backendConnectivity) {
    console.log('❌ Backend not accessible. Make sure your server is running on port 3000.');
    return false;
  }
  
  testResults.obpConnectivity = await testOBPConnectivity();
  if (!testResults.obpConnectivity) {
    console.log('❌ OBP-API not accessible. Make sure OBP-API is running on port 8080.');
    return false;
  }
  
  // Run the full test flow
  const userData = await testUserRegistration();
  if (!userData) return false;
  
  const token = await testUserLogin();
  if (!token) return false;
  
  const importResult = await testSandboxImport(token);
  if (!importResult) return false;
  
  const accounts = await testAccountsVerification(token);
  
  // Print summary
  const success = printSummary();
  
  // Cleanup
  await cleanupTestUser(token);
  
  return success;
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };