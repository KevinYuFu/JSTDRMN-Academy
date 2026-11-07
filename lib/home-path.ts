import { childById, drillHref, skillTreeNav, type SkillNode } from "./skill-tree";

export type HomePathStep = {
  id: string;
  title: string;
  detail: string | null;
  href: string;
  /** True when the live map still marks the name as a working title. */
  tentative: boolean;
};

export type HomePathPreview = {
  overviewHref: string;
  branches: HomePathStep[];
  /** The one sequenced path on the overview, when the map defines one. */
  flow: { id: string; label: string; steps: HomePathStep[] } | null;
};

function isTentative(detail: string | undefined) {
  return (detail ?? "").toLowerCase().includes("working title");
}

function step(node: SkillNode, href: string): HomePathStep {
  return {
    id: node.id,
    title: node.card.title,
    detail: node.card.sub ?? null,
    href,
    tentative: isTentative(node.card.sub),
  };
}

/**
 * A small read of the live Skill Tree for the homepage.
 * Titles and links come from the tree. Nothing is added.
 */
export function homePathPreview(tree: SkillNode): HomePathPreview {
  const branches = tree.children.map((node) => step(node, drillHref([tree], node)));
  const flowNode = tree.children.find((node) => node.mapFlow);
  const flowIds = flowNode?.mapFlow
    ? [flowNode.mapFlow.left, flowNode.mapFlow.right, flowNode.mapFlow.hang].filter((id): id is string => Boolean(id))
    : [];
  const steps = flowNode
    ? flowIds.flatMap((id) => {
        const node = childById(flowNode, id);
        return node ? [step(node, drillHref([tree, flowNode], node))] : [];
      })
    : [];

  return {
    overviewHref: skillTreeNav.href,
    branches,
    flow: flowNode && steps.length >= 2 ? { id: flowNode.id, label: flowNode.card.title, steps } : null,
  };
}
