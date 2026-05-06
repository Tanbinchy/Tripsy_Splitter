import type { Expense, Member } from "./db";

export interface Balance {
  memberId: string;
  name: string;
  paid: number;
  owes: number;
  net: number; // positive = should receive, negative = should pay
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export function calculateBalances(
  expenses: Expense[],
  members: Member[]
): Balance[] {
  const map = new Map<string, Balance>();
  members.forEach((m) =>
    map.set(m.id, { memberId: m.id, name: m.name, paid: 0, owes: 0, net: 0 })
  );

  for (const e of expenses) {
    const payerIds = Array.isArray(e.paidBy) ? e.paidBy : [e.paidBy];
    const paidAmounts: Record<string, number> = Array.isArray(e.paidBy)
      ? e.paidByAmounts || Object.fromEntries(payerIds.map((id) => [id, e.amount / payerIds.length]))
      : { [e.paidBy]: e.amount };

    for (const [mid, paid] of Object.entries(paidAmounts)) {
      const payer = map.get(mid);
      if (payer) payer.paid += paid;
    }

    const split = e.splitBetween.length || 1;
    const share = e.amount / split;
    for (const mid of e.splitBetween) {
      const b = map.get(mid);
      if (b) b.owes += share;
    }
  }

  for (const b of map.values()) b.net = +(b.paid - b.owes).toFixed(2);
  return Array.from(map.values());
}

export function settleDebts(balances: Balance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ ...b, net: b.net }))
    .sort((a, b) => a.net - b.net);
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ ...b, net: b.net }))
    .sort((a, b) => b.net - a.net);

  const result: Settlement[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = Math.min(-d.net, c.net);
    if (amount > 0.01) {
      result.push({
        from: d.memberId,
        fromName: d.name,
        to: c.memberId,
        toName: c.name,
        amount: +amount.toFixed(2),
      });
    }
    d.net += amount;
    c.net -= amount;
    if (Math.abs(d.net) < 0.01) i++;
    if (Math.abs(c.net) < 0.01) j++;
  }
  return result;
}
