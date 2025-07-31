#!/usr/bin/env tsx

/**
 * Create Recipients in HNLBANK2 for EUR → HNL Remittance Testing
 * 
 * Creates recipient accounts specifically in HNLBANK2 using the fixed OBP-API service
 * These represent customers who have accounts at "Banco Atlántida" (simulated by HNLBANK2)
 */

import { obpApiService } from '../../src/services/obp-api';
import { prisma } from '../../src/config/database';

// Honduran recipients for remittance testing
const recipients = [
  {
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@hnlbank2.test',
    phone: '+504-9876-5432',
    nationalId: '0801-1985-12345',
    address: 'Colonia Kennedy, Tegucigalpa, Honduras',
    relationship: 'Family'
  },
  {
    firstName: 'María',
    lastName: 'López',
    email: 'maria.lopez@hnlbank2.test', 
    phone: '+504-8765-4321',
    nationalId: '0801-1990-67890',
    address: 'Barrio La Granja, San Pedro Sula, Honduras',
    relationship: 'Family'
  },
  {
    firstName: 'Carlos',
    lastName: 'Mendoza',
    email: 'carlos.mendoza@hnlbank2.test',
    phone: '+504-7654-3210', 
    nationalId: '0801-1988-11111',
    address: 'Residencial Las Lomas, Choloma, Honduras',
    relationship: 'Friend'
  }
];

async function createHNLBANK2Recipients() {
  try {
    console.log('🏦 Creating recipient accounts in HNLBANK2 for EUR → HNL remittance simulation...\n');
    
    // Create a sender user for testing
    let senderUser = await prisma.user.findFirst({
      where: { email: 'maria.sender@spain.test' }
    });
    
    if (!senderUser) {
      console.log('👤 Creating sender user (María in Spain)...');
      senderUser = await prisma.user.create({
        data: {
          email: 'maria.sender@spain.test',
          firstName: 'María',
          lastName: 'Rodríguez',
          password: 'SenderPass123!',
          phone: '+34-666-123-456',
          country: 'ES',
          emailVerified: true,
          kycStatus: 'APPROVED'
        }
      });
      console.log(`✅ Sender created: ${senderUser.id}\n`);
    } else {
      console.log(`✅ Sender exists: ${senderUser.id}\n`);
    }
    
    const createdRecipients = [];
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`👤 Creating ${recipient.firstName} ${recipient.lastName} in HNLBANK2...`);
      
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
            password: 'RecipientPass123!',
            phone: recipient.phone,
            country: 'HN',
            emailVerified: true,
            kycStatus: 'APPROVED'
          }
        });
        console.log(`   ✅ User created: ${recipientUser.id}`);
      } else {
        console.log(`   ✅ User exists: ${recipientUser.id}`);
      }
      
      // Step 2: Create HNL account specifically in HNLBANK2
      console.log(`   🏦 Creating HNL account in HNLBANK2...`);
      const accountResult = await obpApiService.createAccount({
        userId: recipientUser.id,
        currency: 'HNL',
        country: 'HN',
        type: 'CURRENT',
        name: `${recipient.firstName} ${recipient.lastName} - Banco Atlántida`,
        bankId: 'HNLBANK2'  // Now works correctly!
      });
      
      if (!accountResult.success || !accountResult.data) {
        console.error(`   ❌ Failed to create account: ${accountResult.error}`);
        continue;
      }
      
      const account = accountResult.data;
      console.log(`   ✅ HNLBANK2 Account: ${account.obp_account_id}`);
      console.log(`   📋 IBAN: ${account.iban}`);
      console.log(`   🏦 Bank: ${account.obp_bank_id}`);
      
      // Step 3: Store in database for beneficiary management
      const beneficiary = await prisma.beneficiary.create({
        data: {
          userId: senderUser.id, // Link to our sender
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          accountNumber: account.obp_account_id,
          bankName: 'Banco Atlántida (HNLBANK2)',
          bankCode: 'HNLBANK2',
          country: 'HN',
          phone: recipient.phone,
          address: recipient.address
        }
      });
      
      console.log(`   💾 Beneficiary record: ${beneficiary.id}`);
      
      createdRecipients.push({
        name: `${recipient.firstName} ${recipient.lastName}`,
        userId: recipientUser.id,
        accountId: account.obp_account_id,
        iban: account.iban,
        phone: recipient.phone,
        address: recipient.address,
        bankId: account.obp_bank_id,
        beneficiaryId: beneficiary.id
      });
      
      console.log(''); // Empty line
    }
    
    // Summary
    console.log('📊 HNLBANK2 RECIPIENTS CREATED');
    console.log('='.repeat(50));
    
    createdRecipients.forEach((recipient, index) => {
      console.log(`${index + 1}. ${recipient.name}`);
      console.log(`   HNLBANK2 Account: ${recipient.accountId}`);
      console.log(`   IBAN: ${recipient.iban}`);
      console.log(`   Phone: ${recipient.phone}`);
      console.log(`   Bank: ${recipient.bankId}`);
      console.log('');
    });
    
    console.log('🎉 SUCCESS: HNLBANK2 recipients ready for EUR → HNL remittances!');
    console.log('💰 Master Account Balance Check:');
    
    // Check HNLBANK2 master account balance
    const masterBalance = await obpApiService.getAccountDetails('HNLBANK2', '4891dd74-b1e3-4c92-84d9-6f34b16e5845');
    if (masterBalance.success && masterBalance.data) {
      console.log(`   HNLBANK2 Master: ${masterBalance.data.balance.amount} ${masterBalance.data.balance.currency}`);
    }
    
    console.log('\n🚀 Ready for EUR → HNL transfer implementation!');
    
    return createdRecipients;
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createHNLBANK2Recipients();