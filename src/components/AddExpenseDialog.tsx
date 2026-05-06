import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { db, logActivity, uid, type Member } from "@/lib/db";

interface Props {
  tripId: string;
  currency: string;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddExpenseDialog = ({
  tripId,
  currency,
  members,
  open,
  onOpenChange,
}: Props) => {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<string>("");
  const [split, setSplit] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setPaidBy(members[0]?.id || "");
      setSplit(members.map((m) => m.id));
      setDesc("");
      setAmount("");
    }
  }, [open, members]);

  const toggle = (id: string) =>
    setSplit((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !paidBy || !split.length) return;
    const finalDesc = desc.trim() || "Expense";
    await db.expenses.add({
      id: uid(),
      tripId,
      description: finalDesc,
      amount: amt,
      paidBy,
      splitBetween: split,
      createdAt: Date.now(),
    });
    const payerName = members.find((m) => m.id === paidBy)?.name || "Someone";
    await logActivity(
      tripId,
      `${payerName} added "${finalDesc}" · ${currency}${amt.toFixed(2)}`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-desc">What for? <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="e-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Dinner at the beach"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-amt">Amount ({currency})</Label>
              <Input
                id="e-amt"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Paid by</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaidBy(m.id)}
                    className={`px-3 h-9 rounded-full border text-sm transition-[var(--transition-smooth)] ${
                      paidBy === m.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Split between</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = split.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      className={`px-3 h-9 rounded-full border text-sm transition-[var(--transition-smooth)] ${
                        on
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
