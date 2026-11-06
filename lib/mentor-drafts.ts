/**
 * Local draft mentor profiles for review.
 *
 * This is the repo copy of a standalone HTML review that previously lived
 * only on one machine. Edit this list to change the draft. It is the baseline
 * that can be merged or rolled back.
 *
 * These records are not Mentor rows. Importing this module does not read or
 * write the database, and the seed does not load it. Do not publish these
 * profiles as bookable offerings until that is explicitly approved.
 *
 * `specialties` and `genres` use the same names as the Mentor columns. Teaching
 * topics are specialties. Genres stay in genres. No new column is required.
 *
 * Portrait files under public/mentor-draft-portraits/ are for this review.
 * The Yuzu file was photos/yu.jpg in the local handoff; the served name matches
 * the public name. Permission to reuse the portraits on the live site is unconfirmed.
 */

export const MENTOR_DRAFT_RATE_LABEL = "CAD $60 / 1h";

export const MENTOR_DRAFT_PUBLICATION = {
  status: "draft",
  writesDatabase: false,
  bookable: false,
  portraitLiveReuse: "unconfirmed",
} as const;

/** Teaching topics. Same list the Mentor editor stores in `specialties`. */
const teachingTopics = ["Ableton", "DJing", "production", "mixing/mastering"] as const;

export type MentorDraft = {
  slug: string;
  name: string;
  bio: string;
  /** Maps to Mentor.specialties. Shown as Teaching topics. */
  specialties: readonly string[];
  /** Maps to Mentor.genres. Shown as Genres. */
  genres: readonly string[];
  instagramUrl: string;
  instagramLabel: string;
  portraitSrc: string;
  portraitAlt: string;
};

export const MENTOR_DRAFTS: readonly MentorDraft[] = [
  {
    slug: "yuzu",
    name: "Yuzu",
    bio: "DJ, producer, and JSTDRMN Academy instructor.",
    specialties: [...teachingTopics],
    genres: ["bass music"],
    instagramUrl: "https://www.instagram.com/yuzubops_official/",
    instagramLabel: "instagram.com/yuzubops_official",
    portraitSrc: "/mentor-draft-portraits/yuzu.jpg",
    portraitAlt: "Yuzu",
  },
  {
    slug: "odin",
    name: "ODIN",
    bio: "Toronto-based producer releasing flips and remixes as odinsounds, including dubstep tracks.",
    specialties: [...teachingTopics],
    genres: ["bass music"],
    instagramUrl: "https://www.instagram.com/odinsounds/",
    instagramLabel: "instagram.com/odinsounds",
    portraitSrc: "/mentor-draft-portraits/odin.jpg",
    portraitAlt: "ODIN",
  },
  {
    slug: "dawner",
    name: "DAWNER",
    bio: "Toronto-based producer from St. John’s, Newfoundland, with over a decade of production and recording experience across pop, hip-hop, house, and bass.",
    specialties: [...teachingTopics],
    genres: ["house", "bass music"],
    instagramUrl: "https://www.instagram.com/dawner.ca/",
    instagramLabel: "instagram.com/dawner.ca",
    portraitSrc: "/mentor-draft-portraits/dawner.jpg",
    portraitAlt: "DAWNER",
  },
  {
    slug: "vymvn",
    name: "VYMVN",
    bio: "Toronto-based electronic artist making lyric-driven dance music, with releases on HEXAGON, ZEROCOOL, 2-Dutch, and NCS.",
    specialties: [...teachingTopics],
    genres: ["electronic", "dance music", "house", "bass music"],
    instagramUrl: "https://www.instagram.com/vymvn/",
    instagramLabel: "instagram.com/vymvn",
    portraitSrc: "/mentor-draft-portraits/vymvn.jpg",
    portraitAlt: "VYMVN",
  },
];

