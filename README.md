# JSTDRMN Academy

Student portal for [JSTDRMN](https://www.jstdrmn.com) (“Just Dreamin’”), a Toronto EDM collective. Headliner membership, single-course purchase, the Ash F B2B add-on, and bootcamp cohort portals. The public site stays on HubSpot; this app is the classroom.

No Stripe or HubSpot keys are required. Checkout is mocked and still grants access. HubSpot sync stays quiet until you set a token.

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
| Yu, teacher | yu@jstdrmn.com | boothlights | Every course, both DJ Bootcamp cohorts, lesson editor, grant/revoke, student notes |
| Maya Chen | maya@jstdrmn.com | headliner | Three Headliner tutorials. Everything else shows an upsell |
| Jordan Blake | jordan@jstdrmn.com | cohort6 | Foundations of Club Mixing, and DJ Bootcamp Cohort 6 only |

## Products

Prices are CAD.

- **Headliner** — monthly, price not set (`$X/month`). Unlocks the flagged tutorials only. Set `HEADLINER_PRICE_CENTS` when Yu picks a number.
- **Single course** — $50 once (`COURSE_PRICE_CENTS`). Foundations of Club Mixing.
- **Ash F B2B** — $50/month (`ASH_PRICE_CENTS`). Separate subscription.
- **Bootcamps** — not sold here. “Get Info” goes to the HubSpot page. After acceptance, grant the cohort on the teacher access screen, or via the webhook once a token exists.

## Stripe and HubSpot

Copy `.env.example` notes into `.env`. Empty `STRIPE_SECRET_KEY` keeps mock checkout. `POST /api/stripe/webhook` grants the same entitlement when a real webhook secret is set.

HubSpot options, and why a Private App is the one to build next, are in [docs/HUBSPOT.md](docs/HUBSPOT.md). Architecture, the data model, and open questions (including the Headliner price) are in [docs/PLAN.md](docs/PLAN.md).
