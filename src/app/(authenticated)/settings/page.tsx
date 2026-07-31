"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  Spinner,
} from "@shopify/polaris";

function SettingsContent() {
  const searchParams = useSearchParams();
  const shopDomain = searchParams.get("shop") || "";

  const [shopName, setShopName] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoRespond, setAutoRespond] = useState(false);
  const [notifyOnNewTicket, setNotifyOnNewTicket] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [shopifySyncEnabled, setShopifySyncEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!shopDomain) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/settings?shop=${shopDomain}`);
        const data = await res.json();
        if (data.settings) {
          setShopName(data.settings.shopName || "");
          setReturnPolicy(data.settings.returnPolicy || "");
          setAiEnabled(data.settings.aiEnabled);
          setAutoRespond(data.settings.autoRespond);
          setNotifyOnNewTicket(data.settings.notifyOnNewTicket);
          setEmailEnabled(data.settings.emailEnabled);
          setShopifySyncEnabled(data.settings.shopifySyncEnabled);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [shopDomain]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain,
          shop_name: shopName,
          return_policy: returnPolicy,
          ai_enabled: aiEnabled,
          auto_respond: autoRespond,
          notify_on_ticket: notifyOnNewTicket,
          email_enabled: emailEnabled,
          shopify_sync_enabled: shopifySyncEnabled,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleShopifySync() {
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

  if (loading) {
    return (
      <Page title="Settings">
        <LegacyCard>
          <div style={{ padding: "40px", textAlign: "center" }}>
            <Spinner size="large" />
          </div>
        </LegacyCard>
      </Page>
    );
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
                <Button primary onClick={handleSave} loading={saving}>Save Changes</Button>
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
                    label="Auto-send AI responses without review"
                    checked={autoRespond}
                    onChange={setAutoRespond}
                    helpText="When enabled, AI replies are sent immediately to customers via email. Disable to queue responses for your review."
                  />
                  {autoRespond && (
                    <Banner status="warning">
                      <Text variant="bodySm" as="span">
                        Auto-respond is ON. AI will reply to new tickets and emails immediately without your review.
                      </Text>
                    </Banner>
                  )}
                  <Button primary onClick={handleSave} loading={saving}>Save Changes</Button>
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
                          Supported: SendGrid Inbound Parse, Mailgun Routes, Postmark Inbound
                        </Text>
                      </VerticalStack>
                    </div>
                  </LegacyCard>
                )}
                <Button primary onClick={handleSave} loading={saving}>Save Changes</Button>
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
                      <Button onClick={handleShopifySync} loading={syncing}>Sync Now</Button>
                      {syncResult && (
                        <Badge status={syncResult.includes("failed") ? "critical" : "success"}>
                          {syncResult}
                        </Badge>
                      )}
                    </HorizontalStack>
                  )}
                  <Button primary onClick={handleSave} loading={saving}>Save Changes</Button>
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
                  <Button primary onClick={handleSave} loading={saving}>Save Changes</Button>
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
                    To update, edit environment variables in your Vercel dashboard.
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

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
