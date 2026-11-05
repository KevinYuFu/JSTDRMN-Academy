import Link from "next/link";
import { Space_Mono, Unbounded } from "next/font/google";
import type { ReactNode } from "react";
import { parentHref, skillTreeHref, skillTreeNav, type SkillTreeStep } from "@/lib/skill-tree";
import { SkillTreeHotkeys } from "./hotkeys";
import "./skill-tree.css";

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-stree-mono",
});

const display = Unbounded({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-stree-display",
});

function Breadcrumb({ stack }: { stack: SkillTreeStep[] }) {
  const back = parentHref(stack);
  return (
    <nav className="stree-crumb" aria-label="Breadcrumb">
      {back ? (
        <Link href={back} className="stree-back">
          ← Back
        </Link>
      ) : null}
      <ol>
        {stack.map((step, index) => {
          const last = index === stack.length - 1;
          return (
            <li key={`${step.view}-${step.payload ?? "root"}-${index}`}>
              {index > 0 ? (
                <span className="stree-sep" aria-hidden="true">
                  /
                </span>
              ) : null}
              {last ? (
                <span className="stree-here" aria-current="page">
                  {step.name}
                </span>
              ) : (
                <Link href={skillTreeHref(stack.slice(0, index + 1))}>{step.name}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SkillTreeShell({ stack, children }: { stack: SkillTreeStep[]; children: ReactNode }) {
  return (
    <div className={`${mono.variable} ${display.variable} stree`}>
      <div className="stree-field" aria-hidden="true" />
      <div className="stree-vignette" aria-hidden="true" />
      <div className="stree-frame" aria-hidden="true">
        <span className="stree-bracket tl" />
        <span className="stree-bracket tr" />
        <span className="stree-bracket bl" />
        <span className="stree-bracket br" />
      </div>
      <div className="stree-app">
        <header className="stree-topbar">
          <p className="stree-brand">JSTDRMN Academy</p>
          <p className="stree-who">{skillTreeNav.label}</p>
        </header>
        <Breadcrumb stack={stack} />
        <SkillTreeHotkeys backHref={parentHref(stack)} />
        <main className="stree-stage">{children}</main>
      </div>
    </div>
  );
}
