import Link from "next/link";
import type { ReactNode } from "react";
import { SkillCopyLine } from "./copy-context";

export function SkillPanel({
  title,
  sub,
  foot,
  href,
  accent = false,
  label,
  copyKey,
  lockSub = false,
  lockFoot = false,
  children,
}: {
  title: string;
  sub?: string;
  foot?: string;
  href?: string;
  accent?: boolean;
  label?: string;
  copyKey?: string;
  lockSub?: boolean;
  lockFoot?: boolean;
  children?: ReactNode;
}) {
  const className = ["stree-panel", href ? "is-clickable" : "is-static", accent ? "is-accent" : ""]
    .filter(Boolean)
    .join(" ");
  const inner = (
    <span className="stree-panel-inner">
      <span className="stree-panel-copy">
        <span className="stree-title">
          {copyKey ? <SkillCopyLine path={`${copyKey}:title`} text={title} label="Title" /> : title}
        </span>
        {sub ? (
          <span className="stree-sub">
            {copyKey && !lockSub ? <SkillCopyLine path={`${copyKey}:sub`} text={sub} label="Subtitle" /> : sub}
          </span>
        ) : null}
        {children}
      </span>
      {foot ? (
        <span className="stree-foot">
          {copyKey && !lockFoot ? <SkillCopyLine path={`${copyKey}:foot`} text={foot} label="Foot" /> : foot}
        </span>
      ) : null}
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
