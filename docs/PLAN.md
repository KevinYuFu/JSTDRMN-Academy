# JSTDRMN Academy — plan

A standalone student portal for JSTDRMN (“Just Dreamin’”), the Toronto EDM collective. The public site stays on HubSpot CMS. This app is the classroom: one Headliner subscription, a grid of programs, and bootcamp cohort portals.

Adding a program is a course row. The landing grid, the detail page, checkout, and the grant screen all read that row. No new page or product string.

## Architecture

Next.js (App Router) and TypeScript. Local development uses SQLite through Prisma. Production on Vercel uses hosted Postgres. The build switches the Prisma datasource when `DATABASE_URL` is a `postgres://` or `postgresql://` URL. See the README for the env vars and the one-time database setup.

Email and password, session row, httpOnly cookie. Roles are `student`, `teacher`, and `admin`. Teacher and admin see every course and every cohort, edit lessons, read notes, see Headliner submissions, and grant or revoke seats. Students see titles for locked work and can open only what an entitlement allows.

Headliner’s price is CAD cents in `HEADLINER_PRICE_CENTS`. Leave it unset and the banner shows `$X/month`. Every other program stores `priceCents` on its own row. A null price is hidden. Billing is `monthly`, `once`, or `application`.

Video is a switch in `lib/video.ts`: `drive`, `mock`, `youtube`, `vimeo`, `vimeo_private`, `bunny`, or `file`. Nothing in the player knows about DRM. New lessons default to Google Drive.

Google Drive is the host for now. A lesson URL such as `https://drive.google.com/file/d/<id>/view` is embedded as `https://drive.google.com/file/d/<id>/preview`. Share each file only with the specific student email addresses that should watch it. Do not choose “anyone with the link.” A link-shared file can be opened outside this app by anyone who receives the URL, which skips the entitlement check. The student also has to be signed into that Google account in the browser for the preview to play.

Bunny Stream is the planned upgrade. The `bunny` provider stub stays: it signs `https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}` with SHA256 of the security key, video id, and expiry, and only when `BUNNY_STREAM_LIBRARY_ID` and `BUNNY_STREAM_TOKEN_KEY` are set. Without them the embed URL is unsigned. Unlisted YouTube links are still shareable, so they are not for paid lessons. `vimeo_private` uses the normal player URL; privacy is a Vimeo domain allow-list, not a secret in the query string.

Slides are generated one-page PDFs from the lesson notes, served only after the same access check as the video. The “24 slides · 3.2 MB” line on Beatmatching is catalog copy from the mockup.

Stripe Checkout covers one-time payments and monthly subscriptions. The mode comes from the program’s `billing` field. With no `STRIPE_SECRET_KEY`, checkout is a local mock that calls the same `fulfillCheckout` function as `POST /api/stripe/webhook`. Canceling a Stripe subscription (`customer.subscription.deleted`) revokes the entitlement whose external id is that subscription, and a Headliner revoke asks Discord to drop the role (no-op until the bot env is set).

HubSpot is described in [HUBSPOT.md](./HUBSPOT.md). Discord is described in [DISCORD.md](./DISCORD.md). Both no-op without their env vars.

## Data model

- **User** — email, password hash, role, optional `discordId` after Connect Discord.
- **Course** — a program. `placement` is `banner` (Headliner strip) or `grid` (a card). `access` is `headliner`, `purchase`, `subscription`, or `cohort`. `priceCents` is null when the card should hide a price. `special` marks a card such as FB2B. `presenter` is the person in front of the title (“Ash F presents FB2B”). `hubspotUrl` is the apply link for bootcamps. `statusLabel` is the tag on the card.
- **Track** — a node in a program’s curriculum. `parentId` makes the progression tree. Lessons point at a track. A new branch is a new track row.
- **Cohort** — a portal inside a bootcamp. Slugs are global (`cohort-6`) so a webhook can name one.
- **Lesson** — belongs to a course, optionally a cohort and a track. `headliner` marks the membership subset. `drip` hides the lesson until earlier ones are marked complete. `videoProvider` + `videoUrl` are the pluggable source.
- **Entitlement** — `headliner` (the membership), `program` (one course, whether it was a one-time purchase or a subscription), or `cohort` (one cohort). `active` or `revoked`, optional `endsAt`. Older rows stored as `course` or `ash` are read as `program`.
- **Submission** — a Headliner mix or track: title, http(s) URL, kind (`mix` or `track`), notes. **SubmissionComment** is a note on that post.
- **Progress** — `in_progress` or `completed` per student per lesson.
- **Comment** — a lesson note, with optional parent for a teacher reply.
- **Checkout** — pending or paid, mock or stripe.
- **PendingGrant** — a seat for an email that has no account yet.
- **HubspotLog** — local trace of syncs and webhooks when a token is set.

## Access rules

Implemented in `lib/entitlements.ts` and covered by `npm test`.

- Staff open everything, including dripped lessons, the feedback space, and the Discord card.
- Headliner opens only lessons flagged `headliner` on the Headliner program. It does not open Foundations of Club Mixing, FB2B, or any bootcamp.
- Lessons on that program without the flag stay locked for members.
- A program entitlement opens that course only. A purchase and a subscription use the same `program` product plus `courseId`, so a new paid program does not need a new product name.
- A cohort entitlement opens that cohort’s lessons only. Cohort 6 does not open Cohort 5.
- The feedback space and the Join Headliner Discord card use `headlinerPerk`. An active Headliner entitlement or a staff role. A program purchase or a cohort seat does not open them. Expired and revoked both deny.
- Revoked and past `endsAt` both deny. A newer active grant still wins.
- Drip runs only after the student already owns the lesson.

## Seeded accounts

| Who | Email | Password | Access |
| --- | --- | --- | --- |
| Yu (teacher) | yu@jstdrmn.com | boothlights | Everything, including the feedback space |
| Maya Chen | maya@jstdrmn.com | headliner | Headliner path, Discord card, feedback space |
| Jordan Blake | jordan@jstdrmn.com | cohort6 | Foundations of Club Mixing, and DJ Bootcamp Cohort 6 only |

Headliner tracks: Welcome to JSTDRMN Academy, Introduction to EDM, The Progression Tree, then Branding, DJing, Producing (Beginner Production and Advanced Production), and Mashups & Remixes. Each track has a mock video. FB2B is Ash F’s special offering at $50/month CAD, with a placeholder and no invented lessons. DJ Bootcamp Cohorts 5 and 6 are unchanged. Jordan is two lessons into Cohort 6, on Beatmatching. Maya has an unanswered note on Introduction to EDM and a mix in the feedback space. Yu has answered Jordan and commented on Maya’s mix.

## Next steps

1. Set the Headliner price, then a Stripe price in CAD, and point the webhook at `/api/stripe/webhook`.
2. Put real prices on bootcamp rows when they should show on the card. Leave `priceCents` null to keep the price hidden.
3. Confirm whether JSTDRMN’s HubSpot seat includes Operations Hub. If not, follow recommendation (b) in HUBSPOT.md.
4. Connect Discord the way [DISCORD.md](./DISCORD.md) describes: OAuth plus a bot that adds and removes the Headliner role.
5. Keep Drive files shared to student emails only. Move paid video to Bunny Stream when that account is ready. The provider stub is already in `lib/video.ts`.
6. Replace generated handouts with uploaded PDFs.
7. Deploy on Vercel with hosted Postgres. The README has the env vars and the database steps.

## Open questions

- **Headliner price.** Left as `$X/month` (`HEADLINER_PRICE_CENTS` unset).
- **Which Headliner lessons stay flagged?** The flag is per lesson. The seeded path is all inside the membership.
- **Bootcamp payment.** Does “accepted” mean a HubSpot deal is won, a form is reviewed, or both? The app will not grant from a form submission alone.
- **Cohort 5 and older.** How far back should Yu’s list go, and should alumni keep access after the cohort ends?
- **FB2B.** $50/month CAD is on the program row. Lessons are not written yet. Does Ash F need a teacher login, or only Yu?
- **Bootcamp card prices.** Each bootcamp can carry its own `priceCents`. They are hidden until set.
- **Domain.** This app’s public URL (Stripe return URLs, HubSpot, Discord redirect) is `APP_URL`, defaulting to localhost.
