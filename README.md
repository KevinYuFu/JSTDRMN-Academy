# JSTDRMN Academy

Student portal for [JSTDRMN](https://www.jstdrmn.com) (“Just Dreamin’”), a Toronto EDM collective. Headliner is one subscription on a banner. Every other offering is a card in the programs grid, including FB2B (Ash F, From Bedroom to Banger) and the bootcamps. The public site stays on HubSpot; this app is the classroom.

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
| Yu, teacher | yu@jstdrmn.com | boothlights | Every program, both DJ Bootcamp cohorts, the lesson editor, grant/revoke, student notes, Headliner submissions |
| Maya Chen | maya@jstdrmn.com | headliner | The Headliner path, the Headliner Discord card, and the feedback space. Everything else shows an upsell |
| Jordan Blake | jordan@jstdrmn.com | cohort6 | Foundations of Club Mixing, and DJ Bootcamp Cohort 6 only |

## Products

Prices are CAD. A new program is a course record: title, blurb, status, price, billing, and where it sits (`banner` or `grid`).

- **Headliner** — the banner. Monthly, price not set (`$X/month`) until `HEADLINER_PRICE_CENTS` is set. Access lasts while the subscription is paid. The path is a track tree: Welcome to JSTDRMN Academy, Introduction to EDM, The Progression Tree, then Branding, DJing, Producing (Beginner and Advanced), and Mashups & Remixes.
- **Programs** — the grid. Foundations of Club Mixing is $50 once. FB2B is a special offering Ash F presents, $50/month, with a placeholder instead of a made-up curriculum. Bootcamps show a status tag and hide the price until `priceCents` is set. Learn More opens that program. Bootcamps apply through the HubSpot link on the record.
- **Headliner perks** — the feedback space (mix or track link, comments) and Join Headliner Discord. Headliner only.

## Stripe, HubSpot, and Discord

Copy `.env.example` into `.env`. Empty `STRIPE_SECRET_KEY` keeps mock checkout. `POST /api/stripe/webhook` grants the same entitlement when a real webhook secret is set.

HubSpot options are in [docs/HUBSPOT.md](docs/HUBSPOT.md). Discord OAuth plus the Headliner role bot are in [docs/DISCORD.md](docs/DISCORD.md). Architecture and open questions are in [docs/PLAN.md](docs/PLAN.md).
