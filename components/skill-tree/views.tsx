import type { CSSProperties, ReactNode } from "react";
import {
  cardsFor,
  childById,
  countLabel,
  drillHref,
  panelItems,
  skillTree,
  type SkillBlock,
  type SkillCard,
  type SkillCardsBlock,
  type SkillChipBlock,
  type SkillGroupBlock,
  type SkillNode,
  type SkillNoteBlock,
  type SkillPanelBlock,
} from "@/lib/skill-tree";
import { SkillPanel } from "./panel";

function widthClass(width?: "narrow" | "core" | "hub") {
  if (width === "narrow") return "stree-narrow";
  if (width === "core") return "stree-core";
  if (width === "hub") return "stree-hub-width";
  return "";
}

function Bob({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="stree-bob" style={{ "--i": index } as CSSProperties}>
      {children}
    </div>
  );
}

function face(node: SkillNode, place: "map" | "card"): SkillCard {
  if (place === "map" && node.map) return { ...node.card, ...node.map };
  return node.card;
}

function Card({
  node,
  stack,
  place = "card",
  sub,
  foot,
  index,
}: {
  node: SkillNode;
  stack: readonly SkillNode[];
  place?: "map" | "card";
  sub?: string;
  foot?: string;
  index?: number;
}) {
  const card = face(node, place);
  const panel = (
    <SkillPanel
      title={card.title}
      sub={sub ?? card.sub}
      foot={foot ?? card.foot}
      href={drillHref(stack, node)}
      accent={card.accent}
      label={card.label}
    />
  );
  return index == null ? panel : <Bob index={index}>{panel}</Bob>;
}

function Flow({ node, stack, place }: { node: SkillNode; stack: readonly SkillNode[]; place: "map" | "hub" }) {
  const flow = node.mapFlow;
  if (!flow) return null;
  const left = childById(node, flow.left);
  const right = childById(node, flow.right);
  const hang = flow.hang ? childById(node, flow.hang) : undefined;
  if (!left || !right) return null;
  if (place === "hub") {
    return (
      <div className="stree-dj-hub">
        <Card node={left} stack={stack} />
        <div className="stree-hub-mashup">
          <Card node={right} stack={stack} />
          {hang ? (
            <>
              <div className="stree-flow-stem" aria-hidden="true" />
              <Card node={hang} stack={stack} />
            </>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div className="stree-dj-local" aria-label="DJ course flowchart">
      <div className="stree-dj-stem" aria-hidden="true" />
      <div className="stree-dj-rail" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="stree-dj-pair">
        <Card node={left} stack={stack} place="map" index={4} />
        <div className="stree-mashup-stack">
          <Card node={right} stack={stack} place="map" index={5} />
          {hang ? (
            <>
              <div className="stree-prod-stem" aria-hidden="true" />
              <div className="stree-prod">
                <Card node={hang} stack={stack} place="map" index={6} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PanelBlock({ block }: { block: SkillPanelBlock }) {
  return (
    <SkillPanel title={block.title} sub={block.sub} foot={block.foot} accent={block.accent}>
      {block.items ? (
        <ul className="stree-details">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </SkillPanel>
  );
}

function NoteBlock({ block }: { block: SkillNoteBlock }) {
  return (
    <div className="stree-note">
      <strong>{block.strong}</strong> {block.text}
    </div>
  );
}

function ChipBlock({ block }: { block: SkillChipBlock }) {
  return (
    <div className={widthClass(block.width)}>
      <SkillPanel title={block.title} sub={block.sub} foot={block.foot} accent={block.accent}>
        <div className="stree-chips">
          {block.chips.map((chip) => (
            <span key={chip.label} className={chip.hot ? "stree-chip is-hot" : "stree-chip"}>
              {chip.label}
            </span>
          ))}
        </div>
      </SkillPanel>
    </div>
  );
}

function CardsBlock({ node, stack, block }: { node: SkillNode; stack: readonly SkillNode[]; block: SkillCardsBlock }) {
  const cards = cardsFor(node, block);
  const listClass = block.layout === "grid" ? "stree-grid-cats" : block.layout === "grid-3" ? "stree-grid-3" : "stree-stack";
  return (
    <div className={["stree-lane", widthClass(block.width)].filter(Boolean).join(" ")}>
      {block.label ? <p className="stree-lane-label">{block.label}</p> : null}
      <div className={listClass}>
        {cards.map((child) => {
          const count = block.count ? panelItems(child).length : undefined;
          return (
            <Card
              key={child.id}
              node={child}
              stack={stack}
              sub={block.count ? countLabel(block.count, count ?? 0) : undefined}
              foot={block.foot}
            />
          );
        })}
      </div>
    </div>
  );
}

function GroupBlock({ node, stack, block }: { node: SkillNode; stack: readonly SkillNode[]; block: SkillGroupBlock }) {
  const className = [block.label ? "stree-lane" : "stree-stack", widthClass(block.width)].filter(Boolean).join(" ");
  return (
    <div className={className}>
      {block.label ? <p className="stree-lane-label">{block.label}</p> : null}
      {block.sections.map((section, index) => (
        <Block key={`${section.type}-${index}`} node={node} stack={stack} block={section} />
      ))}
    </div>
  );
}

function Block({ node, stack, block }: { node: SkillNode; stack: readonly SkillNode[]; block: SkillBlock }) {
  switch (block.type) {
    case "panel":
      return <PanelBlock block={block} />;
    case "note":
      return <NoteBlock block={block} />;
    case "chips":
      return <ChipBlock block={block} />;
    case "cards":
      return <CardsBlock node={node} stack={stack} block={block} />;
    case "flow":
      return <Flow node={node} stack={stack} place="hub" />;
    case "group":
      return <GroupBlock node={node} stack={stack} block={block} />;
    default: {
      const unused: never = block;
      return unused;
    }
  }
}

function Overview({ stack }: { stack: readonly SkillNode[] }) {
  return (
    <section className="stree-view" aria-label="Academy overview">
      <div className="stree-tree">
        <div className="stree-root-wrap">
          <h1 className="stree-root-heading">{skillTree.card.title}</h1>
        </div>
        <div className="stree-stem" aria-hidden="true" />
        <div className="stree-rail" aria-hidden="true">
          {skillTree.children.map((branch) => (
            <span key={branch.id} />
          ))}
        </div>
        <div className="stree-primary">
          {skillTree.children.map((branch, index) => (
            <div key={branch.id} className={branch.mapFlow ? "stree-col stree-col-dj" : "stree-col"}>
              <Card node={branch} stack={stack} place="map" index={index} />
              {branch.mapFlow ? <Flow node={branch} stack={stack} place="map" /> : null}
            </div>
          ))}
        </div>
      </div>
      {skillTree.hint ? <p className="stree-hint">{skillTree.hint}</p> : null}
    </section>
  );
}

function Detail({ node, stack }: { node: SkillNode; stack: readonly SkillNode[] }) {
  const page = node.page;
  if (!page) return <Overview stack={stack} />;
  return (
    <section className="stree-view" aria-label={page.title}>
      <div className="stree-section-head">
        {page.eyebrow ? <p className="stree-eyebrow">{page.eyebrow}</p> : null}
        <h1>{page.title}</h1>
        {page.blurb ? <p>{page.blurb}</p> : null}
      </div>
      {page.sections.map((section, index) => (
        <Block key={`${section.type}-${index}`} node={node} stack={stack} block={section} />
      ))}
    </section>
  );
}

export function SkillTreeView({ stack }: { stack: readonly SkillNode[] }) {
  const node = stack[stack.length - 1] ?? skillTree;
  if (node.id === skillTree.id) return <Overview stack={stack} />;
  return <Detail node={node} stack={stack} />;
}
