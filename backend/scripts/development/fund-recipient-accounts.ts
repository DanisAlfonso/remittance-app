#!/usr/bin/env tsx

/**
 * Fund Recipient Accounts in HNLBANK2
 * 
 * Adds initial funds to recipient accounts for realistic testing
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

async function fundRecipientAccounts() {
  try {
    console.log('💰 Funding recipient accounts in HNLBANK2...\n');
    console.log('='.repeat(50));

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

        // Fund the account using OBP-API payment
        console.log(`   🏦 Creating funding transaction...`);
        
        // Create a funding transaction using correct OBP-API format
        const fundingResult = await obpApiService.createTransactionRequest({
          from_bank_id: 'HNLBANK2',
          from_account_id: '4891dd74-b1e3-4c92-84d9-6f34b16e5845', // HNLBANK2 Master
          to: {
            bank_id: 'HNLBANK2',
            account_id: recipient.accountId
          },
          value: {
            currency: 'HNL',
            amount: recipient.initialBalance.toString()
          },
          description: `Initial funding for ${recipient.name} - Test Account Setup`,
          challenge_type: 'SANDBOX_TAN'
        });

        if (fundingResult.success && fundingResult.data) {
          console.log(`   ✅ Funding transaction request created: ${fundingResult.data.id}`);
          
          // Complete the SANDBOX_TAN challenge with answer "123"
          console.log(`   🔐 Completing challenge...`);
          
          const challengeResult = await (obpApiService as any).makeRequest<{
            id: string;
            status: string;
            transaction_ids: string[];
          }>(`/obp/v5.1.0/banks/HNLBANK2/accounts/4891dd74-b1e3-4c92-84d9-6f34b16e5845/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${fundingResult.data.id}/challenge`, {
            method: 'POST',
            body: JSON.stringify({
              id: (fundingResult.data as any).challenge?.id || 'SANDBOX_TAN',
              answer: '123' // Sandbox challenge answer
            })
          });

          if (challengeResult.success && challengeResult.data?.transaction_ids?.length > 0) {
            const transactionId = challengeResult.data.transaction_ids[0];
            console.log(`   ✅ Transaction completed: ${transactionId}`);
            
            // Wait a moment for balance to update
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify new balance
            const updatedDetails = await obpApiService.getAccountDetails('HNLBANK2', recipient.accountId);
            if (updatedDetails.success && updatedDetails.data?.balance) {
              const newBalance = parseFloat(updatedDetails.data.balance.amount);
              console.log(`   💰 New Balance: L.${newBalance.toFixed(2)} HNL`);
            }
          } else {
            console.log(`   ❌ Challenge failed: ${challengeResult.error?.error_description || 'Unknown error'}`);
          }
        } else {
          console.log(`   ❌ Funding failed: ${fundingResult.error?.error_description || 'Unknown error'}`);
        }

      } catch (error) {
        console.log(`   ❌ Error funding ${recipient.name}: ${error}`);
      }
      
      console.log('');
    }

    // Summary
    console.log('📊 FUNDING SUMMARY');
    console.log('='.repeat(50));
    
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

    console.log('\n🎉 Recipient account funding completed!');
    console.log('💡 Recipients now have realistic balances for EUR → HNL remittance testing');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fundRecipientAccounts();