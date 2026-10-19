import { joinGate, joinHref, type JoinAction } from "@/lib/events";

export function EventJoin({
  action,
  slug,
  linked,
  signedIn,
}: {
  action: JoinAction;
  slug: string;
  linked: boolean;
  signedIn: boolean;
}) {
  if (joinGate(action, linked) === "connect") {
    const href = signedIn ? "/api/discord/connect?next=/events" : "/login?next=/api/discord/connect?next=/events";
    return <a className="pill pill-purple" href={href}>Connect Discord to join</a>;
  }
  const href = joinHref(action, slug);
  if (!href) return <span className="note">No join link yet.</span>;
  const external = href.startsWith("http");
  return (
    <a className="pill pill-purple" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      {action.label}
    </a>
  );
}
