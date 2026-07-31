# Support Auto — Project Plan

## Vision

SaaS Shopify embedded app that automates customer support responses (via Claude AI) and processes refund/return requests based on configurable rules. Targets Shopify/Etsy sellers.

**Revenue model:** Subscription tiers ($29–99/mo) based on ticket volume.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TypeScript + Shopify Polaris v11 + Tailwind CSS v3 |
| Backend | Next.js API Routes (App Router) |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Shopify OAuth |
| AI | Anthropic Claude (mock mode when no key) |
| Hosting | Vercel |
| Repo | github.com/ezzasdf/Automerce |

---

## Live URLs

| Service | URL |
|---------|-----|
| App | https://automerce.vercel.app |
| Supabase | https://pszetwpstrdxvjlxcrnx.supabase.co |
| GitHub | https://github.com/ezzasdf/Automerce |

---

## Database Schema (6 tables)

- **shops** — Shopify store connections (domain, access token, scope)
- **orders** — Synced Shopify orders (customer, items, status, totals)
- **tickets** — Support tickets (status, priority, category, AI response)
- **ticket_messages** — Conversation threads (customer, AI, human messages)
- **refund_rules** — Configurable automation rules (conditions + actions, JSON)
- **refund_logs** — Refund processing history (amount, status, Shopify refund ID)

---

## Features — Completed

### OAuth & Webhooks
- Shopify OAuth flow (`/api/auth`, `/api/auth/callback`)
- Order sync webhooks (`orders/create`, `orders/updated`, etc.)
- Refund event webhooks (`refunds/create`)
- GDPR compliance webhooks (`customers/data-request`, `customers/redact`, `shop/redact`, `app/uninstalled`)
- HMAC webhook verification

### AI Support Engine
- Claude AI response generation from ticket context + order data
- Ticket auto-categorization (return, refund, inquiry, complaint)
- Priority assignment (low, normal, high, urgent)
- **Mock mode** — contextual responses when no Anthropic API key

### Refund Rule Engine
- Condition matching (order total max, days limit, category)
- Priority-based rule sorting
- Auto-refund vs manual escalation
- Create/delete rules from UI

### Dashboard Pages
- **Dashboard** — Stats cards (orders, open tickets, pending refunds, resolved) + recent tickets
- **Orders** — Searchable/filterable order table
- **Tickets** — Ticket list with create modal, category/status/priority badges, AI response status
- **Ticket Detail** — Full conversation view, AI response generation, manual reply, refund processing, resolve
- **Refunds** — Tabbed view (History + Automation Rules), create/delete rules
- **Settings** — Store info, AI config, notifications

### Security (Fixed)
- Mass-assignment protection on ticket PATCH (field allowlist)
- Shop domain validation regex in auth
- JSON parse error handling in GDPR webhook
- Shop data cleanup on uninstall/redact

### UX (Fixed)
- Error states on all dashboard pages
- Empty states with helpful messages
- Loading states on async actions (reply, create rule)
- Refund button disabled when no order linked
- Homepage shows install prompt instead of infinite spinner
- Settings save feedback

---

## API Endpoints (15)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth` | GET | Initiate Shopify OAuth |
| `/api/auth/callback` | GET | OAuth callback |
| `/api/webhooks/orders` | POST | Order sync webhook |
| `/api/webhooks/refunds` | POST | Refund event webhook |
| `/api/webhooks/gdpr` | POST | GDPR compliance webhooks |
| `/api/tickets` | GET/POST | List/create tickets |
| `/api/tickets/[id]` | GET/PATCH | Get/update ticket (field allowlist) |
| `/api/tickets/[id]/respond` | POST | Generate AI response |
| `/api/orders` | GET | List orders |
| `/api/refunds/process` | POST | Process refund |
| `/api/refunds/rules` | GET/POST/DELETE | CRUD refund rules |
| `/api/refunds/logs` | GET | List refund history |
| `/api/dashboard` | GET | Dashboard stats |

---

## Polaris v11 Quirks (Learned)

- Uses `LegacyCard` (not `Card`) for title/footerAction props
- `Badge` uses `status` not `tone`; valid values: `success`, `attention`, `warning`, `critical`
- `Text` requires `as` prop
- `HorizontalStack`/`VerticalStack` not `Stack`
- No `distribution` prop on `HorizontalStack` (use div flex)
- `Page` uses `backAction` not `breadcrumbs`
- `Button` uses `plain` not `variant="tertiary"`

## Build Gotchas (Learned)

- Node.js v18 constraint: Next.js 14 + Polaris v11 (not v13)
- `eslint@8` required (eslint@9 conflicts with eslint-config-next@14)
- `.npmrc` with `legacy-peer-deps=true` needed for Vercel
- All Supabase + Shopify clients must be lazy-initialized (no top-level `createClient()`)
- Pages using `useSearchParams()` need `<Suspense>` boundary
- `require()` used for Shopify API to avoid build-time env var errors

---

## Next Steps

### Priority 1 — Go Live
- [ ] Get real Anthropic API key → replace mock mode
- [ ] Place a test order on dev store → verify webhook syncs to Supabase
- [ ] Create a test ticket → verify AI response generation (real or mock)
- [ ] Process a test refund → verify Shopify refund created

### Priority 2 — Core Features
- [ ] Email integration — receive customer emails as tickets
- [ ] Shopify inbox integration — read/write Shopify messages
- [ ] Auto-response toggle — send AI replies automatically without review
- [ ] Settings persistence — save store settings to database (currently UI only)
- [ ] Per-shop refund policies stored in DB (currently hardcoded)

### Priority 3 — Polish
- [ ] Real-time updates via Supabase Realtime or polling
- [ ] Ticket assignment to team members
- [ ] Canned responses / templates
- [ ] Bulk refund processing
- [ ] Analytics dashboard (response time, resolution rate, refund trends)

### Priority 4 — Monetization
- [ ] Shopify billing integration (charge merchants monthly)
- [ ] Usage-based pricing tiers
- [ ] Trial period management
- [ ] Plan limits enforcement (ticket volume caps)

### Priority 5 — Scale
- [ ] Multi-store support per account
- [ ] Webhook queue for reliability (prevent dropped webhooks)
- [ ] Rate limiting on API routes
- [ ] Monitoring & error tracking (Sentry or similar)
- [ ] Terms of service & privacy policy pages
