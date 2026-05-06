import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import { db, logActivity, uid } from "@/lib/db";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CURRENCIES = ["৳", "$", "€", "£", "₹", "¥"];

export const CreateTripDialog = ({ open, onOpenChange }: Props) => {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [currency, setCurrency] = useState("৳");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = uid();
    await db.trips.add({
      id,
      name: name.trim(),
      description: desc.trim() || undefined,
      currency,
      createdAt: Date.now(),
      isOnline: false,
    });
    await logActivity(id, `Trip "${name.trim()}" created`);
    setName("");
    setDesc("");
    onOpenChange(false);
    nav(`/trip/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New trip room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Trip name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Goa weekend"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Beach trip with friends"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <div className="flex gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`w-12 h-10 rounded-lg border text-base font-medium transition-[var(--transition-smooth)] ${currency === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50"
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create trip</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
