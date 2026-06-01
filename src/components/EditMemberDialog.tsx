import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, logActivity, type Member } from "@/lib/db";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
}

export const EditMemberDialog = ({ open, onOpenChange, member }: Props) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open || !member) return;
    setName(member.name);
  }, [open, member]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!member) return;

    const nextName = name.trim();
    if (!nextName) return;

    await db.members.update(member.id, {
      name: nextName,
      updatedAt: Date.now(),
    });

    if (nextName !== member.name) {
      await logActivity(
        member.tripId,
        `Renamed ${member.name} to ${nextName}`
      );
    }

    toast.success("Member updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="edit-member-name">Name</Label>
            <Input
              id="edit-member-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Alex"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
