#!/usr/bin/env tsx

/**
 * Create Recipient Accounts in HNLBANK2
 * 
 * Creates sample recipient accounts in HNLBANK2 to simulate real Honduran customers
 * This represents customers who have accounts at "Banco Atlántida" (our HNLBANK2)
 */

import { obpApiService } from '../../src/services/obp-api';
import { prisma } from '../../src/config/database';

// Sample Honduran recipients for remittance testing
const recipients = [
  {
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@honduras.test',
    phone: '+504-9876-5432',
    nationalId: '0801-1985-12345',
    address: 'Colonia Kennedy, Tegucigalpa, Honduras'
  },
  {
    firstName: 'María',
    lastName: 'López',
    email: 'maria.lopez@honduras.test', 
    phone: '+504-8765-4321',
    nationalId: '0801-1990-67890',
    address: 'Barrio La Granja, San Pedro Sula, Honduras'
  },
  {
    firstName: 'Carlos',
    lastName: 'Mendoza',
    email: 'carlos.mendoza@honduras.test',
    phone: '+504-7654-3210', 
    nationalId: '0801-1988-11111',
    address: 'Residencial Las Lomas, Choloma, Honduras'
  },
  {
    firstName: 'Ana',
    lastName: 'Hernández',
    email: 'ana.hernandez@honduras.test',
    phone: '+504-6543-2109',
    nationalId: '0801-1992-22222', 
    address: 'Centro Histórico, Comayagua, Honduras'
  }
];

async function createRecipientAccounts() {
  try {
    console.log('🏦 Creating recipient accounts in HNLBANK2 for remittance simulation...\n');
    
    const createdAccounts = [];
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`👤 Creating account for ${recipient.firstName} ${recipient.lastName}...`);
      
      // Step 1: Create or find user in our database
      let recipientUser = await prisma.user.findFirst({
        where: { email: recipient.email }
      });
      
      if (!recipientUser) {
        console.log(`   📝 Creating user record...`);
        recipientUser = await prisma.user.create({
          data: {
            email: recipient.email,
            firstName: recipient.firstName,
            lastName: recipient.lastName, 
            password: 'RecipientPass123!', // Default password for simulation
            phone: recipient.phone,
            country: 'HN',
            emailVerified: true, // Pre-verified for simulation
            kycStatus: 'APPROVED' // Pre-verified for simulation
          }
        });
        console.log(`   ✅ User created with ID: ${recipientUser.id}`);
      } else {
        console.log(`   ✅ User already exists: ${recipientUser.id}`);
      }
      
      // Step 2: Create HNL account in HNLBANK2
      console.log(`   🏦 Creating HNL account in HNLBANK2...`);
      const accountResult = await obpApiService.createAccount({
        userId: recipientUser.id,
        currency: 'HNL',
        country: 'HN',
        type: 'CURRENT',
        name: `${recipient.firstName} ${recipient.lastName} - Banco Atlántida Account`,
        bankId: 'HNLBANK2'
      });
      
      if (!accountResult.success || !accountResult.data) {
        console.error(`   ❌ Failed to create account for ${recipient.firstName}: ${accountResult.error}`);
        continue;
      }
      
      const accountData = accountResult.data;
      console.log(`   ✅ Account created: ${accountData.obp_account_id}`);
      console.log(`   📋 IBAN: ${accountData.iban}`);
      console.log(`   💰 Initial balance: ${accountData.balance} HNL`);
      
      // Step 3: Add small initial balance for testing (L. 100)
      console.log(`   💰 Adding initial balance of L. 100...`);
      const fundingResult = await obpApiService.createTransactionRequest({
        from_bank_id: 'HNLBANK2',
        from_account_id: accountData.obp_account_id,
        to: {
          bank_id: 'HNLBANK2',
          account_id: accountData.obp_account_id
        },
        value: {
          currency: 'HNL',
          amount: '100.00'
        },
        description: `Initial balance for ${recipient.firstName} ${recipient.lastName}`,
        challenge_type: 'SANDBOX_TAN'
      });
      
      if (fundingResult.success && fundingResult.data?.challenge) {
        // Auto-answer challenge for sandbox
        const tokenResult = await (obpApiService as any).getDirectLoginToken();
        if (tokenResult.success) {
          try {
            const challengeResponse = await fetch(`http://127.0.0.1:8080/obp/v5.1.0/banks/HNLBANK2/accounts/${accountData.obp_account_id}/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${fundingResult.data.id}/challenge`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `DirectLogin username="bootstrap",password="BootstrapPass123!",consumer_key="mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme",token="${tokenResult.token}"`
              },
              body: JSON.stringify({
                id: fundingResult.data.challenge.id,
                answer: "123"
              })
            });
            
            if (challengeResponse.ok) {
              console.log(`   ✅ Initial funding completed`);
            }
          } catch (error) {
            console.log(`   ❌ Initial funding failed: ${error.message}`);
          }
        }
      }
      
      createdAccounts.push({
        name: `${recipient.firstName} ${recipient.lastName}`,
        userId: recipientUser.id,
        accountId: accountData.obp_account_id,
        iban: accountData.iban,
        phone: recipient.phone,
        address: recipient.address
      });
      
      console.log(''); // Empty line between recipients
    }
    
    // Summary
    console.log('📊 RECIPIENT ACCOUNTS CREATED');
    console.log('='.repeat(50));
    
    createdAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name}`);
      console.log(`   Account ID: ${account.accountId}`);
      console.log(`   IBAN: ${account.iban}`);
      console.log(`   Phone: ${account.phone}`);
      console.log(`   Address: ${account.address}`);
      console.log('');
    });
    
    console.log('🎉 SUCCESS: HNLBANK2 now has recipient accounts for remittance testing!');
    console.log('💡 You can now simulate EUR → HNL transfers to these accounts');
    
    // Show transfer possibilities
    console.log('\n💰 REMITTANCE SIMULATION READY:');
    console.log('Master Account: 4891dd74-b1e3-4c92-84d9-6f34b16e5845 (L. 26,171.01)');
    console.log('Recipient Accounts:');
    createdAccounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name}: ${account.accountId}`);
    });
    
    console.log('\n🚀 Next step: Implement EUR → HNL transfer between these accounts!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRecipientAccounts();