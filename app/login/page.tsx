import Link from "next/link";
import { login } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { GoogleButton } from "@/components/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

const loginErrors: Record<string, string> = {
  "1": "That email and password don’t match.",
  google_only: "This email uses Google. Continue with Google.",
  google: "Google sign-in did not finish. Try again.",
  google_unconfigured: "Google sign-in is not set up yet.",
  google_unverified: "Google has not confirmed that email.",
  google_conflict: "That email is already linked to a different Google account.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  const next = safeNext(query.next, "");
  const message = query.error ? loginErrors[query.error] : null;
  return (
    <>
      <AppHeader active="dashboard" />
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Log in</h1>
          <p className="note" style={{ marginBottom: 16 }}>
            Use the email on your seat. The first Google sign-in creates the account.
          </p>
          {message ? <div className="error">{message}</div> : null}
          <GoogleButton next={next} />
          <div className="auth-divider">or</div>
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
            <Button type="submit" variant="black">
              Log in with password
            </Button>
          </form>
          <p className="note" style={{ marginTop: 16 }}>
            New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
