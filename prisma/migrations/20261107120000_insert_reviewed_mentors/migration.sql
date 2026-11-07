-- Insert the four reviewed mentor profiles. Insert-only.
-- Skips a row when that id or slug is already present. Existing rows stay as they are.

INSERT INTO "Mentor" (
    "id",
    "slug",
    "name",
    "roleLine",
    "photoUrl",
    "bio",
    "background",
    "specialties",
    "genres",
    "active",
    "placeholder",
    "sort"
)
SELECT
    'mnt_yuzu',
    'yuzu',
    'Yuzu',
    '',
    '/mentor-draft-portraits/yuzu.jpg',
    'DJ, producer, and JSTDRMN Academy instructor.',
    '[]',
    '["Ableton","DJing","production","mixing/mastering"]',
    '["bass music"]',
    true,
    false,
    0
WHERE NOT EXISTS (
    SELECT 1
    FROM "Mentor"
    WHERE "id" = 'mnt_yuzu'
       OR "slug" = 'yuzu'
);

INSERT INTO "Mentor" (
    "id",
    "slug",
    "name",
    "roleLine",
    "photoUrl",
    "bio",
    "background",
    "specialties",
    "genres",
    "active",
    "placeholder",
    "sort"
)
SELECT
    'mnt_odin',
    'odin',
    'ODIN',
    '',
    '/mentor-draft-portraits/odin.jpg',
    'Toronto-based producer releasing flips and remixes as odinsounds, including dubstep tracks.',
    '[]',
    '["Ableton","DJing","production","mixing/mastering"]',
    '["bass music"]',
    true,
    false,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM "Mentor"
    WHERE "id" = 'mnt_odin'
       OR "slug" = 'odin'
);

INSERT INTO "Mentor" (
    "id",
    "slug",
    "name",
    "roleLine",
    "photoUrl",
    "bio",
    "background",
    "specialties",
    "genres",
    "active",
    "placeholder",
    "sort"
)
SELECT
    'mnt_dawner',
    'dawner',
    'DAWNER',
    '',
    '/mentor-draft-portraits/dawner.jpg',
    'Toronto-based producer from St. John’s, Newfoundland, with over a decade of production and recording experience across pop, hip-hop, house, and bass.',
    '[]',
    '["Ableton","DJing","production","mixing/mastering"]',
    '["house","bass music"]',
    true,
    false,
    2
WHERE NOT EXISTS (
    SELECT 1
    FROM "Mentor"
    WHERE "id" = 'mnt_dawner'
       OR "slug" = 'dawner'
);

INSERT INTO "Mentor" (
    "id",
    "slug",
    "name",
    "roleLine",
    "photoUrl",
    "bio",
    "background",
    "specialties",
    "genres",
    "active",
    "placeholder",
    "sort"
)
SELECT
    'mnt_vymvn',
    'vymvn',
    'VYMVN',
    '',
    '/mentor-draft-portraits/vymvn.jpg',
    'Toronto-based electronic artist making lyric-driven dance music, with releases on HEXAGON, ZEROCOOL, 2-Dutch, and NCS.',
    '[]',
    '["Ableton","DJing","production","mixing/mastering"]',
    '["electronic","dance music","house","bass music"]',
    true,
    false,
    3
WHERE NOT EXISTS (
    SELECT 1
    FROM "Mentor"
    WHERE "id" = 'mnt_vymvn'
       OR "slug" = 'vymvn'
);
