const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        isSearchable: true
      }
    });

    console.log('📋 All users in database:');
    users.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Username: ${user.username || 'NULL'}`);
      console.log(`    Searchable: ${user.isSearchable}`);
      console.log(`    ID: ${user.id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();