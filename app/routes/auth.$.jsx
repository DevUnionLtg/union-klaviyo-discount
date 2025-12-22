import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // After successful OAuth, redirect to the app
  if (session) {
    return redirect("/app");
  }

  return null;
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
