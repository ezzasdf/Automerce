# Support Auto

Customer Support & Returns Automation for Shopify. Powered by Claude AI.

## What It Does

- **AI Auto-Responses** — When a customer emails about an order, the app reads order data from Shopify, generates a contextual response via Claude AI, and queues it for merchant review
- **Smart Refund Rules** — Set rules like "Auto-refund orders under $50 within 30 days." The engine evaluates requests and either auto-processes or escalates
- **Unified Dashboard** — All support tickets, order context, and refund activity visible in one place inside Shopify admin

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TypeScript + Shopify Polaris v11 |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Shopify OAuth |
| AI | Anthropic Claude |
| Hosting | Vercel |

## Setup

### 1. Create Accounts

**Supabase** (database)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor**, paste the contents of `supabase/migrations/001_initial_schema.sql`, and run it
4. Copy your **Project URL**, **anon key**, **service_role key**, and **database URL** from Settings > API

**Shopify Partners** (app registration)
1. Sign up at [partners.shopify.com](https://partners.shopify.com)
2. Create a **Development Store** for testing
3. Click **Apps** > **Create App** > **Custom app**
4. Copy your **API key** and **API secret key**

**Anthropic** (AI)
1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local` with your real credentials.

### 4. Run Locally

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### 5. Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Set all environment variables in the Vercel dashboard
4. Deploy

### 6. Connect to Shopify

1. Go to your app in Shopify Partners
2. Set **App URL** to your Vercel domain (e.g., `https://support-auto.vercel.app`)
3. Add redirect URL: `https://your-domain.vercel.app/api/auth/callback`
4. Install the app on your dev store
5. The OAuth flow will redirect to your dashboard

## Project Structure

```
src/
  app/
    api/
      auth/              # Shopify OAuth flow
      webhooks/          # Order + refund + GDPR webhooks
      ai/                # Claude AI response generation
      tickets/           # Ticket CRUD + AI respond
      orders/            # Order listing
      refunds/           # Refund rules + processing + logs
      dashboard/         # Dashboard stats
    (authenticated)/     # Dashboard pages (protected)
  components/
    AppProvider.tsx      # Polaris provider
    AppSidebar.tsx       # Navigation sidebar
  lib/
    shopify.ts           # Shopify API client
    supabase.ts          # Supabase client
    webhook-utils.ts     # HMAC verification
    ai/support-engine.ts # Claude AI integration
    refunds/             # Rule engine + processor
    db/                  # Database helpers
  types/index.ts         # TypeScript types
supabase/
  migrations/            # Database schema
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth` | GET | Initiate Shopify OAuth |
| `/api/auth/callback` | GET | OAuth callback |
| `/api/webhooks/orders` | POST | Order sync webhook |
| `/api/webhooks/refunds` | POST | Refund event webhook |
| `/api/webhooks/gdpr` | POST | GDPR compliance webhooks |
| `/api/tickets` | GET/POST | List/create tickets |
| `/api/tickets/[id]` | GET/PATCH | Get/update ticket |
| `/api/tickets/[id]/respond` | POST | Generate AI response |
| `/api/orders` | GET | List orders |
| `/api/refunds/process` | POST | Process refund |
| `/api/refunds/rules` | GET/POST | List/create refund rules |
| `/api/refunds/logs` | GET | List refund history |
| `/api/dashboard` | GET | Dashboard stats |

## License

Private — not yet licensed for distribution.
