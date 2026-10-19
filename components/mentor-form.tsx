import { saveMentor } from "@/app/actions";
import { unpackMentorList } from "@/lib/mentors";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type MentorRecord = {
  id: string;
  slug: string;
  name: string;
  roleLine: string;
  photoUrl: string | null;
  bio: string;
  background: string;
  specialties: string;
  genres: string;
  active: boolean;
  placeholder: boolean;
  sort: number;
};

export function MentorForm({ mentor }: { mentor: MentorRecord | null }) {
  const lines = (stored: string) => unpackMentorList(stored).join("\n");
  return (
    <form action={saveMentor} className="card stack request-form">
      {mentor ? <input type="hidden" name="id" value={mentor.id} /> : null}
      <div className="field">
        <Label htmlFor="mentor-name">Name</Label>
        <Input id="mentor-name" name="name" required minLength={2} maxLength={80} defaultValue={mentor?.name ?? ""} />
      </div>
      <div className="field">
        <Label htmlFor="mentor-slug">Slug</Label>
        <Input id="mentor-slug" name="slug" maxLength={60} defaultValue={mentor?.slug ?? ""} placeholder="Filled from the name if you leave this blank" />
      </div>
      <div className="field">
        <Label htmlFor="mentor-role">Role line</Label>
        <Input id="mentor-role" name="roleLine" required minLength={2} maxLength={120} defaultValue={mentor?.roleLine ?? ""} />
      </div>
      <div className="field">
        <Label htmlFor="mentor-photo">Photo URL</Label>
        <Input id="mentor-photo" name="photoUrl" type="url" defaultValue={mentor?.photoUrl ?? ""} placeholder="Optional" />
      </div>
      <div className="field">
        <Label htmlFor="mentor-bio">Bio</Label>
        <Textarea id="mentor-bio" name="bio" required minLength={2} maxLength={2000} defaultValue={mentor?.bio ?? ""} />
      </div>
      <div className="field">
        <Label htmlFor="mentor-background">Background</Label>
        <Textarea id="mentor-background" name="background" defaultValue={mentor ? lines(mentor.background) : ""} placeholder="One item per line" />
      </div>
      <div className="field">
        <Label htmlFor="mentor-specialties">Specialties</Label>
        <Textarea id="mentor-specialties" name="specialties" defaultValue={mentor ? lines(mentor.specialties) : ""} placeholder="One item per line" />
      </div>
      <div className="field">
        <Label htmlFor="mentor-genres">Focus genres</Label>
        <Textarea id="mentor-genres" name="genres" defaultValue={mentor ? lines(mentor.genres) : ""} placeholder="One item per line. These are the tags on the card." />
      </div>
      <div className="field">
        <Label htmlFor="mentor-sort">Sort order</Label>
        <Input id="mentor-sort" name="sort" type="number" defaultValue={mentor?.sort ?? 10} />
      </div>
      <label className="check-row">
        <input type="checkbox" name="active" defaultChecked={mentor ? mentor.active : true} />
        Visible on Private Sessions
      </label>
      <label className="check-row">
        <input type="checkbox" name="placeholder" defaultChecked={mentor?.placeholder ?? false} />
        Placeholder (Coming soon, no requests)
      </label>
      <Button type="submit">{mentor ? "Save mentor" : "Add mentor"}</Button>
    </form>
  );
}
