import { useParams, Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Users,
  Receipt,
  Activity as ActivityIcon,
  Trash2,
  Scale,
  FileDown,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { db, logActivity } from "@/lib/db";
import { calculateBalances, settleDebts } from "@/lib/balances";
import { exportTripPdf } from "@/lib/exportPdf";
import { AddMemberDialog } from "@/components/AddMemberDialog";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { toast } from "sonner";

const TripRoom = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [memberOpen, setMemberOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const trip = useLiveQuery(() => (id ? db.trips.get(id) : undefined), [id]);
  const members = useLiveQuery(
    () => (id ? db.members.where("tripId").equals(id).toArray() : []),
    [id]
  );
  const expenses = useLiveQuery(
    () => (id ? db.expenses.where("tripId").equals(id).toArray() : []),
    [id]
  );
  const activities = useLiveQuery(
    () =>
      id
        ? db.activities
          .where("tripId")
          .equals(id)
          .reverse()
          .sortBy("createdAt")
          .then((a) => a.reverse())
        : [],
    [id]
  );

  const balances = useMemo(
    () => calculateBalances(expenses || [], members || []),
    [expenses, members]
  );
  const settlements = useMemo(() => settleDebts(balances), [balances]);
  const total = useMemo(
    () => (expenses || []).reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const memberName = (mid: string) =>
    members?.find((m) => m.id === mid)?.name || "Unknown";

  const deleteExpense = async (eid: string, desc: string) => {
    if (!confirm(`Delete expense "${desc}"?`)) return;
    await db.expenses.delete(eid);
    if (id) await logActivity(id, `Removed "${desc}"`);
  };

  const deleteTrip = async () => {
    if (!id) return;
    if (!confirm("Delete this trip and all its data?")) return;
    await db.transaction(
      "rw",
      db.trips,
      db.members,
      db.expenses,
      db.activities,
      async () => {
        await db.trips.delete(id);
        await db.members.where("tripId").equals(id).delete();
        await db.expenses.where("tripId").equals(id).delete();
        await db.activities.where("tripId").equals(id).delete();
      }
    );
    toast.success("Trip deleted");
    nav("/");
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  // return (
  //   <div className="min-h-screen bg-[image:var(--gradient-sand)]">
  //     <header className="border-b border-border/60 bg-background sticky top-0 z-10">
  //       <div className="container py-4">
  //         <Link
  //           to="/"
  //           className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
  //         >
  //           <ArrowLeft className="w-4 h-4" /> All trips
  //         </Link>
  //         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  //           <div>
  //             <h1 className="text-2xl font-bold tracking-tight">{trip.name}</h1>
  //             {trip.description && (
  //               <p className="text-sm text-muted-foreground mt-1">
  //                 {trip.description}
  //               </p>
  //             )}
  //           </div>
  //           <div className="flex flex-wrap items-center gap-1">
  //             <Button
  //               variant="ghost"
  //               size="icon"
  //               title="Export PDF"
  //               onClick={() => {
  //                 if (!expenses?.length) {
  //                   toast.error("Add an expense first");
  //                   return;
  //                 }
  //                 exportTripPdf(trip, members || [], expenses || []);
  //                 toast.success("PDF downloaded");
  //               }}
  //             >
  //               <FileDown className="w-4 h-4" />
  //             </Button>
  //             <Button
  //               variant="ghost"
  //               size="icon"
  //               title="Share summary"
  //               onClick={async () => {
  //                 const lines = [
  //                   `${trip.name} — summary`,
  //                   `Total: ${trip.currency}${total.toFixed(2)}`,
  //                   "",
  //                   "Settle up:",
  //                   ...(settlements.length
  //                     ? settlements.map(
  //                       (s) =>
  //                         `• ${s.fromName} → ${s.toName}: ${trip.currency}${s.amount.toFixed(2)}`
  //                     )
  //                     : ["• All settled 🎉"]),
  //                 ];
  //                 const text = lines.join("\n");
  //                 try {
  //                   if (navigator.share) {
  //                     await navigator.share({ title: trip.name, text });
  //                   } else {
  //                     await navigator.clipboard.writeText(text);
  //                     toast.success("Summary copied");
  //                   }
  //                 } catch {
  //                   /* user cancelled */
  //                 }
  //               }}
  //             >
  //               <Share2 className="w-4 h-4" />
  //             </Button>
  //             <Button variant="ghost" size="icon" onClick={deleteTrip}>
  //               <Trash2 className="w-4 h-4" />
  //             </Button>
  //           </div>
  //         </div>
  //       </div>
  //     </header>

  //     <main className="container py-6 pb-24">
  //       <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-3">
  //         <Card className="p-4">
  //           <div className="text-xs text-muted-foreground">Total spent</div>
  //           <div className="text-xl font-bold mt-1 break-words">
  //             {trip.currency}
  //             {total.toFixed(2)}
  //           </div>
  //         </Card>
  //         <Card className="p-4">
  //           <div className="text-xs text-muted-foreground">Members</div>
  //           <div className="text-xl font-bold mt-1">{members?.length || 0}</div>
  //         </Card>
  //         <Card className="p-4">
  //           <div className="text-xs text-muted-foreground">Expenses</div>
  //           <div className="text-xl font-bold mt-1">
  //             {expenses?.length || 0}
  //           </div>
  //         </Card>
  //       </div>

  //       <Tabs defaultValue="expenses">
  //         <TabsList className="flex w-full gap-4 justify-evenly md:gap-5 border border-border rounded-lg p-2">
  //           <TabsTrigger value="expenses" className="flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
  //             <Receipt className="w-4 h-4 sm:mr-1.5" />
  //             <span className="hidden sm:inline">Expenses</span>
  //           </TabsTrigger>
  //           <TabsTrigger value="balances" className="flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
  //             <Scale className="w-4 h-4 sm:mr-1.5" />
  //             <span className="hidden sm:inline">Balances</span>
  //           </TabsTrigger>
  //           <TabsTrigger value="members" className="flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
  //             <Users className="w-4 h-4 sm:mr-1.5" />
  //             <span className="hidden sm:inline">Members</span>
  //           </TabsTrigger>
  //           <TabsTrigger value="activity" className="flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
  //             <ActivityIcon className="w-4 h-4 sm:mr-1.5" />
  //             <span className="hidden sm:inline">Activity</span>
  //           </TabsTrigger>
  //         </TabsList>

  //         <TabsContent value="expenses" className="space-y-3 mt-4">
  //           {!expenses?.length ? (
  //             <Card className="p-8 text-center text-muted-foreground">
  //               No expenses yet. Add the first one below.
  //             </Card>
  //           ) : (
  //             [...expenses]
  //               .sort((a, b) => b.createdAt - a.createdAt)
  //               .map((e) => {
  //                 const payerIds = Array.isArray(e.paidBy) ? e.paidBy : [e.paidBy];
  //                 const payerLabel = payerIds.map(memberName).join(", ");
  //                 return (
  //                   <Card key={e.id} className="p-4 min-h-[88px] flex flex-row items-center justify-between">
  //                     <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center font-semibold text-secondary-foreground">
  //                       {memberName(payerIds[0]).charAt(0).toUpperCase()}
  //                     </div>
  //                     <div className="flex-1 min-w-0 pl-4">
  //                       <div className="font-medium truncate">{e.description}</div>
  //                       <div className="text-xs text-muted-foreground truncate">
  //                         {payerLabel} paid · split {e.splitBetween.length}
  //                       </div>
  //                     </div>
  //                     <div className="text-right">
  //                       <div className="font-semibold">
  //                         {trip.currency}
  //                         {e.amount.toFixed(2)}
  //                       </div>
  //                       <button
  //                         onClick={() => deleteExpense(e.id, e.description)}
  //                         className="text-xs text-muted-foreground hover:text-destructive"
  //                       >
  //                         delete
  //                       </button>
  //                     </div>
  //                   </Card>
  //                 );
  //               })
  //           )}
  //         </TabsContent>

  //         <TabsContent value="balances" className="space-y-4 mt-4">
  //           {!members?.length ? (
  //             <Card className="p-8 text-center text-muted-foreground">
  //               Add members to see balances.
  //             </Card>
  //           ) : (
  //             <>
  //               <div>
  //                 <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
  //                   Net balances
  //                 </h3>
  //                 <div className="space-y-2">
  //                   {balances.map((b) => (
  //                     <Card
  //                       key={b.memberId}
  //                       className="p-4 flex items-center justify-between"
  //                     >
  //                       <div>
  //                         <div className="font-medium">{b.name}</div>
  //                         <div className="text-xs text-muted-foreground">
  //                           paid {trip.currency}
  //                           {b.paid.toFixed(2)} · share {trip.currency}
  //                           {b.owes.toFixed(2)}
  //                         </div>
  //                       </div>
  //                       <div
  //                         className={`font-semibold ${b.net > 0.01
  //                           ? "text-success"
  //                           : b.net < -0.01
  //                             ? "text-destructive"
  //                             : "text-muted-foreground"
  //                           }`}
  //                       >
  //                         {b.net > 0 ? "+" : ""}
  //                         {trip.currency}
  //                         {b.net.toFixed(2)}
  //                       </div>
  //                     </Card>
  //                   ))}
  //                 </div>
  //               </div>

  //               <div>
  //                 <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
  //                   Settle up
  //                 </h3>
  //                 {!settlements.length ? (
  //                   <Card className="p-6 text-center text-muted-foreground">
  //                     All settled 🎉
  //                   </Card>
  //                 ) : (
  //                   <div className="space-y-2">
  //                     {settlements.map((s, i) => (
  //                       <Card
  //                         key={i}
  //                         className="p-4 flex items-center justify-between"
  //                       >
  //                         <div className="text-sm">
  //                           <span className="font-medium">{s.fromName}</span>
  //                           <span className="text-muted-foreground"> pays </span>
  //                           <span className="font-medium">{s.toName}</span>
  //                         </div>
  //                         <div className="font-semibold text-primary">
  //                           {trip.currency}
  //                           {s.amount.toFixed(2)}
  //                         </div>
  //                       </Card>
  //                     ))}
  //                   </div>
  //                 )}
  //               </div>
  //             </>
  //           )}
  //         </TabsContent>

  //         <TabsContent value="members" className="space-y-2 mt-4">
  //           {!members?.length ? (
  //             <Card className="p-8 text-center text-muted-foreground">
  //               No members yet.
  //             </Card>
  //           ) : (
  //             members.map((m) => {
  //               const isUsedInExpenses = expenses?.some((e) => {
  //                 const payerIds = Array.isArray(e.paidBy) ? e.paidBy : [e.paidBy];
  //                 return payerIds.includes(m.id) || e.splitBetween.includes(m.id);
  //               });
  //               return (
  //                 <Card key={m.id} className="p-3 flex items-center gap-3">
  //                   <div className="w-9 h-9 rounded-full bg-[image:var(--gradient-warm)] flex items-center justify-center text-primary-foreground font-semibold">
  //                     {m.name.charAt(0).toUpperCase()}
  //                   </div>
  //                   <div className="flex-1 font-medium">{m.name}</div>
  //                   {isUsedInExpenses ? (
  //                     <span className="text-xs text-muted-foreground px-2">
  //                       in expenses
  //                     </span>
  //                   ) : (
  //                     <button
  //                       onClick={async () => {
  //                         await db.members.delete(m.id);
  //                         if (id) await logActivity(id, `Removed ${m.name}`);
  //                       }}
  //                       className="text-xs text-muted-foreground hover:text-destructive px-2"
  //                     >
  //                       remove
  //                     </button>
  //                   )}
  //                 </Card>
  //               );
  //             })
  //           )}
  //           <Button
  //             variant="outline"
  //             className="w-full"
  //             onClick={() => setMemberOpen(true)}
  //           >
  //             <Plus className="w-4 h-4" /> Add member
  //           </Button>
  //         </TabsContent>

  //         <TabsContent value="activity" className="space-y-2 mt-4">
  //           {!activities?.length ? (
  //             <Card className="p-8 text-center text-muted-foreground">
  //               No activity yet.
  //             </Card>
  //           ) : (
  //             activities.map((a) => (
  //               <Card key={a.id} className="p-3 flex items-start gap-3">
  //                 <div className="w-2 h-2 rounded-full bg-primary mt-2" />
  //                 <div className="flex-1">
  //                   <div className="text-sm">{a.message}</div>
  //                   <div className="text-xs text-muted-foreground mt-0.5">
  //                     {new Date(a.createdAt).toLocaleString()}
  //                   </div>
  //                 </div>
  //               </Card>
  //             ))
  //           )}
  //         </TabsContent>
  //       </Tabs>
  //     </main>

  //     <div className="fixed bottom-0 left-0 right-0 border-t border-border/60 bg-background/90 backdrop-blur-sm">
  //       <div className="container py-3 flex gap-2">
  //         <Button
  //           variant="outline"
  //           className="flex-1"
  //           onClick={() => setMemberOpen(true)}
  //         >
  //           <Users className="w-4 h-4" /> Member
  //         </Button>
  //         <Button
  //           className="flex-1"
  //           onClick={() => {
  //             if (!members?.length) {
  //               toast.error("Add a member first");
  //               return;
  //             }
  //             setExpenseOpen(true);
  //           }}
  //         >
  //           <Plus className="w-4 h-4" /> Expense
  //         </Button>
  //       </div>
  //     </div>

  //     {id && (
  //       <>
  //         <AddMemberDialog
  //           tripId={id}
  //           open={memberOpen}
  //           onOpenChange={setMemberOpen}
  //         />
  //         <AddExpenseDialog
  //           tripId={id}
  //           currency={trip.currency}
  //           members={members || []}
  //           open={expenseOpen}
  //           onOpenChange={setExpenseOpen}
  //         />
  //       </>
  //     )}
  //   </div>
  // );

  return (
    <div className="min-h-screen bg-[image:var(--gradient-sand)]">
      <header className="border-b border-border/60 bg-background sticky top-0 z-10">
        <div className="container py-2 sm:py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-1 sm:mb-2"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" /> All trips
          </Link>
          {/* Title + icons on same row for mobile */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{trip.name}</h1>
              {trip.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                  {trip.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 sm:w-9 sm:h-9"
                title="Export PDF"
                onClick={() => {
                  if (!expenses?.length) {
                    toast.error("Add an expense first");
                    return;
                  }
                  exportTripPdf(trip, members || [], expenses || []);
                  toast.success("PDF downloaded");
                }}
              >
                <FileDown className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 sm:w-9 sm:h-9"
                title="Share summary"
                onClick={async () => {
                  const lines = [
                    `${trip.name} — summary`,
                    `Total: ${trip.currency}${total.toFixed(2)}`,
                    "",
                    "Settle up:",
                    ...(settlements.length
                      ? settlements.map(
                        (s) =>
                          `• ${s.fromName} → ${s.toName}: ${trip.currency}${s.amount.toFixed(2)}`
                      )
                      : ["• All settled 🎉"]),
                  ];
                  const text = lines.join("\n");
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: trip.name, text });
                    } else {
                      await navigator.clipboard.writeText(text);
                      toast.success("Summary copied");
                    }
                  } catch {
                    /* user cancelled */
                  }
                }}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9" onClick={deleteTrip}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-3 sm:py-6 pb-24">
        {/* Stats: stacked on mobile → side by side label+value, grid on sm+ */}
        <div className="grid grid-cols-3 gap-2 mb-4 sm:gap-3 sm:mb-6">
          <Card className="px-3 py-2 sm:p-4 flex flex-col sm:block">
            <div className="text-xs text-muted-foreground">Total spent</div>
            <div className="text-sm sm:text-xl font-bold mt-0.5 sm:mt-1 break-words leading-tight">
              {trip.currency}{total.toFixed(2)}
            </div>
          </Card>
          <Card className="px-3 py-2 sm:p-4 flex flex-col sm:block">
            <div className="text-xs text-muted-foreground">Members</div>
            <div className="text-sm sm:text-xl font-bold mt-0.5 sm:mt-1">{members?.length || 0}</div>
          </Card>
          <Card className="px-3 py-2 sm:p-4 flex flex-col sm:block">
            <div className="text-xs text-muted-foreground">Expenses</div>
            <div className="text-sm sm:text-xl font-bold mt-0.5 sm:mt-1">
              {expenses?.length || 0}
            </div>
          </Card>
        </div>

        <Tabs defaultValue="expenses">
          {/* Tabs: always show labels, compact on mobile */}
          <TabsList className="flex w-full border border-border rounded-lg p-1 sm:p-2 gap-0.5 sm:gap-4">
            <TabsTrigger
              value="expenses"
              className="flex-1 flex items-center justify-center gap-1 px-1 py-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Expenses</span>
            </TabsTrigger>
            <TabsTrigger
              value="balances"
              className="flex-1 flex items-center justify-center gap-1 px-1 py-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Balances</span>
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="flex-1 flex items-center justify-center gap-1 px-1 py-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Members</span>
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="flex-1 flex items-center justify-center gap-1 px-1 py-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ActivityIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-3 mt-4">
            {!expenses?.length ? (
              <Card className="p-8 text-center text-muted-foreground">
                No expenses yet. Add the first one below.
              </Card>
            ) : (
              [...expenses]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((e) => {
                  const payerIds = Array.isArray(e.paidBy) ? e.paidBy : [e.paidBy];
                  const payerLabel = payerIds.map(memberName).join(", ");
                  return (
                    <Card key={e.id} className="p-4 min-h-[88px] flex flex-row items-center justify-between">
                      <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center font-semibold text-secondary-foreground">
                        {memberName(payerIds[0]).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 pl-4">
                        <div className="font-medium truncate">{e.description}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {payerLabel} paid · split {e.splitBetween.length}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {trip.currency}
                          {e.amount.toFixed(2)}
                        </div>
                        <button
                          onClick={() => deleteExpense(e.id, e.description)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          delete
                        </button>
                      </div>
                    </Card>
                  );
                })
            )}
          </TabsContent>

          <TabsContent value="balances" className="space-y-4 mt-4">
            {!members?.length ? (
              <Card className="p-8 text-center text-muted-foreground">
                Add members to see balances.
              </Card>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                    Net balances
                  </h3>
                  <div className="space-y-2">
                    {balances.map((b) => (
                      <Card
                        key={b.memberId}
                        className="p-4 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{b.name}</div>
                          <div className="text-xs text-muted-foreground">
                            paid {trip.currency}
                            {b.paid.toFixed(2)} · share {trip.currency}
                            {b.owes.toFixed(2)}
                          </div>
                        </div>
                        <div
                          className={`font-semibold ${b.net > 0.01
                            ? "text-success"
                            : b.net < -0.01
                              ? "text-destructive"
                              : "text-muted-foreground"
                            }`}
                        >
                          {b.net > 0 ? "+" : ""}
                          {trip.currency}
                          {b.net.toFixed(2)}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                    Settle up
                  </h3>
                  {!settlements.length ? (
                    <Card className="p-6 text-center text-muted-foreground">
                      All settled 🎉
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {settlements.map((s, i) => (
                        <Card
                          key={i}
                          className="p-4 flex items-center justify-between"
                        >
                          <div className="text-sm">
                            <span className="font-medium">{s.fromName}</span>
                            <span className="text-muted-foreground"> pays </span>
                            <span className="font-medium">{s.toName}</span>
                          </div>
                          <div className="font-semibold text-primary">
                            {trip.currency}
                            {s.amount.toFixed(2)}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-2 mt-4">
            {!members?.length ? (
              <Card className="p-8 text-center text-muted-foreground">
                No members yet.
              </Card>
            ) : (
              members.map((m) => {
                const isUsedInExpenses = expenses?.some((e) => {
                  const payerIds = Array.isArray(e.paidBy) ? e.paidBy : [e.paidBy];
                  return payerIds.includes(m.id) || e.splitBetween.includes(m.id);
                });
                return (
                  <Card key={m.id} className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[image:var(--gradient-warm)] flex items-center justify-center text-primary-foreground font-semibold">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 font-medium">{m.name}</div>
                    {isUsedInExpenses ? (
                      <span className="text-xs text-muted-foreground px-2">
                        in expenses
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          await db.members.delete(m.id);
                          if (id) await logActivity(id, `Removed ${m.name}`);
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive px-2"
                      >
                        remove
                      </button>
                    )}
                  </Card>
                );
              })
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMemberOpen(true)}
            >
              <Plus className="w-4 h-4" /> Add member
            </Button>
          </TabsContent>

          <TabsContent value="activity" className="space-y-2 mt-4">
            {!activities?.length ? (
              <Card className="p-8 text-center text-muted-foreground">
                No activity yet.
              </Card>
            ) : (
              activities.map((a) => (
                <Card key={a.id} className="p-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <div className="text-sm">{a.message}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="container py-3 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setMemberOpen(true)}
          >
            <Users className="w-4 h-4" /> Member
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (!members?.length) {
                toast.error("Add a member first");
                return;
              }
              setExpenseOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Expense
          </Button>
        </div>
      </div>

      {id && (
        <>
          <AddMemberDialog
            tripId={id}
            open={memberOpen}
            onOpenChange={setMemberOpen}
          />
          <AddExpenseDialog
            tripId={id}
            currency={trip.currency}
            members={members || []}
            open={expenseOpen}
            onOpenChange={setExpenseOpen}
          />
        </>
      )}
    </div>
  );
};

export default TripRoom;
