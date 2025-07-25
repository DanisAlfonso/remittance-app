#!/usr/bin/env node

const API_URL = 'http://localhost:3000';

async function testRegistration() {
  console.log('🧪 Testing user registration with virtual IBAN creation...\n');
  
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    country: 'ES',
    preferredCurrencies: ['EUR', 'HNL']
  };
  
  try {
    console.log('📤 Registering user:', {
      email: testUser.email,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      preferredCurrencies: testUser.preferredCurrencies
    });
    
    const response = await fetch(`${API_URL}/obp/v5.1.0/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Registration successful!');
      console.log('👤 User:', {
        id: result.user.id,
        email: result.user.email,
        name: `${result.user.firstName} ${result.user.lastName}`
      });
      
      if (result.virtualAccounts && result.virtualAccounts.length > 0) {
        console.log('\n🏦 Virtual Accounts Created:');
        result.virtualAccounts.forEach((account, index) => {
          console.log(`  ${index + 1}. ${account.currency} Account:`);
          console.log(`     IBAN: ${account.iban}`);
          console.log(`     Balance: ${account.balance} ${account.currency}`);
          console.log(`     Status: ${account.status}`);
        });
        
        console.log('\n🎉 Virtual IBAN architecture working successfully!');
        
        // Test getting accounts via API
        console.log('\n📋 Testing account retrieval...');
        const accountsResponse = await fetch(`${API_URL}/obp/v5.1.0/my/accounts`, {
          headers: {
            'Authorization': `Bearer ${result.token}`,
          },
        });
        
        if (accountsResponse.ok) {
          const accountsResult = await accountsResponse.json();
          console.log('✅ Account retrieval successful!');
          console.log(`📊 Found ${accountsResult.accounts.length} accounts via API`);
        } else {
          console.log('❌ Account retrieval failed:', await accountsResponse.text());
        }
        
      } else {
        console.log('⚠️  No virtual accounts were created');
      }
      
    } else {
      console.log('❌ Registration failed:');
      console.log(result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRegistration();