# JSTDRMN Academy — plan

A standalone website for JSTDRMN Academy (“Just Dreamin’”), the Toronto EDM collective. The marketing site stays on HubSpot CMS. This app does not reuse that site’s menu (About, Community, Showcases, Label, Management). The academy menu is Programs, Private Sessions, Events, Dashboard, and My Courses, plus the logo and log in / sign up or the avatar. Another menu item is another entry in `lib/nav.ts`.

The Academy lead view is the CRM for the site; HubSpot stays for marketing leads and applications.

The classroom is one Headliner subscription, a grid of group and self-paced programs, bootcamp cohort portals, and a Private Sessions roster.

Adding a program is a course row. The landing grid, the detail page, checkout, and the grant screen all read that row. No new page or product string. Private Sessions is a mentor roster, not a program card.

## Architecture

Next.js (App Router) and TypeScript. The database is Postgres. On Vercel that is Neon. The app connects with `DATABASE_URL` (pooled). Migrations connect with `DATABASE_URL_UNPOOLED` (direct). Every Vercel build runs `prisma migrate deploy`. The seed does not run on deploy. See the README.

Email and password, session row, httpOnly cookie. Roles are `student`, `teacher`, and `admin`. The Academy lead (teacher or admin) sees every course and cohort, edits lessons, manages mentors, events, and the announcement queue, reads session requests, and grants or revokes seats. Students see Discord link status on My Courses. Students see titles for locked work and can open only what an entitlement allows.

Headliner’s price is CAD cents in `HEADLINER_PRICE_CENTS`. Leave it unset and the banner shows `$X/month`. Every other program stores `priceCents` on its own row. A null price is hidden. Billing is `monthly`, `once`, `application`, or `request`.

Video is a switch in `lib/video.ts`: `drive`, `mock`, `youtube`, `vimeo`, `vimeo_private`, `bunny`, or `file`. Nothing in the player knows about DRM. New lessons default to Google Drive.

Google Drive is the host for now. A lesson URL such as `https://drive.google.com/file/d/<id>/view` is embedded as `https://drive.google.com/file/d/<id>/preview`. Share each file only with the specific student email addresses that should watch it. Do not choose “anyone with the link.” A link-shared file can be opened outside this app by anyone who receives the URL, which skips the entitlement check. The student also has to be signed into that Google account in the browser for the preview to play.

Bunny Stream is the planned upgrade. The `bunny` provider stub stays: it signs `https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}` with SHA256 of the security key, video id, and expiry, and only when `BUNNY_STREAM_LIBRARY_ID` and `BUNNY_STREAM_TOKEN_KEY` are set. Without them the embed URL is unsigned. Unlisted YouTube links are still shareable, so they are not for paid lessons. `vimeo_private` uses the normal player URL; privacy is a Vimeo domain allow-list, not a secret in the query string.

Slides are generated one-page PDFs from the lesson notes. A student who can open the lesson clicks the slides card. The PDF fills an in-page viewer. Escape or the X closes it. `GET /api/slides/[lessonId]` uses the same access check as the video and returns `Content-Disposition: inline`. There is no download button and no attachment response. The “24 slides · 3.2 MB” line on Beatmatching is catalog copy from the mockup.

Stripe Checkout covers one-time payments and monthly subscriptions. The mode comes from the program’s `billing` field. With no `STRIPE_SECRET_KEY`, checkout is a local mock that calls the same `fulfillCheckout` function as `POST /api/stripe/webhook`. Canceling a Stripe subscription (`customer.subscription.deleted`) revokes the entitlement whose external id is that subscription, and a Headliner revoke asks Discord to drop the role (no-op until the bot env is set).

HubSpot is described in [HUBSPOT.md](./HUBSPOT.md). Discord is described in [DISCORD.md](./DISCORD.md). Both no-op without their env vars.

## Data model

- **User** — email, password hash, role, optional `discordId` and `discordUsername` after Connect Discord.
- **Course** — a program. `placement` is `banner` (Headliner strip) or `grid` (a card). `access` is `headliner`, `purchase`, `subscription`, `cohort`, or `request`. `priceCents` is null when the card should hide a price. `special` marks a card such as FB2B. `presenter` is the person in front of the title (“Ash F presents FB2B”). `hubspotUrl` is the apply link for bootcamps. `statusLabel` is the tag on the card. `billing` is `monthly`, `once`, `application`, or `request`.
- **Track** — a node in a program’s curriculum. `parentId` makes the progression tree. Lessons point at a track. A new branch is a new track row.
- **Cohort** — a portal inside a bootcamp. Slugs are global (`cohort-6`) so a webhook can name one.
- **Lesson** — belongs to a course, optionally a cohort and a track. `headliner` marks the membership subset. `drip` hides the lesson until earlier ones are marked complete. `videoProvider` + `videoUrl` are the pluggable source.
- **Entitlement** — `headliner` (the membership), `program` (one course, whether it was a one-time purchase or a subscription), or `cohort` (one cohort). `active` or `revoked`, optional `endsAt`. Older rows stored as `course` or `ash` are read as `program`.
- **Mentor** — a Private Sessions profile: name, slug, role line, optional photo URL, bio, background, specialties, genres, `active`, `placeholder`, and sort. Hidden mentors stay in the database with `active` false. Placeholders show on the grid as Coming soon and do not take requests.
- **SessionRequest** — a private-session request: name, email, topic, preferred times, and the chosen mentor. The Academy lead sees the latest ones. Nothing is booked or charged.
- **EventType** — Community Connect, Green Room, Sync, and Production Feedback in the seed. Each type has a default join action: `link` or `calendar`, a URL, and a button label. A link can be Discord, Zoom, Instagram, or any other page. Calendar uses a Google Calendar link, or an `.ics` download when the URL is blank. New types are more rows, not a code change.
- **Event** — title, type, description, start and end in America/Toronto, weekly or one-off, audience (`all`, `headliners`, `cohort`, `producers`), and optional overrides of the type’s join action. Connect Discord is required only when that destination is a Discord URL.
- **Announcement** — a queued Discord message: body, channel id, optional role mention, send time, or “minutes before” an event. Status is `scheduled`, `sent`, or `failed`. `GET /api/cron/announcements` posts due rows, or logs them when `DISCORD_BOT_TOKEN` is unset.
- **Progress** — `in_progress` or `completed` per student per lesson.
- **Comment** — a lesson note, with optional parent for a teacher reply.
- **Checkout** — pending or paid, mock or stripe.
- **PendingGrant** — a seat for an email that has no account yet.
- **HubspotLog** — local trace of syncs and webhooks when a token is set.

## Access rules

Implemented in `lib/entitlements.ts` and covered by `npm test`.

- Staff open everything, including dripped lessons and the Discord card.
- Headliner opens only lessons flagged `headliner` on the Headliner program. It does not open Foundations of Club Mixing, FB2B, or any bootcamp.
- Lessons on that program without the flag stay locked for members.
- A program entitlement opens that course only. A purchase and a subscription use the same `program` product plus `courseId`, so a new paid program does not need a new product name.
- A cohort entitlement opens that cohort’s lessons only. Cohort 6 does not open Cohort 5.
- The Join Headliner Discord card uses `headlinerPerk`. An active Headliner entitlement or a staff role. A program purchase or a cohort seat does not open it. Expired and revoked both deny.
- Revoked and past `endsAt` both deny. A newer active grant still wins.
- Drip runs only after the student already owns the lesson.

## Seed

Run once with `npx prisma db seed`. The steps are in the README. The seed upserts rows. It does not delete students or other courses.

- DJ Bootcamp, Cohort 5, Cohort 6, and the placeholder lessons from the mock curriculum
- Yu at `yu@jstdrmn.com`, role `teacher` (staff, same access as `admin`). The password is `SEED_ADMIN_PASSWORD`. It is not stored in the repo
- Sample events: Community Connect, Green Room, Sync, and Production Feedback

Headliner, the other programs, mentors, and student logins are not part of this seed. Add those in the teacher view.

## Next steps

1. Set the Headliner price, then a Stripe price in CAD, and point the webhook at `/api/stripe/webhook`.
2. Put real prices on bootcamp rows when they should show on the card. Leave `priceCents` null to keep the price hidden.
3. Confirm whether JSTDRMN’s HubSpot seat includes Operations Hub. If not, follow recommendation (b) in HUBSPOT.md.
4. Connect Discord the way [DISCORD.md](./DISCORD.md) describes: OAuth plus a bot that adds and removes the Headliner role.
5. Keep Drive files shared to student emails only. Move paid video to Bunny Stream when that account is ready. The provider stub is already in `lib/video.ts`.
6. Replace generated handouts with uploaded PDFs.
7. Deploy on Vercel with hosted Postgres. The README has the env vars and the database steps.
8. Private sessions are a request form on a mentor profile. Later: booking (a student picks a time and that mentor confirms) and payment. Do not add a calendar or a charge until that work starts.

## Open questions

- **Headliner price.** Left as `$X/month` (`HEADLINER_PRICE_CENTS` unset).
- **Which Headliner lessons stay flagged?** The flag is per lesson. The seeded path is all inside the membership.
- **Bootcamp payment.** Does “accepted” mean a HubSpot deal is won, a form is reviewed, or both? The app will not grant from a form submission alone.
- **Cohort 5 and older.** How far back should Yu’s list go, and should alumni keep access after the cohort ends?
- **FB2B.** $50/month CAD is on the program row. Lessons are not written yet. Does Ash F need a teacher login, or only Yu?
- **Bootcamp card prices.** Each bootcamp can carry its own `priceCents`. They are hidden until set.
- **Domain.** This app’s public URL (Stripe return URLs, HubSpot, Discord redirect) is `APP_URL`, defaulting to localhost.
