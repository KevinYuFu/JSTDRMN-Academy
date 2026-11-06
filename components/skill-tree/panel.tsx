import Link from "next/link";
import type { ReactNode } from "react";

export function SkillPanel({
  title,
  sub,
  foot,
  href,
  accent = false,
  label,
  children,
}: {
  title: string;
  sub?: string;
  foot?: string;
  href?: string;
  accent?: boolean;
  label?: string;
  children?: ReactNode;
}) {
  const className = ["stree-panel", href ? "is-clickable" : "is-static", accent ? "is-accent" : ""]
    .filter(Boolean)
    .join(" ");
  const inner = (
    <span className="stree-panel-inner">
      <span className="stree-panel-copy">
        <span className="stree-title">{title}</span>
        {sub ? <span className="stree-sub">{sub}</span> : null}
        {children}
      </span>
      {foot ? <span className="stree-foot">{foot}</span> : null}
    </span>
  );
  if (href) {
    return (
      <Link href={href} className={className} aria-label={label ?? `Open ${title}`}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
