import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  Wallet,
  Pin,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  db,
  deleteTripForever,
  logActivity,
  moveTripToTrash,
  restoreTripFromTrash,
  type Trip,
} from "@/lib/db";
import { CreateTripDialog } from "@/components/CreateTripDialog";
import { EditTripDialog } from "@/components/EditTripDialog";

type TripView = "active" | "trash";

const Index = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<TripView>("active");
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

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

  const activeTrips = useMemo(() => {
    const list = (trips || []).filter((trip) => !trip.deletedAt);
    return [...list].sort((a, b) => {
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return 0;
    });
  }, [trips]);

  const deletedTrips = useMemo(
    () =>
      (trips || [])
        .filter((trip) => trip.deletedAt)
        .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)),
    [trips]
  );

  const togglePin = async (trip: Trip) => {
    const nextPinned = !trip.isPinned;
    await db.trips.update(trip.id, {
      isPinned: nextPinned,
      updatedAt: Date.now(),
    });
    await logActivity(trip.id, nextPinned ? "Pinned trip" : "Unpinned trip");
    toast.success(nextPinned ? "Trip pinned" : "Trip unpinned");
  };

  const moveToTrash = async (trip: Trip) => {
    if (!confirm(`Move "${trip.name}" to the recycle bin?`)) return;
    await moveTripToTrash(trip.id);
    await logActivity(trip.id, "Moved trip to recycle bin");
    toast.success("Trip moved to recycle bin");
  };

  const restoreTrip = async (trip: Trip) => {
    await restoreTripFromTrash(trip.id);
    await logActivity(trip.id, "Restored trip from recycle bin");
    toast.success("Trip restored");
    setView("active");
  };

  const permanentlyDelete = async (trip: Trip) => {
    if (
      !confirm(
        `Permanently delete "${trip.name}" and all of its members, expenses, and activity?`
      )
    ) {
      return;
    }
    await deleteTripForever(trip.id);
    toast.success("Trip permanently deleted");
  };

  const renderStats = (trip: Trip) => {
    const stats = expenseCounts?.[trip.id];
    const mc = memberCounts?.[trip.id] || 0;

    return (
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          {mc}
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet className="w-4 h-4" />
          {trip.currency}
          {(stats?.total || 0).toFixed(2)}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-sand)]">
      <header className="border-b border-border/60 bg-background sticky top-0 z-10">
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[image:var(--gradient-warm)] flex items-center justify-center shadow-[var(--shadow-soft)] shrink-0">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-none">Tripsy</h1>
              <p className="text-xs text-muted-foreground mt-1 truncate">
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
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold">
            {view === "trash" ? "Recycle bin" : "Your trips"}
          </h2>
          <div className="inline-flex w-full rounded-lg border border-border bg-background p-1 sm:w-auto">
            <Button
              type="button"
              variant={view === "active" ? "secondary" : "ghost"}
              className="flex-1 justify-center gap-2 sm:flex-none"
              onClick={() => setView("active")}
            >
              <MapPin className="w-4 h-4" />
              Trips
            </Button>
            <Button
              type="button"
              variant={view === "trash" ? "secondary" : "ghost"}
              className="flex-1 justify-center gap-2 sm:flex-none"
              onClick={() => setView("trash")}
            >
              <Trash2 className="w-4 h-4" />
              Recycle bin
              {deletedTrips.length ? ` ${deletedTrips.length}` : ""}
            </Button>
          </div>
        </div>

        {view === "active" ? (
          !activeTrips.length ? (
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeTrips.map((trip) => (
                <Card
                  key={trip.id}
                  className="overflow-hidden hover:shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] border-border/60"
                >
                  <Link to={`/trip/${trip.id}`} className="block p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg leading-tight truncate">
                          {trip.name}
                        </h3>
                        {trip.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {trip.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 sm:w-9 sm:h-9"
                          title={trip.isPinned ? "Unpin trip" : "Pin trip"}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePin(trip);
                          }}
                        >
                          <Pin className={`w-4 h-4 ${trip.isPinned ? "fill-primary text-primary" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 sm:w-9 sm:h-9"
                          title="Edit trip"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingTrip(trip);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 sm:w-9 sm:h-9"
                          title="Move to recycle bin"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveToTrash(trip);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {renderStats(trip)}
                  </Link>
                </Card>
              ))}
            </div>
          )
        ) : !deletedTrips.length ? (
          <Card className="mx-auto max-w-xl p-8 text-center text-muted-foreground">
            <Trash2 className="mx-auto mb-4 h-10 w-10" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Recycle bin is empty
            </h3>
            <p>Trips you move to the recycle bin will appear here.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deletedTrips.map((trip) => (
              <Card key={trip.id} className="border-border/60 p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg leading-tight truncate">
                    {trip.name}
                  </h3>
                  {trip.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {trip.description}
                    </p>
                  )}
                  {trip.deletedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Deleted {new Date(trip.deletedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {renderStats(trip)}
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => restoreTrip(trip)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => permanentlyDelete(trip)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete forever
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateTripDialog open={open} onOpenChange={setOpen} />
      <EditTripDialog
        open={Boolean(editingTrip)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingTrip(null);
        }}
        trip={editingTrip}
      />
    </div>
  );
};

export default Index;
