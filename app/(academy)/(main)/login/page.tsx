import { Suspense } from "react";
import Link from "next/link";
import { login } from "@/app/actions";
import { Form } from "@/components/form";
import { GoogleButton } from "@/components/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext } from "@/lib/utils";

const loginErrors: Record<string, string> = {
  "1": "That email and password don’t match.",
  google_only: "This email uses Google. Continue with Google.",
  google: "Google sign-in did not finish. Try again.",
  google_unconfigured: "Google sign-in is not set up yet.",
  google_unverified: "Google has not confirmed that email.",
  google_conflict: "That email is already linked to a different Google account.",
};

function LoginForm({ next, message }: { next: string; message: string | null }) {
  return (
    <>
      {message ? <div className="error">{message}</div> : null}
      <GoogleButton next={next} />
      <div className="auth-divider">or</div>
      <Form action={login} className="stack">
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
      </Form>
      <p className="note" style={{ marginTop: 16 }}>
        New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>.
      </p>
    </>
  );
}

async function LoginLive({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  const next = safeNext(query.next, "");
  return <LoginForm next={next} message={query.error ? loginErrors[query.error] ?? null : null} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Log in</h1>
        <p className="note" style={{ marginBottom: 16 }}>
          Use the email on your seat. The first Google sign-in creates the account.
        </p>
        <Suspense fallback={<LoginForm next="" message={null} />}>
          <LoginLive searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
