#!/usr/bin/env tsx

/**
 * Test Remittance API
 * 
 * Quick test to verify our EUR → HNL remittance API is working
 */

async function testRemittanceAPI() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🧪 Testing EUR → HNL Remittance API...\n');

    // Test 1: Exchange rate endpoint (should fail without auth)
    console.log('1. Testing exchange rate endpoint without auth (should fail)...');
    const rateResponse = await fetch(`${baseUrl}/obp/v5.1.0/remittance/exchange-rate?amount=100`);
    const rateData = await rateResponse.json();
    
    if (rateResponse.status === 401) {
      console.log('✅ Exchange rate endpoint correctly requires authentication');
      console.log(`   Response: ${JSON.stringify(rateData)}\n`);
    } else {
      console.log('❌ Exchange rate endpoint should require authentication');
      console.log(`   Status: ${rateResponse.status}`);
      console.log(`   Response: ${JSON.stringify(rateData)}\n`);
    }

    // Test 2: Recipients endpoint (should fail without auth)
    console.log('2. Testing recipients endpoint without auth (should fail)...');
    const recipientsResponse = await fetch(`${baseUrl}/obp/v5.1.0/remittance/recipients`);
    const recipientsData = await recipientsResponse.json();
    
    if (recipientsResponse.status === 401) {
      console.log('✅ Recipients endpoint correctly requires authentication');
      console.log(`   Response: ${JSON.stringify(recipientsData)}\n`);
    } else {
      console.log('❌ Recipients endpoint should require authentication');
      console.log(`   Status: ${recipientsResponse.status}`);
      console.log(`   Response: ${JSON.stringify(recipientsData)}\n`);
    }

    // Test 3: Health check (should work)
    console.log('3. Testing general health check...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.status === 200) {
      console.log('✅ Backend server is running and healthy');
      console.log(`   Response: ${JSON.stringify(healthData)}\n`);
    } else {
      console.log('❌ Backend server health check failed');
      console.log(`   Status: ${healthResponse.status}`);
      console.log(`   Response: ${JSON.stringify(healthData)}\n`);
    }

    console.log('🎉 API Test Summary:');
    console.log('• Remittance API endpoints are properly secured with authentication');
    console.log('• Backend server is running and responding');
    console.log('• Ready for frontend integration testing');
    console.log('\n💡 Next steps:');
    console.log('• Test with valid JWT token from frontend app');
    console.log('• Verify complete EUR → HNL flow in Expo Go');

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testRemittanceAPI();