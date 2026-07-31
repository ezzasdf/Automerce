"use client";

import { useState } from "react";
import {
  Page,
  Layout,
  LegacyCard,
  Text,
  TextField,
  Button,
  VerticalStack,
  Select,
  Checkbox,
  Banner,
} from "@shopify/polaris";

export default function SettingsPage() {
  const [shopName, setShopName] = useState("My Shopify Store");
  const [returnPolicy, setReturnPolicy] = useState("30-day return policy for unused items in original packaging.");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoRespond, setAutoRespond] = useState(false);
  const [notifyOnNewTicket, setNotifyOnNewTicket] = useState(true);

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section oneHalf>
          <LegacyCard title="Store Information">
            <div style={{ padding: "16px" }}>
              <VerticalStack gap="400">
                <TextField
                  label="Store Name"
                  value={shopName}
                  onChange={setShopName}
                  autoComplete="off"
                />
                <TextField
                  label="Return Policy"
                  value={returnPolicy}
                  onChange={setReturnPolicy}
                  multiline={4}
                  helpText="This is used by the AI to assess refund eligibility"
                  autoComplete="off"
                />
                <Button primary>Save Changes</Button>
              </VerticalStack>
            </div>
          </LegacyCard>
          <div style={{ marginTop: "16px" }}>
            <LegacyCard title="AI Configuration">
              <div style={{ padding: "16px" }}>
                <VerticalStack gap="400">
                  <Checkbox
                    label="Enable AI auto-responses"
                    checked={aiEnabled}
                    onChange={setAiEnabled}
                  />
                  <Checkbox
                    label="Auto-send AI responses (without review)"
                    checked={autoRespond}
                    onChange={setAutoRespond}
                  />
                  <Banner status="info">
                    <Text variant="bodySm" as="span">
                      When enabled, AI will generate responses for new tickets.
                      With auto-send off, responses will be queued for your review.
                    </Text>
                  </Banner>
                  <Button primary>Save Changes</Button>
                </VerticalStack>
              </div>
            </LegacyCard>
          </div>
        </Layout.Section>
        <Layout.Section oneHalf>
          <LegacyCard title="Notifications">
            <div style={{ padding: "16px" }}>
              <VerticalStack gap="400">
                <Checkbox
                  label="Email me on new tickets"
                  checked={notifyOnNewTicket}
                  onChange={setNotifyOnNewTicket}
                />
                <Button primary>Save Changes</Button>
              </VerticalStack>
            </div>
          </LegacyCard>
          <div style={{ marginTop: "16px" }}>
            <LegacyCard title="API Keys">
              <div style={{ padding: "16px" }}>
                <VerticalStack gap="400">
                  <TextField
                    label="Anthropic API Key"
                    value="sk-ant-***"
                    readOnly
                    autoComplete="off"
                  />
                  <Text variant="bodySm" as="span" color="subdued">
                    Your API key is stored securely and never exposed to the client.
                  </Text>
                </VerticalStack>
              </div>
            </LegacyCard>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
