"use client";

import { useState } from "react";
import { savePersonName } from "@/app/people-actions";
import { RoleControls } from "@/components/role-controls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import styles from "./dashboard.module.css";

export type PersonRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  discord: string;
};

export function PeopleTable({
  people,
  lead,
  actorId,
}: {
  people: PersonRow[];
  lead: boolean;
  actorId: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = people.find((person) => person.id === openId) ?? null;
  const allSelected = people.length > 0 && selected.length === people.length;

  function toggle(id: string, on: boolean) {
    setSelected((current) => (on ? [...current, id] : current.filter((item) => item !== id)));
  }

  return (
    <section>
      <h2 className="section-label">Accounts</h2>
      <p className={styles.future}>
        {selected.length === 0
          ? "Select rows for a later bulk export or bulk change. Those actions are not built, and nothing is sent."
          : `${selected.length} selected. Bulk export and bulk changes are not built, so this selection changes nothing.`}
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  aria-label="Select all accounts"
                  onChange={(event) => setSelected(event.target.checked ? people.map((person) => person.id) : [])}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(person.id)}
                    aria-label={`Select ${person.name}`}
                    onChange={(event) => toggle(person.id, event.target.checked)}
                  />
                </td>
                <td>{person.name}</td>
                <td>{person.email}</td>
                <td>{person.roleLabel}</td>
                <td>
                  <button className="pill pill-black" type="button" onClick={() => setOpenId(person.id)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open !== null} onOpenChange={(next) => { if (!next) setOpenId(null); }}>
        <DialogContent>
          {open ? (
            <>
              <DialogTitle>{open.name}</DialogTitle>
              <DialogDescription>
                The table stays read-only. Email, Discord, password, and sessions are not edited here.
                {open.roleLabel === "Lead Instructor" ? " Lead Instructor is the label for the stored Lead role." : ""}
              </DialogDescription>
              <p className="note" style={{ marginTop: 8 }}>{open.email}</p>
              <p className="note">Discord: {open.discord}</p>
              <p className="note">Role: {open.roleLabel}</p>
              {lead ? (
                <form action={savePersonName} className={styles.modalFields}>
                  <input type="hidden" name="userId" value={open.id} />
                  <label>
                    Name
                    <Input name="name" defaultValue={open.name} minLength={2} maxLength={80} required />
                  </label>
                  <div className={styles.actions}>
                    <Button type="submit">Save name</Button>
                    <DialogClose className="pill pill-black" type="button">Cancel</DialogClose>
                  </div>
                </form>
              ) : (
                <p className="note" style={{ marginTop: 12 }}>
                  A Lead can save a name. This view does not save.
                </p>
              )}
              {lead && open.id !== actorId ? (
                <div style={{ marginTop: 16 }}>
                  <p className="note">Role changes use the existing Lead checks. You cannot change your own role.</p>
                  <RoleControls userId={open.id} name={open.name} role={open.role} />
                </div>
              ) : null}
              {!lead ? (
                <div className={styles.actions}>
                  <DialogClose className="pill pill-black" type="button">Close</DialogClose>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
