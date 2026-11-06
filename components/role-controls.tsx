import { setUserRole } from "@/app/role-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { roleChoices, roleLabel } from "@/lib/promote";

export function RoleControls({ userId, name, role }: { userId: string; name: string; role: string }) {
  const current = roleLabel(role);
  return (
    <div className="detail-actions" style={{ marginBottom: 0 }}>
      {roleChoices(role).map((choice) =>
        choice.confirm ? (
          <Dialog key={choice.role}>
            <DialogTrigger className="pill pill-black">{choice.label}</DialogTrigger>
            <DialogContent>
              <DialogTitle>{choice.label}?</DialogTitle>
              <DialogDescription>
                {name} is {current}. {choice.warning}
              </DialogDescription>
              <form action={setUserRole} style={{ marginTop: 16 }}>
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="role" value={choice.role} />
                <Button type="submit">{choice.label}</Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <form key={choice.role} action={setUserRole}>
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="role" value={choice.role} />
            <button className="pill pill-black" type="submit">
              {choice.label}
            </button>
          </form>
        ),
      )}
    </div>
  );
}
