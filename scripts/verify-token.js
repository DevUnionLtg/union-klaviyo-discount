import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyToken() {
  try {
    // Get the most recent offline session
    const session = await prisma.session.findFirst({
      where: {
        isOnline: false,
      },
      orderBy: {
        id: "desc",
      },
    });

    if (!session) {
      console.log("No offline session found.");
      return;
    }

    console.log(`Verifying access token for: ${session.shop}`);
    console.log(`Token: ${session.accessToken.substring(0, 20)}...`);

    // Try to make a simple API call to verify the token
    // Using October 2025 API version (matches shopify.server.js)
    const response = await fetch(
      `https://${session.shop}/admin/api/2025-10/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("\n✅ Token is VALID!");
      console.log(`Shop name: ${data.shop?.name || "N/A"}`);
      console.log(`Shop domain: ${data.shop?.domain || "N/A"}`);
    } else {
      const errorText = await response.text();
      console.log("\n❌ Token is INVALID!");
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${errorText}`);
      console.log("\nYou need to re-authenticate:");
      console.log("1. Run: npm run clear-sessions");
      console.log("2. Restart: shopify app dev");
      console.log("3. Re-install the app in your Shopify store");
    }
  } catch (error) {
    console.error("Error verifying token:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyToken();

