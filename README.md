# JSTDRMN Academy

Standalone site for [JSTDRMN](https://www.jstdrmn.com) Academy (“Just Dreamin’”), a Toronto EDM collective. It is separate from the HubSpot marketing site. GitHub is the repo for versioning: [KevinYuFu/JSTDRMN-Academy](https://github.com/KevinYuFu/JSTDRMN-Academy). The menu is Programs, Private Sessions, Events, Dashboard, and My Courses. Headliner is one subscription on a banner. Group classes and self-paced lessons are cards in the programs grid, including FB2B (Ash F, From Bedroom to Banger) and the bootcamps.

No Stripe, HubSpot, or Discord keys are required. Checkout is mocked and still grants access. HubSpot and Discord stay quiet until their env vars are set.

## Run

```bash
npm install
```

Copy `.env.example` to `.env`. Set `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. On your laptop both can be the same Postgres URL.

```bash
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

`npm run dev` applies committed migrations, then starts Next.js. It does not seed.

```bash
npm test
```

Access rules live in `lib/entitlements.ts`.

## Yu's login

The seed creates one teacher: `yu@jstdrmn.com`. A teacher can open every program. The password is `SEED_ADMIN_PASSWORD`. It is not in the repo.

Student accounts come from sign-up. The seed does not add other logins.

## Products

Prices are CAD. A new program is a course record: title, blurb, status, price, billing, and where it sits (`banner` or `grid`). The one-time seed loads DJ Bootcamp only. The other programs below show up when those course rows exist.

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

Production is Neon Postgres on Vercel.

- The app reads `DATABASE_URL` (pooled).
- Migrations read `DATABASE_URL_UNPOOLED` (direct).
- Vercel may also set `POSTGRES_PRISMA_URL` and other `POSTGRES_*` names. This app does not read those.

**Migrations run on every deploy.** `vercel.json` sets the build to `npm run build`. That script is `prisma generate && prisma migrate deploy && next build`. `migrate deploy` only applies migration files that are already in git. It does not seed. It does not delete rows.

**The seed does not run on deploy.** Run it yourself, once. Steps are below.

### Environment variables

Set these on the Vercel project. Blank optional values keep the same fallbacks as a laptop: mock checkout, and HubSpot, Discord, and Bunny staying quiet.

| Variable | Required in production | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Postgres URL. The running app uses this. |
| `DATABASE_URL_UNPOOLED` | Yes | Direct Postgres URL. Migrations use this during the build. Set it for Production and Preview. |
| `SEED_ADMIN_PASSWORD` | Only when you seed | Password for Yu. At least 8 characters. The build does not read it. |
| `SEED_ADMIN_EMAIL` | No | Defaults to `yu@jstdrmn.com`. |
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
| `CRON_SECRET` | No | If set, `GET /api/cron/announcements` requires `Authorization: Bearer`. Vercel Cron sends it. An external pinger must send the same header. |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | No | Connect Discord. Off until both are set. |
| `DISCORD_REDIRECT_URI` | With Discord OAuth | Defaults to `{APP_URL}/api/discord/callback`. |
| `DISCORD_HEADLINER_INVITE_URL` | No | Shown on the Join Headliner Discord card. The card still renders without it. |
| `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_TOKEN_KEY` | No | Planned video host. The stub stays unsigned until both are set. |

Session cookies are `Secure` when `NODE_ENV` is `production`, which is how Vercel runs the app.

### Scheduled announcements

Hobby accounts can schedule a cron only once per day. `vercel.json` calls `/api/cron/announcements` at `0 19 * * *` (19:00 UTC). Announcements post daily at about 3pm Toronto (3pm during EDT, 2pm during EST). Each run posts every announcement whose send time has already passed, so teachers should set send times before then. For a precise clock time later, use Vercel Pro, or a free external pinger such as [cron-job.org](https://cron-job.org) that requests the route with `Authorization: Bearer` set to `CRON_SECRET`.

### Seed once

Prisma reads `.env`. `vercel env pull` writes `.env.local`, which Prisma does not read. Copy `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into `.env`, or export them in the terminal.

```bash
SEED_ADMIN_PASSWORD="choose-a-long-password" npx prisma db seed
```

What that writes:

- DJ Bootcamp, Cohort 5, Cohort 6, and the placeholder lessons
- Four sample events (Community Connect, Green Room, Sync, Production Feedback) and their event types
- Yu, role `teacher`

Running it again updates those same rows. It does not delete students, other courses, or events you added. If you already replaced a placeholder video on one of those lessons, a second seed puts the placeholder back.

Leave `SEED_ADMIN_PASSWORD` unset on a later run if Yu already exists and you want to keep the current password.

Log in as `yu@jstdrmn.com` with the password you set.

If Preview and Production use the same database, a preview deploy migrates that database too. Point Preview at its own database if you do not want that.
