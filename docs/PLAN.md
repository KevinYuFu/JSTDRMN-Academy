# JSTDRMN Academy — plan

A standalone student portal for JSTDRMN (“Just Dreamin’”), the Toronto EDM collective. The public site stays on HubSpot CMS. This app sells and delivers Headliner, single courses, the Ash F add-on, and bootcamp cohort portals.

## Architecture

Next.js (App Router) and TypeScript. SQLite through Prisma, so one process and no hosted database are required for the prototype. Postgres is a connection-string change when this leaves a laptop.

Email and password, session row, httpOnly cookie. Roles are `student`, `teacher`, and `admin`. Teacher and admin see every course and every cohort, edit lessons, read notes, and grant or revoke seats. Students see titles for locked work and can open only what an entitlement allows.

Prices are CAD cents in `lib/config.ts`, overridable with env vars. Headliner stays unset on purpose and renders as `$X/month`.

Video is a switch in `lib/video.ts`: `mock` (the on-page player), `youtube`, `vimeo`, or `file`. Nothing in the player knows about DRM. A later host replaces `resolveVideo`.

Slides are generated one-page PDFs from the lesson notes, served only after the same access check as the video. The “24 slides · 3.2 MB” line on Beatmatching is catalog copy from the mockup. Real file upload is not in this slice.

Stripe Checkout is implemented for one-time payments and monthly subscriptions. With no `STRIPE_SECRET_KEY`, checkout is a local mock that calls the same `fulfillCheckout` function as `POST /api/stripe/webhook`. Canceling a Stripe subscription (`customer.subscription.deleted`) revokes the entitlement whose external id is that subscription.

HubSpot is described in [HUBSPOT.md](./HUBSPOT.md). The module no-ops without a private-app token.

## Data model

- **User** — email, password hash, role.
- **Course** — `access` is `headliner`, `purchase`, `ash_subscription`, or `cohort`. Bootcamps are courses with cohorts.
- **Cohort** — a portal inside a bootcamp. Slugs are global (`cohort-6`) so a webhook can name one.
- **Lesson** — belongs to a course, and to a cohort when the course is a bootcamp. `headliner` marks the membership subset. `drip` hides the lesson until earlier ones are marked complete. `videoProvider` + `videoUrl` are the pluggable source. Slides are a title plus a label.
- **Entitlement** — `headliner` (no course), `course` (one course), `ash` (the Ash course), or `cohort` (one cohort). `active` or `revoked`, optional `endsAt`. Source is `seed`, `mock_checkout`, `stripe`, `admin`, or `hubspot`.
- **Progress** — `in_progress` or `completed` per student per lesson.
- **Comment** — a lesson note, with optional parent for a teacher reply.
- **Checkout** — pending or paid, mock or stripe.
- **PendingGrant** — a seat for an email that has no account yet.
- **HubspotLog** — local trace of syncs and webhooks when a token is set.

## Access rules

Implemented in `lib/entitlements.ts` and covered by `npm test`.

- Staff open everything, including dripped lessons.
- Headliner opens only lessons flagged `headliner` on the tutorial library. It does not open Foundations of Club Mixing, Ash F, or any bootcamp.
- Lessons in that library without the flag stay locked for members. There is no purchase that unlocks them.
- A course purchase opens that course only.
- Ash F is its own monthly entitlement.
- A cohort entitlement opens that cohort’s lessons only. Cohort 6 does not open Cohort 5.
- Revoked and past `endsAt` both deny, and the screen says which. A newer active grant still wins.
- Drip runs only after the student already owns the lesson. Strangers see the buy/apply upsell, not “finish the earlier lessons.”

## Seeded accounts

| Who | Email | Password | Access |
| --- | --- | --- | --- |
| Yu (teacher) | yu@jstdrmn.com | boothlights | Everything |
| Maya Chen | maya@jstdrmn.com | headliner | Headliner tutorials only |
| Jordan Blake | jordan@jstdrmn.com | cohort6 | Foundations of Club Mixing, DJ Bootcamp Cohort 6 |

Content: five tutorial videos (three in Headliner), Foundations of Club Mixing, Ash F’s four-lesson series, DJ Bootcamp Cohorts 5 and 6, plus Production and Mashup bootcamps with no cohort portal yet. Jordan is two lessons into Cohort 6, on Beatmatching. Maya has an unanswered note on gain staging. Yu has already answered Jordan.

## Next steps

1. Set the Headliner price, then a Stripe product in CAD, and point the webhook at `/api/stripe/webhook`.
2. Confirm whether JSTDRMN’s HubSpot seat includes Operations Hub. If not, follow recommendation (b) in HUBSPOT.md: private app, contact upsert, deal stage or `academy_cohort`.
3. Replace generated handouts with uploaded PDFs (object storage, still behind the entitlement check).
4. Swap `resolveVideo` for the real video host when DRM is actually required. Not before.
5. Move SQLite to Postgres. The Prisma schema is already ordinary SQL.
6. Email verification and a password reset. Not required to prove the access model.
7. A “sync HubSpot now” button that pages form submissions or deals, so Yu isn’t waiting on a webhook during the first cohort.

## Open questions

- **Headliner price.** Left as `$X/month` (`HEADLINER_PRICE_CENTS` unset). Which tutorials stay in the subset month to month, and who picks them?
- **Is Headliner the old membership’s whole archive, or a rotating set?** The prototype treats it as a flag on each tutorial. The two unflagged tapes are not for sale.
- **Bootcamp payment.** Does “accepted” mean a HubSpot deal is won, a form is reviewed, or both? The app will not grant from a form submission alone.
- **Cohort 5 and older.** How far back should Yu’s “every past cohort” list go, and should alumni keep access after the cohort ends?
- **Ash F billing.** $50/month is the default. Is that CAD, and does Ash F need a teacher login of their own, or only Yu?
- **Single-course catalog.** Foundations of Club Mixing is the one paid course. Are later courses also $50, or does each course carry its own price?
- **Showcases and Community.** Header links point at jstdrmn.com paths that may not match the live slugs. They should be confirmed before launch.
- **Domain.** This app’s public URL (for Stripe return URLs and HubSpot webhooks) is `APP_URL`, defaulting to localhost.
