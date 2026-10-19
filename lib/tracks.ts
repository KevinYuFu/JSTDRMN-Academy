export type TrackNode = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  position: number;
  parentId: string | null;
  children: TrackNode[];
};

/** Builds the progression tree from parentId. New tracks show up without a change to the renderer. */
export function buildTrackTree(
  tracks: { id: string; slug: string; title: string; blurb: string; position: number; parentId: string | null }[],
): TrackNode[] {
  const nodes = new Map<string, TrackNode>();
  for (const track of tracks) {
    nodes.set(track.id, { ...track, children: [] });
  }
  const roots: TrackNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: TrackNode[]) => {
    list.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
    for (const node of list) sort(node.children);
  };
  sort(roots);
  return roots;
}

export function flattenTracks(nodes: TrackNode[]): TrackNode[] {
  return nodes.flatMap((node) => [node, ...flattenTracks(node.children)]);
}
