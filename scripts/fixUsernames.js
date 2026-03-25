const { fixExistingNullUsernames } = require("../src/utils/usernameGenerator.js");
const prisma = require("../src/config/prisma").default;

/**
 * Script to fix all existing students with null usernames
 * Run this after applying the Prisma migration
 */
async function main() {
  console.log("🔧 Starting username migration...");
  
  try {
    await fixExistingNullUsernames();
    console.log("✅ Username migration completed successfully!");
  } catch (error) {
    console.error("❌ Username migration failed:", error);
    if (typeof process !== 'undefined') {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
