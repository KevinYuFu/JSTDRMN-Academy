-- Insert the program catalog from prisma/seed-data.ts. Insert-only.
-- Skips a row when that id or slug is already present. Existing rows stay as they are.
-- An intro course is also skipped when its plan row (crs_intro_pass) is missing, so the foreign key can be inserted.
-- Lessons and cohorts are not required for the programs pages, so they are not inserted.

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_intro_pass',
    'intro-courses',
    'Intro courses',
    'One subscription for the on-demand intro courses.',
    'One subscription at $20/month includes every intro course.',
    'plan',
    'subscription',
    2000,
    'monthly',
    'Subscription',
    NULL,
    'purple',
    0,
    'plan',
    false,
    NULL,
    'on_demand',
    '',
    NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_pass'
       OR "slug" = 'intro-courses'
);

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_intro_edm',
    'intro-to-edm',
    'Intro to EDM',
    'Placeholder. No description yet.',
    'Placeholder. No description yet.',
    'course',
    'open',
    NULL,
    'monthly',
    'Free',
    NULL,
    'purple',
    10,
    'grid',
    false,
    NULL,
    'on_demand',
    '',
    'crs_intro_pass'
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_edm'
       OR "slug" = 'intro-to-edm'
)
  AND EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_pass'
  );

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_intro_ableton',
    'intro-to-ableton',
    'Intro to Ableton',
    'Placeholder. No description yet.',
    'Placeholder. No description yet.',
    'course',
    'open',
    NULL,
    'monthly',
    'Free',
    NULL,
    'purple',
    11,
    'grid',
    false,
    NULL,
    'on_demand',
    '',
    'crs_intro_pass'
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_ableton'
       OR "slug" = 'intro-to-ableton'
)
  AND EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_pass'
  );

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_intro_sound',
    'intro-to-sound-design',
    'Intro to Sound Design',
    'Placeholder. No description yet.',
    'Placeholder. No description yet.',
    'course',
    'subscription',
    NULL,
    'monthly',
    'Subscription',
    NULL,
    'purple',
    12,
    'grid',
    false,
    NULL,
    'on_demand',
    '',
    'crs_intro_pass'
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_sound'
       OR "slug" = 'intro-to-sound-design'
)
  AND EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_pass'
  );

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_intro_writing',
    'intro-to-songwriting-and-arrangement',
    'Intro to Songwriting and Arrangement',
    'Placeholder. No description yet.',
    'Placeholder. No description yet.',
    'course',
    'subscription',
    NULL,
    'monthly',
    'Subscription',
    NULL,
    'purple',
    13,
    'grid',
    false,
    NULL,
    'on_demand',
    '',
    'crs_intro_pass'
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_writing'
       OR "slug" = 'intro-to-songwriting-and-arrangement'
)
  AND EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_pass'
  );

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_intro_mixing',
    'intro-to-mixing-and-mastering',
    'Intro to Mixing and Mastering',
    'Placeholder. No description yet.',
    'Placeholder. No description yet.',
    'course',
    'subscription',
    NULL,
    'monthly',
    'Subscription',
    NULL,
    'purple',
    14,
    'grid',
    false,
    NULL,
    'on_demand',
    '',
    'crs_intro_pass'
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_mixing'
       OR "slug" = 'intro-to-mixing-and-mastering'
)
  AND EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_pass'
  );

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_intro_av',
    'intro-to-av',
    'Intro to AV',
    'Placeholder. No description yet.',
    'Placeholder. No description yet.',
    'course',
    'subscription',
    NULL,
    'monthly',
    'Subscription',
    NULL,
    'purple',
    15,
    'grid',
    false,
    NULL,
    'on_demand',
    '',
    'crs_intro_pass'
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_av'
       OR "slug" = 'intro-to-av'
)
  AND EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_pass'
  );

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_intro_live_setup',
    'live-setup',
    'Live Setup',
    'Placeholder. No description yet.',
    'Placeholder. No description yet.',
    'course',
    'subscription',
    NULL,
    'monthly',
    'Subscription',
    NULL,
    'purple',
    16,
    'grid',
    false,
    NULL,
    'on_demand',
    '',
    'crs_intro_pass'
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_live_setup'
       OR "slug" = 'live-setup'
)
  AND EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_intro_pass'
  );

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_dj',
    'dj-bootcamp',
    'DJ Bootcamp',
    'Master the decks and take your mixing skills to the next level.',
    'Master the decks and take your mixing skills to the next level! Learn, practice, and unleash your sound with guidance from industry pros. The program has 5 in-person weekly classes (3 hours each) at Lynx Music, and there is also online support during the week. The page lists 4 sessions at Lynx Music, Saturday 1–4 PM, from Sept 19 to Oct 10, a performance on Saturday Oct 31, and a performance review on Saturday Nov 7. The year is not stated on that page. The application deadline on the page is 9/7.',
    'bootcamp',
    'cohort',
    NULL,
    'monthly',
    'Waitlist Open',
    'https://www.jstdrmn.com/dj',
    'decks',
    3,
    'grid',
    false,
    NULL,
    'live',
    'in_person',
    NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_dj'
       OR "slug" = 'dj-bootcamp'
);

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_prod',
    'production-bootcamp',
    'Production Bootcamp',
    'Turn your ideas into tracks that hit! Get hands-on with production tools and techniques to bring your music to life.',
    'In this bootcamp, we will take you from no Ableton experience to completing your first track on Spotify in 5 sessions. 5 in-person sessions at Lynx Music, Sundays 1–4 PM: Apr 5, Apr 12, Apr 19, Apr 26, and May 3. Applications close Sunday, March 29, 2026.',
    'bootcamp',
    'cohort',
    NULL,
    'monthly',
    'Waitlist Open',
    'https://www.jstdrmn.com/prod',
    'studio',
    4,
    'grid',
    false,
    NULL,
    'live',
    'in_person',
    NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_prod'
       OR "slug" = 'production-bootcamp'
);

INSERT INTO "Course" (
    "id",
    "slug",
    "title",
    "tagline",
    "description",
    "kind",
    "access",
    "priceCents",
    "billing",
    "statusLabel",
    "hubspotUrl",
    "panel",
    "sort",
    "placement",
    "special",
    "presenter",
    "delivery",
    "setting",
    "planCourseId"
)
SELECT
    'crs_fb2b',
    'fb2b',
    'FB2B',
    'From Bedroom to Banger',
    'From Bedroom to Banger.',
    'bootcamp',
    'cohort',
    50000,
    'once',
    '',
    NULL,
    'ash',
    5,
    'grid',
    true,
    'Ash F',
    'live',
    '',
    NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM "Course"
    WHERE "id" = 'crs_fb2b'
       OR "slug" = 'fb2b'
);
