import db from "../db.server";

const FUNCTION_NAME = "union-klaviyo-discount-function";
const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY || "";
const KLAVIYO_EVENTS_ENDPOINT = "https://a.klaviyo.com/api/events";

async function createKlaviyoEvent(data) {
  try {
    console.log(`Creating Klaviyo event for email ${data.email} with discount code: ${data.discountCode}`);
    
    const response = await fetch(KLAVIYO_EVENTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        "Content-Type": "application/json",
        "revision": "2026-01-15",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            metric: {
              data: {
                type: "metric",
                attributes: {
                  name: "Discount Code Created By Shopify App"
                }
              }
            },
            profile: {
              data: {
                type: "profile",
                attributes: {
                  email: data.email
                }
              }
            },
            properties: {
              discount_code: data.discountCode,
              source: "Wenbo's Shopify App"
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Klaviyo API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("Klaviyo event created successfully:", result);
    
    return result;
  } catch (error) {
    console.error("Error creating Klaviyo event:", error);
    throw error;
  }
}

function constructDiscountCode(organization, firstName, lastName) {
  const sourceText = organization || `${firstName || ""} ${lastName || ""}`.trim();
  
  if (!sourceText) {
    throw new Error("Either organization or name (first_name + last_name) must be provided");
  }
  
  const discountCode = sourceText
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  
  if (!discountCode) {
    throw new Error("Failed to generate valid discount code from provided data");
  }
  
  return discountCode;
}

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
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { email, first_name, last_name, organization, shop: requestShop } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email is required" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!organization && !first_name && !last_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Either organization or name (first_name + last_name) is required" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let promo_code;
    try {
      promo_code = constructDiscountCode(organization, first_name, last_name);
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Generated discount code "${promo_code}" for email: ${email}`);

    // Get the session from database (dynamically detect shop domain)
    // If shop is provided in request, use it; otherwise get the most recent offline session
    const session = await db.session.findFirst({
      where: requestShop
        ? {
            shop: requestShop,
            isOnline: false,
          }
        : {
            isOnline: false,
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

    const shopDomain = session.shop;
    console.log(`Creating discount code "${promo_code}" for shop: ${shopDomain}`);

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

    try {
      await createKlaviyoEvent({
        email: email,
        discountCode: promo_code,
      });
      console.log(`Successfully created Klaviyo event for email ${email}`);
    } catch (klaviyoError) {
      console.error("Failed to create Klaviyo event:", klaviyoError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        discountId,
        code: promo_code,
        email: email,
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
          email: "{{person.email}} (required)",
          first_name: "{{person.first_name}} (optional)",
          last_name: "{{person.last_name}} (optional)",
          organization: "{{person.organization}} (optional, preferred)",
          shop: "your-store.myshopify.com (optional)"
        },
        note: "Discount code is generated from organization or first_name + last_name. Shop domain is automatically detected from database session if not provided. After creating the discount in Shopify, a Klaviyo event is triggered.",
        examples: [
          {
            input: { 
              email: "john@company.com",
              organization: "ABC Design Inc.",
              first_name: "John",
              last_name: "Doe"
            },
            output: {
              code: "ABCDESIGNINC"
            }
          },
          {
            input: { 
              email: "jane@example.com",
              first_name: "Jane",
              last_name: "Smith"
            },
            output: {
              code: "JANESMITH"
            }
          }
        ]
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

