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
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/lib/currency";
import { db, logActivity, type Trip } from "@/lib/db";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
}

export const EditTripDialog = ({ open, onOpenChange, trip }: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]);

  useEffect(() => {
    if (!open || !trip) return;
    setName(trip.name);
    setDescription(trip.description || "");
    setCurrency(trip.currency);
  }, [open, trip]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trip) return;

    const nextName = name.trim();
    if (!nextName) return;

    const nextDescription = description.trim() || undefined;
    await db.trips.update(trip.id, {
      name: nextName,
      description: nextDescription,
      currency,
      updatedAt: Date.now(),
    });

    if (nextName !== trip.name) {
      await logActivity(
        trip.id,
        `Renamed trip from "${trip.name}" to "${nextName}"`
      );
    } else {
      await logActivity(trip.id, "Trip details updated");
    }

    toast.success("Trip updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-trip-name">Trip name</Label>
              <Input
                id="edit-trip-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Goa weekend"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-trip-description">
                Description (optional)
              </Label>
              <Textarea
                id="edit-trip-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Beach trip with friends"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCurrency(option)}
                    className={`h-10 w-12 rounded-lg border text-base font-medium transition-[var(--transition-smooth)] ${
                      currency === option
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {option}
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
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
