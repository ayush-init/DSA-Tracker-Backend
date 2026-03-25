import { fixExistingNullUsernames } from "../src/utils/usernameGenerator";
import prisma from "../src/config/prisma";

/**
 * Script to fix all existing students with null usernames
 * Run this after applying the Prisma migration
 */
async function main() {
  console.log("🔧 Starting username migration...");
  
  try {
    await fixExistingNullUsernames();
    console.log("✅ Username migration completed successfully!");
  } catch (error: any) {
    console.error("❌ Username migration failed:", error);
    if (typeof process !== 'undefined') {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
