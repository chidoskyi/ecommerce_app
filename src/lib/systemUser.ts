// scripts/initSystemUser.ts
import prisma from '@/lib/prisma'

export async function getOrCreateSystemUser() {
  try {
    // Check if system user exists
    let systemUser = await prisma.user.findFirst({
      where: { 
        email: 'system@yourstore.com',
        clerkId: 'SYSTEM' 
      }
    });

    if (!systemUser) {
      console.log('Creating system user...');
      
      // Create system user
      systemUser = await prisma.user.create({
        data: {
          clerkId: 'SYSTEM',
          email: 'system@yourstore.com',
          firstName: 'System',
          lastName: 'Account',
          phone: null,
          avatar: null,
          role: 'ADMIN',
          status: 'ACTIVE', // Added required status field
          emailVerified: true, // System user should be verified
        }
      });

      console.log('System user created:', systemUser.id);

      // Create system wallet - INCLUDING clerkId field
      await prisma.userWallet.create({
        data: {
          userId: systemUser.id,
          clerkId: 'SYSTEM', // ← THIS WAS MISSING!
          balance: 0.0,
          currency: 'NGN',
          isActive: true,
          lastActivity: new Date(),
          pin: null
        }
      });

      console.log('System wallet created for user:', systemUser.id);
    } else {
      console.log('System user already exists:', systemUser.id);
      
      // Check if wallet exists
      const existingWallet = await prisma.userWallet.findUnique({
        where: { userId: systemUser.id }
      });
      
      if (!existingWallet) {
        // Create wallet if it doesn't exist
        await prisma.userWallet.create({
          data: {
            userId: systemUser.id,
            clerkId: 'SYSTEM', // ← THIS WAS MISSING!
            balance: 0.0,
            currency: 'NGN',
            isActive: true,
            lastActivity: new Date(),
            pin: null
          }
        });
        console.log('System wallet created for existing user:', systemUser.id);
      } else {
        console.log('System wallet already exists');
      }
    }

    return systemUser.id;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
getOrCreateSystemUser()
  .then(id => console.log('✅ System user ID:', id))
  .catch(error => console.error('❌ Failed:', error));