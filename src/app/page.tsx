"use client";

import { useEffect, useState } from "react";
import { LegacyCard, Page, Layout, Text, Spinner, VerticalStack, Button } from "@shopify/polaris";

export default function Home() {
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    if (shop) {
      window.location.href = `/api/auth?shop=${shop}`;
    } else {
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <LegacyCard>
              <div style={{ padding: "40px", textAlign: "center" }}>
                <VerticalStack gap="400" align="center">
                  <Text variant="headingLg" as="h1">Support Auto</Text>
                  <Text variant="bodyMd" as="p" color="subdued">
                    Customer Support & Returns Automation for Shopify
                  </Text>
                  <Text variant="bodyMd" as="p" color="subdued">
                    This app must be opened from your Shopify admin panel.
                  </Text>
                  <Text variant="bodySm" as="p" color="subdued">
                    Install the app from Settings &gt; Apps in your Shopify store, then click on it to open.
                  </Text>
                </VerticalStack>
              </div>
            </LegacyCard>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <LegacyCard>
            <div style={{ padding: "40px", textAlign: "center" }}>
              <VerticalStack gap="400" align="center">
                <Spinner size="large" />
                <Text variant="headingLg" as="h1">Support Auto</Text>
                <Text variant="bodyMd" as="p" color="subdued">
                  Redirecting to Shopify authentication...
                </Text>
              </VerticalStack>
            </div>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
