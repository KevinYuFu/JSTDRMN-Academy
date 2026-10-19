# JSTDRMN Academy

Standalone site for [JSTDRMN](https://www.jstdrmn.com) Academy (“Just Dreamin’”), a Toronto EDM collective. It is separate from the HubSpot marketing site. The menu is Programs, Private Sessions, Events, Dashboard, and My Courses. Headliner is one subscription on a banner. Group classes and self-paced lessons are cards in the programs grid, including FB2B (Ash F, From Bedroom to Banger) and the bootcamps.

No Stripe, HubSpot, or Discord keys are required. Checkout is mocked and still grants access. HubSpot and Discord stay quiet until their env vars are set.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

`npm run dev` creates the SQLite database, seeds it, and starts Next.js. The seed runs once. Delete `prisma/dev.db` if you want the demo data back.

```bash
npm test
```

Access rules live in `lib/entitlements.ts`.

## Demo logins

| Who | Email | Password | What they can open |
| --- | --- | --- | --- |
| Yu, Academy lead | yu@jstdrmn.com | boothlights | Every program, both DJ Bootcamp cohorts, the lesson editor, grant/revoke, student notes, mentors, events, announcements, and private-session requests |
| Maya Chen | maya@jstdrmn.com | headliner | The Headliner path and the Headliner Discord card. Everything else shows an upsell |
| Jordan Blake | jordan@jstdrmn.com | cohort6 | Foundations of Club Mixing, and DJ Bootcamp Cohort 6 only |

## Products

Prices are CAD. A new program is a course record: title, blurb, status, price, billing, and where it sits (`banner` or `grid`).

- **Headliner** — the banner. Monthly, price not set (`$X/month`) until `HEADLINER_PRICE_CENTS` is set. Access lasts while the subscription is paid. The path is a track tree: Welcome to JSTDRMN Academy, Introduction to EDM, The Progression Tree, then Branding, DJing, Producing (Beginner and Advanced), and Mashups & Remixes.
- **Programs** — the grid. Foundations of Club Mixing is $50 once. FB2B is a special offering Ash F presents, $50/month, with a placeholder instead of a made-up curriculum. Bootcamps show a status tag and hide the price until `priceCents` is set. Learn More opens that program. Bootcamps apply through the HubSpot link on the record.
- **Private Sessions** — its own tab. Mentor cards open in the page. Request a session stores the chosen mentor for the Academy lead. Scheduling and payment are not built yet. The lead adds, edits, and hides mentors.
- **Events** — academy events, separate from showcase nights. Four seeded types (Community Connect, Green Room, Sync, Production Feedback). Each type and event has a join action: a link, or Add to calendar. Connect Discord shows up only for a Discord destination.
- **Headliner perks** — Join Headliner Discord. Headliner only.

## Stripe, HubSpot, and Discord

Copy `.env.example` into `.env`. Empty `STRIPE_SECRET_KEY` keeps mock checkout. `POST /api/stripe/webhook` grants the same entitlement when a real webhook secret is set.

HubSpot options are in [docs/HUBSPOT.md](docs/HUBSPOT.md). Discord OAuth plus the Headliner role bot are in [docs/DISCORD.md](docs/DISCORD.md). Architecture and open questions are in [docs/PLAN.md](docs/PLAN.md).

New lessons default to a Google Drive preview embed (`https://drive.google.com/file/d/<id>/preview`). Share each file with the student’s email, not “anyone with the link.” Bunny Stream is the planned upgrade. That provider stays in the app and signs embeds only after its env vars are set.

## Deploy on Vercel

Local development stays on SQLite. Vercel has no disk to keep that file, so production uses hosted Postgres (Neon, Supabase, or Vercel Postgres). The build runs `prisma generate` and `next build`. It does not migrate or seed. When `DATABASE_URL` starts with `postgres://` or `postgresql://`, the build writes `prisma/schema.deploy.prisma` with the Postgres provider and generates the client from that file. A `file:` URL keeps the SQLite schema.

### Environment variables

Set these on the Vercel project. Blank optional values keep the same fallbacks as a laptop: mock checkout, and HubSpot, Discord, and Bunny staying quiet.

| Variable | Required in production | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Postgres URL for the running app (`postgresql://…`). Locally this is `file:./dev.db`. |
| `DIRECT_URL` | For migrations | Non-pooled Postgres URL. `prisma db push` uses it. If you omit it, the deploy schema points `directUrl` at `DATABASE_URL`. |
| `APP_URL` | Yes | Public `https` origin, no trailing slash. Stripe return URLs, the Discord redirect, and HubSpot signature checks use it. |
| `HEADLINER_PRICE_CENTS` | No | CAD cents for Headliner. Leave blank to keep showing `$X/month`. Other prices live on each program row. |
| `STRIPE_SECRET_KEY` | No | Empty keeps mock checkout, which still grants access. |
| `STRIPE_WEBHOOK_SECRET` | With live Stripe | Verifies `POST /api/stripe/webhook`. |
| `HUBSPOT_PRIVATE_APP_TOKEN` | No | Contact sync and the cohort webhook no-op until this is set. |
| `HUBSPOT_CLIENT_SECRET` | With HubSpot webhooks | Signs the webhook. |
| `HUBSPOT_LIVE` | No | `true` lets a deal-stage event look up the contact. Default is off. |
| `HUBSPOT_ACCEPTED_DEAL_STAGES` | No | Comma-separated stage ids, default `closedwon,accepted`. |
| `HUBSPOT_DJ_BOOTCAMP_URL`, `HUBSPOT_PRODUCTION_BOOTCAMP_URL`, `HUBSPOT_MASHUP_BOOTCAMP_URL` | No | Optional overrides. The apply link that students see is the `hubspotUrl` on the program row. |
| `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_HEADLINER_ROLE_ID` | No | Role add/remove. No-op until all three are set. | 
| `DISCORD_PRODUCER_ROLE_ID` | No | Documented producer-role id for a producers channel. The bot call is the same shape as Headliner. |
| `CRON_SECRET` | No | If set, `GET /api/cron/announcements` requires `Authorization: Bearer`. Vercel Cron uses this. |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | No | Connect Discord. Off until both are set. |
| `DISCORD_REDIRECT_URI` | With Discord OAuth | Defaults to `{APP_URL}/api/discord/callback`. |
| `DISCORD_HEADLINER_INVITE_URL` | No | Shown on the Join Headliner Discord card. The card still renders without it. |
| `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_TOKEN_KEY` | No | Planned video host. The stub stays unsigned until both are set. |

Session cookies are `Secure` when `NODE_ENV` is `production`, which is how Vercel runs the app.

### Database

1. Create a Postgres database and copy its pooled URL into `DATABASE_URL`. Put the direct URL in `DIRECT_URL` when the host gives you both.
2. From a machine that has those variables:

```bash
node scripts/prepare-prisma.mjs
npx prisma generate --schema prisma/schema.deploy.prisma
npx prisma db push --schema prisma/schema.deploy.prisma
npx tsx prisma/seed.ts
```

Run the seed once, for the demo accounts. Do not run it again on an academy that already has students. A newer seed version deletes the existing rows and writes the demo data back.

3. Import the repo in Vercel and deploy. Later deploys pick up code only. Schema changes are another `prisma db push` from your machine, not part of the Vercel build.
