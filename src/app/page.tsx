"use client";

import { useEffect } from "react";
import { LegacyCard, Page, Layout, Text, Spinner, VerticalStack } from "@shopify/polaris";

export default function Home() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    if (shop) {
      window.location.href = `/api/auth?shop=${shop}`;
    }
  }, []);

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
                  Customer Support & Returns Automation for Shopify
                </Text>
                <Text variant="bodySm" as="p" color="subdued">
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
