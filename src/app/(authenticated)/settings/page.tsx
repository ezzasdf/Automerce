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
  Checkbox,
  Banner,
  Badge,
  HorizontalStack,
} from "@shopify/polaris";

export default function SettingsPage() {
  const [shopName, setShopName] = useState("My Shopify Store");
  const [returnPolicy, setReturnPolicy] = useState("30-day return policy for unused items in original packaging.");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoRespond, setAutoRespond] = useState(false);
  const [notifyOnNewTicket, setNotifyOnNewTicket] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [shopifySyncEnabled, setShopifySyncEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleShopifySync() {
    const params = new URLSearchParams(window.location.search);
    const shopDomain = params.get("shop") || "";
    if (!shopDomain) return;

    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`Synced ${data.synced} conversations (${data.errors} errors)`);
      } else {
        setSyncResult(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      setSyncResult("Sync failed — network error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Page title="Settings">
      {saved && (
        <div style={{ marginBottom: "16px" }}>
          <Banner status="success">Settings saved successfully.</Banner>
        </div>
      )}

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
                <Button primary onClick={handleSave}>Save Changes</Button>
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
                  <Button primary onClick={handleSave}>Save Changes</Button>
                </VerticalStack>
              </div>
            </LegacyCard>
          </div>
        </Layout.Section>

        <Layout.Section oneHalf>
          <LegacyCard title="Email Integration">
            <div style={{ padding: "16px" }}>
              <VerticalStack gap="400">
                <Checkbox
                  label="Enable email-to-ticket conversion"
                  checked={emailEnabled}
                  onChange={setEmailEnabled}
                />
                {emailEnabled && (
                  <>
                    <LegacyCard>
                      <div style={{ padding: "16px" }}>
                        <VerticalStack gap="200">
                          <Text variant="bodyMd" as="span" fontWeight="bold">
                            Webhook URL
                          </Text>
                          <Text variant="bodySm" as="span" color="subdued">
                            Configure your email service to forward inbound emails to this URL:
                          </Text>
                          <div style={{
                            padding: "12px",
                            backgroundColor: "#f6f6f7",
                            borderRadius: "8px",
                            fontFamily: "monospace",
                            fontSize: "13px",
                            wordBreak: "break-all",
                          }}>
                            https://automerce.vercel.app/api/webhooks/email
                          </div>
                          <Text variant="bodySm" as="span" color="subdued">
                            Supported services: SendGrid Inbound Parse, Mailgun Routes, Postmark Inbound
                          </Text>
                        </VerticalStack>
                      </div>
                    </LegacyCard>
                    <Text variant="bodySm" as="span" color="subdued">
                      Inbound emails are automatically converted to support tickets.
                      The sender&apos;s email is matched to existing customers and orders.
                    </Text>
                  </>
                )}
                <Button primary onClick={handleSave}>Save Changes</Button>
              </VerticalStack>
            </div>
          </LegacyCard>

          <div style={{ marginTop: "16px" }}>
            <LegacyCard title="Shopify Conversation Sync">
              <div style={{ padding: "16px" }}>
                <VerticalStack gap="400">
                  <Checkbox
                    label="Sync Shopify order notes as tickets"
                    checked={shopifySyncEnabled}
                    onChange={setShopifySyncEnabled}
                  />
                  {shopifySyncEnabled && (
                    <HorizontalStack gap="200" align="center">
                      <Button onClick={handleShopifySync} loading={syncing}>
                        Sync Now
                      </Button>
                      {syncResult && (
                        <Badge status={syncResult.includes("failed") ? "critical" : "success"}>
                          {syncResult}
                        </Badge>
                      )}
                    </HorizontalStack>
                  )}
                  <Text variant="bodySm" as="span" color="subdued">
                    Pulls order notes and customer conversations from Shopify
                    and creates support tickets. Run manually or set up a cron job.
                  </Text>
                  <Button primary onClick={handleSave}>Save Changes</Button>
                </VerticalStack>
              </div>
            </LegacyCard>
          </div>

          <div style={{ marginTop: "16px" }}>
            <LegacyCard title="Notifications">
              <div style={{ padding: "16px" }}>
                <VerticalStack gap="400">
                  <Checkbox
                    label="Email me on new tickets"
                    checked={notifyOnNewTicket}
                    onChange={setNotifyOnNewTicket}
                  />
                  <Button primary onClick={handleSave}>Save Changes</Button>
                </VerticalStack>
              </div>
            </LegacyCard>
          </div>

          <div style={{ marginTop: "16px" }}>
            <LegacyCard title="API Keys">
              <div style={{ padding: "16px" }}>
                <VerticalStack gap="200">
                  <Text variant="bodyMd" as="span">
                    API keys are configured as environment variables in Vercel.
                  </Text>
                  <Text variant="bodySm" as="span" color="subdued">
                    To update your API keys, go to your Vercel dashboard and edit the environment variables.
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
