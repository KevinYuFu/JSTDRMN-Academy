import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <h1 className="page-title">That page isn’t on the bill.</h1>
      <p className="note" style={{ margin: "12px 0 18px" }}>The course or cohort you’re looking for isn’t in this academy.</p>
      <Link className="pill pill-purple" href="/">Back to Academy</Link>
    </main>
  );
}
