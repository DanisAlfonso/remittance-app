#!/usr/bin/env tsx

/**
 * Fund Recipients Directly Using Master Account Transfer
 * 
 * Transfers funds from HNLBANK2 master account to recipient accounts
 */

import { obpApiService } from '../../src/services/obp-api';

const recipients = [
  {
    name: 'Juan Pérez',
    accountId: '625fede6-0750-485d-acd7-ca85eda46263',
    initialBalance: 5000
  },
  {
    name: 'María López',
    accountId: '5820cb10-0b27-43d5-87af-223f9e1ba076', 
    initialBalance: 3500
  },
  {
    name: 'Carlos Mendoza',
    accountId: '55c0f41a-cbca-4704-b5b2-f155f60eb3b2',
    initialBalance: 7500
  }
];

async function fundRecipientsDirectly() {
  try {
    console.log('💰 Transferring funds from HNLBANK2 Master to Recipients...\n');
    console.log('='.repeat(65));

    // First check HNLBANK2 master balance
    const masterAccount = await obpApiService.getAccountDetails('HNLBANK2', '4891dd74-b1e3-4c92-84d9-6f34b16e5845');
    if (masterAccount.success && masterAccount.data?.balance) {
      const masterBalance = parseFloat(masterAccount.data.balance.amount);
      console.log(`🏦 HNLBANK2 Master Balance: L.${masterBalance.toFixed(2)} HNL`);
      
      const totalNeeded = recipients.reduce((sum, r) => sum + r.initialBalance, 0);
      console.log(`💸 Total needed for all recipients: L.${totalNeeded.toFixed(2)} HNL`);
      
      if (masterBalance < totalNeeded) {
        console.log(`❌ Insufficient master account balance. Need L.${totalNeeded - masterBalance} more.`);
        return;
      }
      console.log(`✅ Sufficient master account balance for all transfers\n`);
    }

    for (const recipient of recipients) {
      console.log(`💵 Transferring to ${recipient.name}`);
      console.log(`   Account: ${recipient.accountId}`);
      console.log(`   Amount: L.${recipient.initialBalance.toFixed(2)} HNL`);
      
      try {
        // Check current balance
        const currentAccount = await obpApiService.getAccountDetails('HNLBANK2', recipient.accountId);
        if (currentAccount.success && currentAccount.data?.balance) {
          const currentBalance = parseFloat(currentAccount.data.balance.amount);
          console.log(`   Current Balance: L.${currentBalance.toFixed(2)} HNL`);
          
          if (currentBalance >= recipient.initialBalance) {
            console.log(`   ✅ Already has sufficient funds`);
            console.log('');
            continue;
          }
        }

        // Create transaction request using the same pattern as master account funding
        console.log(`   🏦 Creating transfer transaction...`);
        
        const transferRequest = await obpApiService.createTransactionRequest({
          from_bank_id: 'HNLBANK2',
          from_account_id: '4891dd74-b1e3-4c92-84d9-6f34b16e5845', // HNLBANK2 Master  
          to: {
            bank_id: 'HNLBANK2',
            account_id: recipient.accountId // Recipient account
          },
          value: {
            currency: 'HNL',
            amount: recipient.initialBalance.toString()
          },
          description: `Test funding for ${recipient.name} - Initial Balance`,
          challenge_type: 'SANDBOX_TAN'
        });

        if (transferRequest.success && transferRequest.data) {
          const requestId = transferRequest.data.id;
          const challengeId = (transferRequest.data as any).challenge?.id;
          console.log(`   ✅ Transfer request created: ${requestId}`);
          
          // Complete the challenge
          console.log(`   🔐 Completing SANDBOX_TAN challenge...`);
          
          const challengeResult = await (obpApiService as any).makeRequest<{
            id: string;
            status: string;
            transaction_ids: string[];
          }>(`/obp/v5.1.0/banks/HNLBANK2/accounts/4891dd74-b1e3-4c92-84d9-6f34b16e5845/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${requestId}/challenge`, {
            method: 'POST',
            body: JSON.stringify({
              id: challengeId || 'SANDBOX_TAN',
              answer: '123'
            })
          });

          if (challengeResult.success && challengeResult.data?.transaction_ids?.length > 0) {
            const transactionId = challengeResult.data.transaction_ids[0];
            console.log(`   ✅ Transfer completed: ${transactionId}`);
            
            // Wait for balance update
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Verify new balance
            const updatedAccount = await obpApiService.getAccountDetails('HNLBANK2', recipient.accountId);
            if (updatedAccount.success && updatedAccount.data?.balance) {
              const newBalance = parseFloat(updatedAccount.data.balance.amount);
              console.log(`   💰 New Balance: L.${newBalance.toFixed(2)} HNL`);
            }
          } else {
            console.log(`   ❌ Challenge failed: ${challengeResult.error?.error_description || 'Unknown error'}`);
          }
        } else {
          console.log(`   ❌ Transfer request failed: ${transferRequest.error?.error_description || 'Unknown error'}`);
        }

      } catch (error) {
        console.log(`   ❌ Error transferring to ${recipient.name}: ${error}`);
      }
      
      console.log('');
    }

    // Final summary
    console.log('📊 FINAL RECIPIENT BALANCES');
    console.log('='.repeat(65));
    
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

    // Check final master balance
    const finalMaster = await obpApiService.getAccountDetails('HNLBANK2', '4891dd74-b1e3-4c92-84d9-6f34b16e5845');
    if (finalMaster.success && finalMaster.data?.balance) {
      const finalBalance = parseFloat(finalMaster.data.balance.amount);
      console.log(`\n🏦 HNLBANK2 Master Final Balance: L.${finalBalance.toFixed(2)} HNL`);
    }

    console.log('\n🎉 Recipient funding process completed!');
    console.log('💡 All recipients now have funds for realistic remittance testing');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fundRecipientsDirectly();