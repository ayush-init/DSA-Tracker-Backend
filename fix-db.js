const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixColumns() {
  try {
    console.log('Checking Leaderboard table columns...');
    
    // Check if columns exist
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Leaderboard' 
      AND column_name IN ('current_streak', 'max_streak')
    `;
    
    console.log('Existing columns:', result);
    
    // Add missing columns if they don't exist
    if (result.length < 2) {
      console.log('Adding missing columns...');
      
      await prisma.$executeRaw`
        ALTER TABLE "Leaderboard" 
        ADD COLUMN IF NOT EXISTS "current_streak" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "max_streak" INTEGER NOT NULL DEFAULT 0
      `;
      
      console.log('Columns added successfully!');
    } else {
      console.log('All columns already exist!');
    }
    
    // Verify columns were added
    const finalCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Leaderboard' 
      AND column_name IN ('current_streak', 'max_streak')
    `;
    
    console.log('Final check:', finalCheck);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixColumns();
