import Dexie, { type Table } from "dexie";

export interface Trip {
  id: string;
  name: string;
  description?: string;
  currency: string;
  createdAt: number;
  isOnline: boolean;
}

export interface Member {
  id: string;
  tripId: string;
  name: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  paidBy: string[]; // member ids
  paidByAmounts?: Record<string, number>;
  splitBetween: string[]; // member ids
  createdAt: number;
}

export interface Activity {
  id: string;
  tripId: string;
  message: string;
  createdAt: number;
}

class TripDB extends Dexie {
  trips!: Table<Trip, string>;
  members!: Table<Member, string>;
  expenses!: Table<Expense, string>;
  activities!: Table<Activity, string>;

  constructor() {
    super("TripRoomDB");
    this.version(1).stores({
      trips: "id, createdAt",
      members: "id, tripId",
      expenses: "id, tripId, createdAt",
      activities: "id, tripId, createdAt",
    });
  }
}

export const db = new TripDB();

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

export async function logActivity(tripId: string, message: string) {
  await db.activities.add({
    id: uid(),
    tripId,
    message,
    createdAt: Date.now(),
  });
}
