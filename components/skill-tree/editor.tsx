import Link from "next/link";
import { addSkillChild, moveSkillNode, removeSkillNode, reorderSkillNode, saveSkillNode } from "@/app/skill-tree-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { findNode, skillTreeHref, stackForNode, type SkillNode } from "@/lib/skill-tree";
import { findParent, nodeCount, parentOptions, treeList } from "@/lib/skill-tree-edit";

const selectClass = "h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4";

export function SkillTreeEditor({ tree, selectedId }: { tree: SkillNode; selectedId: string }) {
  const selected = findNode(selectedId, tree) ?? tree;
  const root = selected.id === tree.id;
  const rows = treeList(tree);
  const options = parentOptions(tree, selected.id);
  const parentId = findParent(tree, selected.id)?.id ?? "";
  const canMove = options.some((option) => option.id !== parentId);
  const stack = stackForNode(tree, selected.id);
  const publicHref = stack ? skillTreeHref(stack) : "/skill-tree";
  const under = nodeCount(selected) - 1;

  return (
    <div className="split">
      <section className="card" style={{ padding: "8px 16px 16px" }}>
        <h2 className="section-label">Tree</h2>
        <p className="note">Pick a node. Up and Down change the order under the same parent.</p>
        <ul className="tree-list tree-scroll">
          {rows.map((row) => (
            <li key={row.id} className={row.id === selected.id ? "tree-row is-selected" : "tree-row"} style={{ paddingLeft: 12 + row.depth * 16 }}>
              <Link href={`/teacher/skill-tree?node=${row.id}`} aria-current={row.id === selected.id ? "true" : undefined}>
                <b>{row.title}</b>
                <div className="note">{row.slug ? `/${row.slug}` : "Start of /skill-tree"}</div>
              </Link>
              {row.depth > 0 ? (
                <div className="tree-actions">
                  {row.canUp ? (
                    <form action={reorderSkillNode}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button className="pill pill-black" type="submit">Up</button>
                    </form>
                  ) : null}
                  {row.canDown ? (
                    <form action={reorderSkillNode}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button className="pill pill-black" type="submit">Down</button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <form action={saveSkillNode} className="card stack request-form">
          <h2 className="section-label">Edit {selected.card.title}</h2>
          <input type="hidden" name="id" value={selected.id} />
          <div className="field">
            <Label htmlFor="card-title">Card title</Label>
            <Input id="card-title" name="cardTitle" required minLength={1} maxLength={120} defaultValue={selected.card.title} />
          </div>
          <div className="field">
            <Label htmlFor="crumb">Breadcrumb</Label>
            <Input id="crumb" name="crumb" required minLength={1} maxLength={120} defaultValue={selected.crumb} />
            <p className="note">Short name in the path at the top.</p>
          </div>
          {root ? (
            <div className="field">
              <Label htmlFor="hint">Note under the map</Label>
              <Input id="hint" name="hint" maxLength={240} defaultValue={selected.hint ?? ""} />
            </div>
          ) : (
            <>
              <div className="field">
                <Label htmlFor="page-title">Page title</Label>
                <Input id="page-title" name="pageTitle" required minLength={1} maxLength={160} defaultValue={selected.page?.title ?? selected.card.title} />
              </div>
              <div className="field">
                <Label htmlFor="card-sub">Card line</Label>
                <Input id="card-sub" name="cardSub" maxLength={240} defaultValue={selected.card.sub ?? ""} />
                <p className="note">Short line under the title on the card.</p>
              </div>
              {selected.map ? (
                <div className="field">
                  <Label htmlFor="map-sub">Map line</Label>
                  <Input id="map-sub" name="mapSub" maxLength={240} defaultValue={selected.map.sub ?? ""} />
                  <p className="note">Short line on the overview card.</p>
                </div>
              ) : null}
              <div className="field">
                <Label htmlFor="blurb">Page text</Label>
                <Textarea id="blurb" name="blurb" maxLength={500} defaultValue={selected.page?.blurb ?? ""} />
              </div>
              <div className="field">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" required maxLength={180} defaultValue={selected.slug.join("/")} placeholder="bootcamp or skill/daw" />
                <p className="note">The address under the parent. Lowercase and dashes.</p>
              </div>
              <div className="field">
                <Label htmlFor="shortcut">Overview shortcut</Label>
                <Input id="shortcut" name="shortcut" maxLength={180} defaultValue={selected.fromOverview?.join("/") ?? ""} placeholder="Optional" />
                <p className="note">Extra address from the overview. Advanced DJ uses advanced-dj. Leave blank if you do not need one.</p>
              </div>
            </>
          )}
          <p className="note">Id: {selected.id}. This does not change.</p>
          <Button type="submit">Save node</Button>
          <p>
            <Link className="pill pill-purple" href={publicHref}>See this on the public page</Link>
          </p>
        </form>

        {canMove ? (
          <form action={moveSkillNode} className="card stack request-form">
            <h2 className="section-label">Move</h2>
            <input type="hidden" name="id" value={selected.id} />
            <div className="field">
              <Label htmlFor="parent">Move under</Label>
              <select id="parent" name="parentId" className={selectClass} defaultValue={parentId}>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="black">Move</Button>
          </form>
        ) : null}

        <form action={addSkillChild} className="card stack request-form">
          <h2 className="section-label">Add a node under {selected.card.title}</h2>
          <input type="hidden" name="id" value={selected.id} />
          <div className="field">
            <Label htmlFor="new-title">Title</Label>
            <Input id="new-title" name="title" required minLength={1} maxLength={120} />
          </div>
          <div className="field">
            <Label htmlFor="new-slug">Slug</Label>
            <Input id="new-slug" name="slug" maxLength={180} placeholder="Filled from the title if you leave this blank" />
          </div>
          <div className="field">
            <Label htmlFor="new-blurb">Page text</Label>
            <Textarea id="new-blurb" name="blurb" maxLength={500} />
          </div>
          <Button type="submit">Add node</Button>
        </form>

        {root ? null : (
          <div className="card stack request-form">
            <h2 className="section-label">Remove</h2>
            <Dialog>
              <DialogTrigger className="pill pill-black">Remove this node</DialogTrigger>
              <DialogContent>
                <DialogTitle>Remove {selected.card.title}?</DialogTitle>
                <DialogDescription>
                  {under > 0
                    ? `This removes ${selected.card.title} and ${under} ${under === 1 ? "node" : "nodes"} under it.`
                    : `This removes ${selected.card.title}.`}
                </DialogDescription>
                <form action={removeSkillNode} style={{ marginTop: 16 }}>
                  <input type="hidden" name="id" value={selected.id} />
                  <Button type="submit">Remove</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </section>
    </div>
  );
}
