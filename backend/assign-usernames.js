const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

// Simple username generator function (inline implementation)
class UsernameGenerator {
  static async generateUniqueUsername(firstName, lastName) {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
      .replace(/[^a-z0-9.]/g, '') // Remove non-alphanumeric except dots
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\.|\.$/g, ''); // Remove leading/trailing dots
    
    // Check if base username is available
    const existingUser = await prisma.user.findFirst({
      where: { username: baseUsername }
    });
    
    if (!existingUser) {
      return baseUsername;
    }
    
    // If base is taken, try with numbers
    for (let i = 1; i <= 999; i++) {
      const numberedUsername = `${firstName.toLowerCase()}${i}`;
      const existingNumbered = await prisma.user.findFirst({
        where: { username: numberedUsername }
      });
      
      if (!existingNumbered) {
        return numberedUsername;
      }
    }
    
    // Fallback to timestamp
    return `${firstName.toLowerCase()}${Date.now().toString().slice(-6)}`;
  }
}

async function assignUsernamesToExistingUsers() {
  console.log('🔧 Starting username assignment for existing users...');
  
  try {
    // Find all users without usernames
    const usersWithoutUsernames = await prisma.user.findMany({
      where: {
        OR: [
          { username: null },
          { username: '' }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true
      }
    });

    console.log(`📋 Found ${usersWithoutUsernames.length} users without usernames:`);
    usersWithoutUsernames.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
    });

    if (usersWithoutUsernames.length === 0) {
      console.log('✅ All users already have usernames assigned!');
      return;
    }

    // Assign usernames to each user
    for (const user of usersWithoutUsernames) {
      try {
        console.log(`\n🔍 Generating username for ${user.firstName} ${user.lastName}...`);
        
        // Generate unique username
        const username = await UsernameGenerator.generateUniqueUsername(
          user.firstName,
          user.lastName
        );
        
        // Update user with new username
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            username: username,
            isSearchable: true  // Enable search for existing users
          }
        });
        
        console.log(`✅ Assigned username: @${username} to ${user.firstName} ${user.lastName}`);
        
      } catch (error) {
        console.error(`❌ Failed to assign username to ${user.firstName} ${user.lastName}:`, error.message);
      }
    }

    console.log('\n🎉 Username assignment completed!');
    
    // Verify the assignments
    console.log('\n📊 Verifying assignments...');
    const updatedUsers = await prisma.user.findMany({
      where: {
        id: { in: usersWithoutUsernames.map(u => u.id) }
      },
      select: {
        firstName: true,
        lastName: true,
        username: true,
        isSearchable: true
      }
    });
    
    updatedUsers.forEach(user => {
      console.log(`  ✓ ${user.firstName} ${user.lastName} → @${user.username} (searchable: ${user.isSearchable})`);
    });

  } catch (error) {
    console.error('❌ Error during username assignment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
assignUsernamesToExistingUsers()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });