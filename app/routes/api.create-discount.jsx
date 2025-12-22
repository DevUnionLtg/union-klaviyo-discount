import db from "../db.server";

/**
 * API endpoint to create discount codes via webhook
 * 
 * POST /api/create-discount
 * 
 * Headers:
 *   - Content-Type: application/json
 * 
 * Body:
 *   {
 *     "promo_code": "MYCODE123"
 *   }
 * 
 * Response:
 *   {
 *     "success": true,
 *     "discountId": "gid://shopify/DiscountCodeApp/123",
 *     "code": "MYCODE123"
 *   }
 * 
 * Note: Shop domain is automatically detected from the database session.
 */

// Function name to query from Shopify
const FUNCTION_NAME = "union-klaviyo-discount-function";

/**
 * Query Shopify Functions to get the function ID by name
 * @param {string} shopDomain - Shop domain
 * @param {string} accessToken - Shopify access token
 * @param {string} functionName - Function title/name to search for
 * @returns {Promise<string|null>} Function ID or null if not found
 */
async function getFunctionId(shopDomain, accessToken, functionName) {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2025-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: `
            query {
              shopifyFunctions(first: 25) {
                nodes {
                  app {
                    title
                    id
                  }
                  apiType
                  title
                  id
                }
              }
            }
          `,
        }),
      }
    );

    const result = await response.json();

    if (result.errors) {
      console.error("Error querying Shopify Functions:", result.errors);
      return null;
    }

    const functions = result.data?.shopifyFunctions?.nodes || [];
    const functionNode = functions.find(
      (func) => func.title === functionName && func.apiType === "discount"
    );

    if (functionNode) {
      console.log(`Found function ID: ${functionNode.id} for function: ${functionName}`);
      return functionNode.id;
    }

    console.warn(`Function "${functionName}" not found in shopifyFunctions`);
    return null;
  } catch (error) {
    console.error("Error fetching function ID:", error);
    return null;
  }
}

export const action = async ({ request }) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const { promo_code, shop: requestShop } = body;

    if (!promo_code) {
      return new Response(
        JSON.stringify({ success: false, error: "promo_code is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the session from database (dynamically detect shop domain)
    // If shop is provided in request, use it; otherwise get the most recent offline session
    const session = await db.session.findFirst({
      where: requestShop
        ? {
            shop: requestShop,
            isOnline: false, // Use offline token for API calls
          }
        : {
            isOnline: false, // Use offline token for API calls
          },
      orderBy: {
        id: 'desc',
      },
    });

    if (!session) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: requestShop
            ? `No session found for shop: ${requestShop}. Please ensure the app is installed.`
            : "No session found in database. Please ensure the app is installed on at least one shop." 
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get shop domain from session
    const shopDomain = session.shop;
    console.log(`Creating discount code "${promo_code}" for shop: ${shopDomain}`);

    // Get function ID dynamically
    console.log(`Querying function ID for: ${FUNCTION_NAME}`);
    const functionId = await getFunctionId(shopDomain, session.accessToken, FUNCTION_NAME);

    if (!functionId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Function "${FUNCTION_NAME}" not found. Please ensure the function is deployed.` 
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Using function ID: ${functionId}`);

    // Create discount code using Shopify Admin API
    const response = await fetch(
      `https://${shopDomain}/admin/api/2025-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session.accessToken,
        },
        body: JSON.stringify({
          query: `
            mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
              discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
                codeAppDiscount {
                  discountId
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            codeAppDiscount: {
              title: promo_code,
              code: promo_code,
              functionId: functionId,
              discountClasses: ["PRODUCT"],
              startsAt: new Date().toISOString(),
            },
          },
        }),
      }
    );

    const result = await response.json();
    console.log("Shopify API response:", JSON.stringify(result, null, 2));

    // Check for errors
    if (result.errors) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "GraphQL errors",
          details: result.errors 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { discountCodeAppCreate } = result.data || {};
    
    if (discountCodeAppCreate?.userErrors?.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Discount creation failed",
          userErrors: discountCodeAppCreate.userErrors 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const discountId = discountCodeAppCreate?.codeAppDiscount?.discountId;

    console.log(`Successfully created discount code "${promo_code}" with ID: ${discountId}`);

    return new Response(
      JSON.stringify({
        success: true,
        discountId,
        code: promo_code,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating discount code:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        message: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Handle GET requests with a helpful message
export const loader = async () => {
  return new Response(
    JSON.stringify({
      message: "Discount Code Creation API",
      usage: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          promo_code: "MYCODE123 (required)",
        },
        note: "Shop domain is automatically detected from database session",
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

