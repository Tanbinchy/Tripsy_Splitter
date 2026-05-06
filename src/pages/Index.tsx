import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, MapPin, Wallet, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { useState } from "react";
import { CreateTripDialog } from "@/components/CreateTripDialog";

const Index = () => {
  const [open, setOpen] = useState(false);
  const trips = useLiveQuery(() =>
    db.trips.orderBy("createdAt").reverse().toArray()
  );
  const expenseCounts = useLiveQuery(async () => {
    const all = await db.expenses.toArray();
    const map: Record<string, { count: number; total: number }> = {};
    for (const e of all) {
      if (!map[e.tripId]) map[e.tripId] = { count: 0, total: 0 };
      map[e.tripId].count++;
      map[e.tripId].total += e.amount;
    }
    return map;
  });
  const memberCounts = useLiveQuery(async () => {
    const all = await db.members.toArray();
    const map: Record<string, number> = {};
    for (const m of all) map[m.tripId] = (map[m.tripId] || 0) + 1;
    return map;
  });

  return (
    <div className="min-h-screen bg-[image:var(--gradient-sand)]">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[image:var(--gradient-warm)] flex items-center justify-center shadow-[var(--shadow-soft)]">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">Tripsy</h1>
              <p className="text-xs text-muted-foreground mt-1">
                OFFLINE-FIRST TRIP EXPENSES
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="w-4 h-4" />
            New trip
          </Button>
        </div>
      </header>

      <main className="container py-10">
        {!trips?.length ? (
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-[image:var(--gradient-warm)] mx-auto flex items-center justify-center shadow-[var(--shadow-soft)] mb-6">
              <MapPin className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Plan trips. Split costs. No internet needed.
            </h2>
            <p className="text-muted-foreground mb-8">
              Create a trip room, add your travel mates, and let Tripsy do the
              math. Everything is saved on your device.
            </p>
            <Button size="lg" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4" />
              Create your first trip
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">Your trips</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((t) => {
                const stats = expenseCounts?.[t.id];
                const mc = memberCounts?.[t.id] || 0;
                return (
                  <Link key={t.id} to={`/trip/${t.id}`}>
                    <Card className="p-5 hover:shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] cursor-pointer h-full border-border/60">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg leading-tight">
                            {t.name}
                          </h3>
                          {t.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {t.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          Local
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {mc}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Wallet className="w-4 h-4" />
                          {t.currency}
                          {(stats?.total || 0).toFixed(2)}
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

      <CreateTripDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default Index;
