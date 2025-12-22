import prisma from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const apiKey = url.searchParams.get("apiKey");

  const expectedApiKey = process.env.ADMIN_API_KEY;
  if (expectedApiKey && apiKey !== expectedApiKey) {
    return new Response(
      JSON.stringify({ error: "Invalid API key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const where = shop ? { shop } : {};
    
    const sessions = await prisma.session.findMany({
      where,
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
      return new Response(
        JSON.stringify({ error: "No sessions found", shop: shop || "all shops" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const includeAll = url.searchParams.get("all") === "true";
    
    if (includeAll) {
      return new Response(
        JSON.stringify({
          sessions: sessions.map(s => ({
            shop: s.shop,
            accessToken: s.accessToken,
            scope: s.scope,
            expires: s.expires,
            isOnline: s.isOnline,
            sessionId: s.id,
          })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      const offlineSession = sessions.find(s => !s.isOnline) || sessions[0];
      return new Response(
        JSON.stringify({
          shop: offlineSession.shop,
          accessToken: offlineSession.accessToken,
          scope: offlineSession.scope,
          expires: offlineSession.expires,
          isOnline: offlineSession.isOnline,
          sessionId: offlineSession.id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

