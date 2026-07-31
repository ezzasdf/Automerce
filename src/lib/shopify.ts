let _shopify: any = null;

export function getShopify() {
  if (!_shopify) {
    const { shopifyApi, ApiVersion } = require("@shopify/shopify-api");
    require("@shopify/shopify-api/adapters/node");
    _shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY!,
      apiSecretKey: process.env.SHOPIFY_API_SECRET!,
      scopes: (process.env.SHOPIFY_SCOPES || "read_orders,write_orders,read_customers").split(","),
      hostName: (process.env.SHOPIFY_APP_URL || "http://localhost:3000").replace(/https?:\/\//, ""),
      apiVersion: ApiVersion.October24,
      isEmbeddedApp: true,
    });
  }
  return _shopify;
}

export function buildAuthUrl(shopDomain: string, state: string): string {
  const apiKey = process.env.SHOPIFY_API_KEY!;
  const scopes = process.env.SHOPIFY_SCOPES || "read_orders,write_orders,read_customers";
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: apiKey,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

export function getShopifyClient(accessToken: string, shopDomain: string) {
  const shopify = getShopify();
  return new shopify.clients.Graphql({
    session: {
      shop: shopDomain,
      accessToken,
      scope: process.env.SHOPIFY_SCOPES || "",
      isOnline: true,
      state: "",
    } as any,
  });
}

export function getShopifyRestClient(accessToken: string, shopDomain: string) {
  const shopify = getShopify();
  return new shopify.clients.Rest({
    session: {
      shop: shopDomain,
      accessToken,
      scope: process.env.SHOPIFY_SCOPES || "",
      isOnline: true,
      state: "",
    } as any,
  });
}
