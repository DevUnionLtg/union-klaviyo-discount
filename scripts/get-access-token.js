import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyToken(shop, accessToken) {
  try {
    const response = await fetch(
      `https://${shop}/admin/api/2025-10/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      return { valid: true, error: null };
    } else {
      const errorText = await response.text();
      return { valid: false, error: errorText };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function getAccessToken() {
  try {
    // Get all sessions
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        shop: true,
        accessToken: true,
        scope: true,
        expires: true,
        isOnline: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    if (sessions.length === 0) {
      console.log("No sessions found in the database.");
      console.log("Make sure you've completed the OAuth flow by installing the app.");
      return;
    }

    console.log("\n=== Shopify App Access Tokens ===\n");
    
    for (const [index, session] of sessions.entries()) {
      console.log(`Session ${index + 1}:`);
      console.log(`  Shop: ${session.shop}`);
      console.log(`  Access Token: ${session.accessToken}`);
      console.log(`  Scope: ${session.scope || "N/A"}`);
      console.log(`  Expires: ${session.expires ? new Date(session.expires).toLocaleString() : "Never"}`);
      console.log(`  Type: ${session.isOnline ? "Online" : "Offline"}`);
      console.log(`  Session ID: ${session.id}`);
      
      // Verify token validity
      console.log(`  Verifying token...`);
      const verification = await verifyToken(session.shop, session.accessToken);
      if (verification.valid) {
        console.log(`  ✅ Token is VALID`);
      } else {
        console.log(`  ❌ Token is INVALID`);
        console.log(`  Error: ${verification.error}`);
      }
      console.log("");
    }

    // Show the most recent offline token (most common use case)
    const offlineSession = sessions.find(s => !s.isOnline);
    if (offlineSession) {
      console.log("=== Most Recent Offline Access Token ===");
      console.log(`Shop: ${offlineSession.shop}`);
      console.log(`Access Token: ${offlineSession.accessToken}`);
      
      // Verify the offline token
      const verification = await verifyToken(offlineSession.shop, offlineSession.accessToken);
      if (!verification.valid) {
        console.log("\n⚠️  WARNING: This token is INVALID!");
        console.log("\nTo fix this issue:");
        console.log("1. Run: npm run clear-sessions");
        console.log("2. Restart: shopify app dev");
        console.log("3. Re-install the app in your Shopify store");
        console.log("4. This will generate a new valid access token");
      }
    }
  } catch (error) {
    console.error("Error retrieving access token:", error);
  } finally {
    await prisma.$disconnect();
  }
}

getAccessToken();


