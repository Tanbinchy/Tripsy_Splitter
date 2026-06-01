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
import { db, logActivity, uid, type Member, type Expense } from "@/lib/db";
import { toast } from "sonner";

interface Props {
  tripId: string;
  currency: string;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense?: Expense | null;
}

interface PayerRow {
  memberId: string;
  amount: string;
}

export const AddExpenseDialog = ({
  tripId,
  currency,
  members,
  open,
  onOpenChange,
  editingExpense,
}: Props) => {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payers, setPayers] = useState<PayerRow[]>([]);
  const [split, setSplit] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      if (editingExpense) {
        setDesc(editingExpense.description);
        setAmount(editingExpense.amount.toString());
        setSplit(editingExpense.splitBetween || []);
        
        if (editingExpense.paidByAmounts) {
          const payerRows = Object.entries(editingExpense.paidByAmounts).map(
            ([memberId, amt]) => ({
              memberId,
              amount: amt.toString(),
            })
          );
          setPayers(payerRows);
        } else {
          const singlePayerId = editingExpense.paidBy[0];
          setPayers(
            singlePayerId
              ? [{ memberId: singlePayerId, amount: editingExpense.amount.toString() }]
              : []
          );
        }
      } else {
        setDesc("");
        setAmount("");
        setSplit(members.map((m) => m.id));
        setPayers(
          members.length
            ? [{ memberId: members[0].id, amount: "" }]
            : []
        );
      }
    }
  }, [open, members, editingExpense]);

  const toggleSplit = (id: string) =>
    setSplit((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  const updatePayer = (
    index: number,
    field: keyof PayerRow,
    value: string
  ) => {
    setPayers((current) =>
      current.map((payer, i) =>
        i === index ? { ...payer, [field]: value } : payer
      )
    );
  };

  const handleTotalAmountChange = (value: string) => {
    setAmount(value);
    if (payers.length === 1) {
      setPayers((current) =>
        current.map((payer) => ({ ...payer, amount: value }))
      );
    }
  };

  const handlePayerAmountChange = (value: string, index: number) => {
    updatePayer(index, "amount", value);
    if (payers.length === 1) {
      setAmount(value);
    }
  };

  useEffect(() => {
    if (payers.length === 1) {
      setPayers((current) =>
        current.map((payer) =>
          payer.amount === amount ? payer : { ...payer, amount }
        )
      );
    }
  }, [amount, payers.length]);

  const addPayer = () => {
    const remaining = members.find(
      (m) => !payers.some((payer) => payer.memberId === m.id)
    );
    if (!remaining) return;
    setPayers((current) => [...current, { memberId: remaining.id, amount: "" }]);
  };

  const removePayer = (index: number) =>
    setPayers((current) => current.filter((_, i) => i !== index));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const totalAmount = parseFloat(amount);
    if (!totalAmount || totalAmount <= 0) {
      setError("Enter a valid total expense amount.");
      return;
    }

    if (!split.length) {
      setError("Select at least one member for split.");
      return;
    }

    if (!payers.length) {
      setError("Add at least one payer for this expense.");
      return;
    }

    const normalized = payers.map((payer) => ({
      memberId: payer.memberId,
      amount: parseFloat(payer.amount),
    }));

    if (normalized.some((payer) => !payer.memberId)) {
      setError("Select a payer for every payer row.");
      return;
    }

    if (normalized.some((payer) => !payer.amount || payer.amount <= 0)) {
      setError("Enter a valid amount for every payer.");
      return;
    }

    const payerSum = normalized.reduce((sum, payer) => sum + payer.amount, 0);
    if (Math.abs(payerSum - totalAmount) > 0.01) {
      setError(`Payer totals must equal the expense amount (${currency}${totalAmount.toFixed(2)}).`);
      return;
    }

    const paidBy = normalized.map((payer) => payer.memberId);
    const paidByAmounts = Object.fromEntries(
      normalized.map((payer) => [payer.memberId, payer.amount])
    );
    const finalDesc = desc.trim() || "Expense";

    if (editingExpense) {
      await db.expenses.update(editingExpense.id, {
        description: finalDesc,
        amount: totalAmount,
        paidBy,
        paidByAmounts,
        splitBetween: split,
      });

      const payerNames = normalized
        .map((payer) =>
          members.find((m) => m.id === payer.memberId)?.name || "Someone"
        )
        .join(", ");

      if (
        finalDesc !== editingExpense.description ||
        totalAmount !== editingExpense.amount ||
        JSON.stringify(paidBy) !== JSON.stringify(editingExpense.paidBy) ||
        JSON.stringify(paidByAmounts) !== JSON.stringify(editingExpense.paidByAmounts) ||
        JSON.stringify(split) !== JSON.stringify(editingExpense.splitBetween)
      ) {
        await logActivity(
          tripId,
          `${payerNames} updated "${finalDesc}" · ${currency}${totalAmount.toFixed(2)}`
        );
      }
      toast.success("Expense updated");
    } else {
      await db.expenses.add({
        id: uid(),
        tripId,
        description: finalDesc,
        amount: totalAmount,
        paidBy,
        paidByAmounts,
        splitBetween: split,
        createdAt: Date.now(),
      });

      const payerNames = normalized
        .map((payer) =>
          members.find((m) => m.id === payer.memberId)?.name || "Someone"
        )
        .join(", ");

      await logActivity(
        tripId,
        `${payerNames} added "${finalDesc}" · ${currency}${totalAmount.toFixed(2)}`
      );
      toast.success("Expense added");
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl w-full">
        <form onSubmit={submit}>
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold font-bold">
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4 rounded-lg border border-border/50 bg-muted/20 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="e-desc" className="text-sm font-medium">
                    What For - ? <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="e-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="e.g., Dinner at the beach"
                    autoFocus
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="e-amt" className="text-sm font-medium">
                    Amount ({currency})
                  </Label>
                  <Input
                    id="e-amt"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => handleTotalAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border/50 bg-muted/20 p-5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Paid by</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPayer}
                  disabled={payers.length >= members.length}
                  className="h-8 px-3 text-xs"
                >
                  + Add payer
                </Button>
              </div>
              <div className="space-y-4">
                {payers.map((payer, index) => (
                  <div
                    key={`${payer.memberId}-${index}`}
                    className="space-y-4"
                  >
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Member</Label>
                      <div className="flex flex-wrap items-start gap-1">
                        {members.map((member) => (
                          <button
                            key={`${member.id}-${index}`}
                            type="button"
                            aria-label={`Select ${member.name} as payer`}
                            onClick={() =>
                              updatePayer(index, "memberId", member.id)
                            }
                            className={`h-10 rounded-md border px-4 text-sm font-medium transition-all duration-200 text-center ${payer.memberId === member.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "border-border hover:border-primary/50 hover:bg-primary/5"
                              }`}
                          >
                            {member.name}
                          </button>
                        ))}
                      </div>

                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <Label htmlFor={`payer-amount-${index}`} className="text-sm font-medium">
                        Amount
                      </Label>
                      <div className="flex items-end gap-2 w-full">
                        <Input
                          id={`payer-amount-${index}`}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={payer.amount}
                          onChange={(event) =>
                            handlePayerAmountChange(event.target.value, index)
                          }
                          className="h-10 w-full"
                        />
                        {payers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removePayer(index)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-5">
              <Label className="text-sm font-medium">Split between</Label>
              <div className="flex flex-wrap items-start gap-1">
                {members.map((m) => {
                  const on = split.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleSplit(m.id)}
                      className={`h-10 rounded-md border px-4 text-sm font-medium transition-all duration-200 text-center ${on
                        ? "bg-accent text-accent-foreground border-accent shadow-sm"
                        : "border-border hover:border-accent/50 hover:bg-accent/5"
                        }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <span className="text-destructive">⚠</span>
                  {error}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="pt-6 border-t border-border/50">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10"
            >
              Cancel
            </Button>
            <Button type="submit" className="h-10 px-6">
              {editingExpense ? "Save changes" : "Save Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
