import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearSessions() {
  try {
    // Get all sessions first
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        shop: true,
      },
    });

    if (sessions.length === 0) {
      console.log("No sessions found in the database.");
      return;
    }

    console.log(`Found ${sessions.length} session(s) to delete:`);
    sessions.forEach((session) => {
      console.log(`  - ${session.shop} (ID: ${session.id})`);
    });

    // Delete all sessions
    const result = await prisma.session.deleteMany({});
    
    console.log(`\n✅ Successfully deleted ${result.count} session(s).`);
    console.log("\nNext steps:");
    console.log("1. Restart your app: shopify app dev");
    console.log("2. Re-install the app in your Shopify store");
    console.log("3. This will create a new access token");
  } catch (error) {
    console.error("Error clearing sessions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearSessions();













