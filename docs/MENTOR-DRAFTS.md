# Mentor draft review

Local draft only. These four profiles are not Mentor rows and are not bookable.

## Where the data is

`lib/mentor-drafts.ts` holds the typed list: order, names, bios, Instagram links, and the shared provisional rate `CAD $60 / 1h`. Teaching topics are `specialties`. Genres are `genres`. Those names match the existing Mentor columns, so this draft adds no migration and writes no rows. Portraits are files in `public/mentor-draft-portraits/`. Yuzu’s portrait is the grey studio head-and-shoulders crop from the local review (`photos/yu.jpg` in that handoff).

## Where the view is

`/mentor-drafts` renders that list with the compact card layout (96px portraits, 88px below 420px). Styles are in `components/mentor-draft-review.module.css`. The live Private Sessions cards, `lib/nav.ts`, and `components/app-header.tsx` are unchanged.

## Preview only vs the database

Opening `/mentor-drafts` does not read or write the database. Build, deploy, and `prisma db seed` do not insert these drafts. `/private-sessions` and `/teacher/mentors` still use Mentor rows.

Portrait reuse on the live site is unconfirmed. Do not treat these cards as real offerings until publication is explicitly approved.

## How to review

```bash
npx next dev -H 0.0.0.0 -p 43123
```

Open [http://127.0.0.1:43123/mentor-drafts](http://127.0.0.1:43123/mentor-drafts).

`npm run dev` also starts the app. That command applies committed migrations first. It still does not seed these drafts.
