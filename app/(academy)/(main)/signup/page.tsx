import { Suspense } from "react";
import Link from "next/link";
import { signup } from "@/app/actions";
import { Form } from "@/components/form";
import { GoogleButton } from "@/components/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext } from "@/lib/utils";

function SignupIntro({ next }: { next: string }) {
  return (
    <p className="note" style={{ marginBottom: 16 }}>
      Use the same email you applied with. A waiting cohort seat unlocks as soon as the account exists. Already in?{" "}
      <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link>.
    </p>
  );
}

function SignupForm({ next, message }: { next: string; message: string | null }) {
  return (
    <>
      {message ? <div className="error">{message}</div> : null}
      <GoogleButton next={next} />
      <div className="auth-divider">or</div>
      <Form action={signup} className="stack">
        <input type="hidden" name="next" value={next} />
        <div className="stack">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="stack">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="stack">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <Button type="submit" variant="black">
          Sign up with password
        </Button>
      </Form>
    </>
  );
}

async function SignupLive({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  const next = safeNext(query.next, "");
  const message =
    query.error === "email"
      ? "That email already has an account. Log in instead."
      : query.error === "form"
        ? "Use your name, a real email, and a password of at least 8 characters."
        : null;
  return (
    <>
      <SignupIntro next={next} />
      <SignupForm next={next} message={message} />
    </>
  );
}

export default function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Create an account</h1>
        <Suspense
          fallback={
            <>
              <SignupIntro next="" />
              <SignupForm next="" message={null} />
            </>
          }
        >
          <SignupLive searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
