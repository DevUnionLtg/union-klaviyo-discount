import { PrismaClient } from "@prisma/client";

/**
 * 生产环境获取 Access Token 脚本
 * 
 * 使用方法:
 * 1. 设置环境变量 DATABASE_URL 指向生产数据库
 * 2. 运行: node scripts/get-access-token-production.js
 * 
 * 或者直接指定数据库URL:
 * DATABASE_URL="postgresql://user:password@host:5432/dbname" node scripts/get-access-token-production.js
 */

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:dev.sqlite",
    },
  },
});

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
    const dbUrl = process.env.DATABASE_URL || "file:dev.sqlite";
    console.log(`\n🔗 连接数据库: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);

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
      console.log("❌ 数据库中没有找到任何 session。");
      console.log("请确保 app 已经安装并完成 OAuth 流程。");
      return;
    }

    console.log("=== Shopify App Access Tokens ===\n");
    
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
        console.log("1. Clear sessions in production");
        console.log("2. Re-install the app in your Shopify store");
        console.log("3. This will generate a new valid access token");
      } else {
        console.log("\n✅ Token is valid and ready to use!");
      }
    }

    // Export format for easy copying
    if (offlineSession) {
      console.log("\n=== For Postman/API Testing ===");
      console.log(`Header: X-Shopify-Access-Token`);
      console.log(`Value: ${offlineSession.accessToken}`);
      console.log(`\nExample URL:`);
      console.log(`https://${offlineSession.shop}/admin/api/2025-10/shop.json`);
    }
  } catch (error) {
    console.error("❌ Error retrieving access token:", error.message);
    if (error.message.includes("connect")) {
      console.error("\n💡 提示: 请检查 DATABASE_URL 环境变量是否正确设置");
      console.error("   例如: DATABASE_URL=\"postgresql://user:password@host:5432/dbname\"");
    }
  } finally {
    await prisma.$disconnect();
  }
}

getAccessToken();










