import Link from "next/link";
import { login } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  const next = safeNext(query.next, "");
  return (
    <>
      <AppHeader active="dashboard" />
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Log in</h1>
          <p className="note" style={{ marginBottom: 16 }}>
            Use the email on your seat. New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>.
          </p>
          {query.error ? <div className="error">That email and password don’t match.</div> : null}
          <form action={login} className="stack">
            <input type="hidden" name="next" value={next} />
            <div className="stack">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="stack">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit">Log in</Button>
          </form>
          <div className="demo">
            <p><strong>Maya</strong> · Headliner · maya@jstdrmn.com / headliner</p>
            <p><strong>Jordan</strong> · Cohort 6 + Foundations · jordan@jstdrmn.com / cohort6</p>
            <p><strong>Yu</strong> · Academy lead · yu@jstdrmn.com / boothlights</p>
          </div>
        </div>
      </div>
    </>
  );
}
