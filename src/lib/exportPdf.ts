import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Trip, Member, Expense } from "./db";
import { calculateBalances, settleDebts } from "./balances";

// jsPDF's default fonts don't include the BDT taka glyph (৳).
// Replace it with "BDT " so the PDF stays readable for Bangladeshi users.
const safeCurrency = (c: string) => (c === "৳" ? "BDT " : c);

export function exportTripPdf(
  trip: Trip,
  members: Member[],
  expenses: Expense[]
) {
  const doc = new jsPDF();
  const cur = safeCurrency(trip.currency);
  const nameOf = (id: string) =>
    members.find((m) => m.id === id)?.name || "Unknown";

  // Title
  doc.setFontSize(20);
  doc.text(trip.name, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${trip.description ? trip.description + " · " : ""}Generated ${new Date().toLocaleString()}`,
    14,
    25
  );
  doc.setTextColor(0);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Summary
  doc.setFontSize(12);
  doc.text(
    `Members: ${members.length}    Expenses: ${expenses.length}    Total: ${cur}${total.toFixed(2)}`,
    14,
    34
  );

  // Expenses
  autoTable(doc, {
    startY: 40,
    head: [["Date", "Description", "Paid by", "Split", `Amount (${cur.trim()})`]],
    body: [...expenses]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((e) => {
        const payers = Array.isArray(e.paidBy) ? e.paidBy : [e.paidBy];
        return [
          new Date(e.createdAt).toLocaleDateString(),
          e.description,
          payers.map(nameOf).join(", "),
          e.splitBetween.map(nameOf).join(", "),
          e.amount.toFixed(2),
        ];
      }),
    headStyles: { fillColor: [196, 101, 74] },
    styles: { fontSize: 9 },
  });

  // Balances
  const balances = calculateBalances(expenses, members);
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text("Balances", 14, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Member", "Paid", "Share", "Net"]],
    body: balances.map((b) => [
      b.name,
      `${cur}${b.paid.toFixed(2)}`,
      `${cur}${b.owes.toFixed(2)}`,
      `${cur}${b.net > 0 ? "+" : ""}${b.net.toFixed(2)}`,
    ]),
    headStyles: { fillColor: [122, 138, 100] },
    styles: { fontSize: 9 },
  });

  // Settlements
  const settlements = settleDebts(balances);
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text("Settle up", 14, y);
  if (!settlements.length) {
    doc.setFontSize(10);
    doc.text("All settled.", 14, y + 7);
  } else {
    autoTable(doc, {
      startY: y + 4,
      head: [["From", "To", "Amount"]],
      body: settlements.map((s) => [
        s.fromName,
        s.toName,
        `${cur}${s.amount.toFixed(2)}`,
      ]),
      headStyles: { fillColor: [196, 101, 74] },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`${trip.name.replace(/[^\w-]+/g, "_")}_summary.pdf`);
}
