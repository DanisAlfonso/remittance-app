#!/usr/bin/env tsx

/**
 * Fund Recipients Using Sandbox Data Import
 * 
 * Uses OBP-API sandbox data import to add funds to recipient accounts
 */

import { obpApiService } from '../../src/services/obp-api';

const recipients = [
  {
    name: 'Juan Pérez',
    accountId: '625fede6-0750-485d-acd7-ca85eda46263',
    initialBalance: 5000 // L.5,000 HNL
  },
  {
    name: 'María López', 
    accountId: '5820cb10-0b27-43d5-87af-223f9e1ba076',
    initialBalance: 3500 // L.3,500 HNL
  },
  {
    name: 'Carlos Mendoza',
    accountId: '55c0f41a-cbca-4704-b5b2-f155f60eb3b2', 
    initialBalance: 7500 // L.7,500 HNL
  }
];

async function fundRecipientsWithSandbox() {
  try {
    console.log('💰 Funding recipient accounts using Sandbox Data Import...\n');
    console.log('='.repeat(60));

    for (const recipient of recipients) {
      console.log(`💵 Funding ${recipient.name} (${recipient.accountId})`);
      console.log(`   Target Balance: L.${recipient.initialBalance.toFixed(2)} HNL`);
      
      try {
        // Check current balance first
        const accountDetails = await obpApiService.getAccountDetails('HNLBANK2', recipient.accountId);
        
        if (accountDetails.success && accountDetails.data?.balance) {
          const currentBalance = parseFloat(accountDetails.data.balance.amount);
          console.log(`   Current Balance: L.${currentBalance.toFixed(2)} HNL`);
          
          if (currentBalance >= recipient.initialBalance) {
            console.log(`   ✅ Account already has sufficient funds (L.${currentBalance.toFixed(2)})`);
            console.log('');
            continue;
          }
        }

        // Use direct OBP-API call to import sandbox data for this account
        const importResult = await (obpApiService as any).makeRequest(
          `/obp/v5.1.0/banks/HNLBANK2/accounts/${recipient.accountId}/owner/sandbox/import-test-data`, 
          {
            method: 'POST',
            body: JSON.stringify({
              currency: 'HNL',
              amount: recipient.initialBalance.toString(),
              description: `Initial test data for ${recipient.name}`
            })
          }
        );

        if (importResult.success) {
          console.log(`   ✅ Sandbox data imported successfully`);
          
          // Wait a moment for balance to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify new balance
          const updatedDetails = await obpApiService.getAccountDetails('HNLBANK2', recipient.accountId);
          if (updatedDetails.success && updatedDetails.data?.balance) {
            const newBalance = parseFloat(updatedDetails.data.balance.amount);
            console.log(`   💰 New Balance: L.${newBalance.toFixed(2)} HNL`);
          }
        } else {
          console.log(`   ❌ Sandbox import failed: ${importResult.error?.error_description || 'Unknown error'}`);
          
          // Try alternative method: direct balance update using transaction creation
          console.log(`   🔄 Trying alternative funding method...`);
          
          const transactionResult = await (obpApiService as any).makeRequest(
            `/obp/v5.1.0/banks/HNLBANK2/accounts/${recipient.accountId}/owner/transactions`, 
            {
              method: 'POST',
              body: JSON.stringify({
                type: 'DEPOSIT',
                amount: {
                  currency: 'HNL',
                  amount: recipient.initialBalance.toString()
                },
                description: `Test funding for ${recipient.name}`,
                counterparty: {
                  name: 'Test Funding System',
                  account_number: 'SYSTEM'
                }
              })
            }
          );

          if (transactionResult.success) {
            console.log(`   ✅ Alternative funding successful`);
          } else {
            console.log(`   ❌ Alternative funding also failed: ${transactionResult.error?.error_description || 'Unknown error'}`);
          }
        }

      } catch (error) {
        console.log(`   ❌ Error funding ${recipient.name}: ${error}`);
      }
      
      console.log('');
    }

    // Summary
    console.log('📊 FUNDING SUMMARY');
    console.log('='.repeat(60));
    
    for (const recipient of recipients) {
      try {
        const accountDetails = await obpApiService.getAccountDetails('HNLBANK2', recipient.accountId);
        
        if (accountDetails.success && accountDetails.data?.balance) {
          const balance = parseFloat(accountDetails.data.balance.amount);
          const status = balance >= 1000 ? '✅' : '⚠️';
          console.log(`${status} ${recipient.name}: L.${balance.toFixed(2)} HNL`);
        } else {
          console.log(`❌ ${recipient.name}: Could not retrieve balance`);
        }
      } catch (error) {
        console.log(`❌ ${recipient.name}: Error checking balance`);
      }
    }

    console.log('\n🎉 Recipient account funding process completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fundRecipientsWithSandbox();