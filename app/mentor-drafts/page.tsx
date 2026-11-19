import type { Metadata } from "next";
import { MentorDraftReview } from "@/components/mentor-draft-review";

export const metadata: Metadata = {
  title: "Mentor one-on-ones — Draft review",
  description: "Local draft review of mentor profiles. Not published and not bookable.",
  robots: { index: false, follow: false },
};

export default function MentorDraftsPage() {
  return <MentorDraftReview />;
}
