import Link from "next/link";
import { buildTrackTree, type TrackNode } from "@/lib/tracks";

function Node({ node, href }: { node: TrackNode; href: string | null }) {
  const body = (
    <>
      <b>{node.title}</b>
      <span>{node.blurb}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="tree-node">
        {body}
      </Link>
    );
  }
  return <div className="tree-node">{body}</div>;
}

function Branches({
  nodes,
  lessonHref,
}: {
  nodes: TrackNode[];
  lessonHref: (trackId: string) => string | null;
}) {
  if (nodes.length === 0) return null;
  const spread = nodes.length >= 3;
  return (
    <ul className={spread ? "tree-children spread" : "tree-children"}>
      {nodes.map((node) => (
        <li key={node.id} className="tree-item">
          <Node node={node} href={lessonHref(node.id)} />
          <Branches nodes={node.children} lessonHref={lessonHref} />
        </li>
      ))}
    </ul>
  );
}

export function ProgressionTree({
  tracks,
  lessonHref,
}: {
  tracks: { id: string; slug: string; title: string; blurb: string; position: number; parentId: string | null }[];
  lessonHref: (trackId: string) => string | null;
}) {
  const roots = buildTrackTree(tracks);
  if (roots.length === 0) {
    return <p className="note">No tracks yet. Add a track record and it shows up on this tree.</p>;
  }
  return (
    <div className="tree" aria-label="Progression tree">
      <ul className="tree-roots">
        {roots.map((node) => (
          <li key={node.id} className="tree-item">
            <Node node={node} href={lessonHref(node.id)} />
            <Branches nodes={node.children} lessonHref={lessonHref} />
          </li>
        ))}
      </ul>
    </div>
  );
}
