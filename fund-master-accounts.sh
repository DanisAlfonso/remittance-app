#!/bin/bash

# Fund Master Accounts Script
# This script funds the EURBANK master account using the working OBP-API transaction request method

echo "💰 Funding EURBANK Master Account..."
echo "======================================"

# Check if backend is built
if [ ! -d "backend/dist" ]; then
    echo "❌ Backend not built. Building now..."
    cd backend && npm run build && cd ..
fi

# Run the funding script
node -e "
const { obpApiService } = require('./backend/dist/services/obp-api.js');

async function fundMasterAccount() {
  try {
    console.log('🚀 Starting master account funding...');
    
    // Fund with 10,000 EUR
    const result = await obpApiService.fundMasterAccount(10000);
    
    if (result.success) {
      console.log('✅ Master account funded successfully!');
      console.log('📊 Transaction Details:');
      console.log('   - Transaction ID:', result.data.transaction_id);
      console.log('   - Amount:', result.data.amount, result.data.currency);
      console.log('   - New Balance:', result.data.new_balance, 'EUR');
      console.log('   - Status:', result.data.status);
    } else {
      console.log('❌ Funding failed:', result.error?.error_description);
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

fundMasterAccount();
"

echo ""
echo "🎉 Master account funding completed!"
echo "You can now use the virtual IBAN system with a funded master account."