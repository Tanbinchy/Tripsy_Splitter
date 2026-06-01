import Dexie, { type Table } from "dexie";

export interface Trip {
  id: string;
  name: string;
  description?: string;
  currency: string;
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
  isOnline: boolean;
  isPinned?: boolean;
}

export interface Member {
  id: string;
  tripId: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
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
    this.version(2).stores({
      trips: "id, createdAt, updatedAt, deletedAt",
      members: "id, tripId, updatedAt",
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

export async function moveTripToTrash(tripId: string) {
  await db.trips.update(tripId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function restoreTripFromTrash(tripId: string) {
  await db.trips.where("id").equals(tripId).modify((trip) => {
    delete trip.deletedAt;
    trip.updatedAt = Date.now();
  });
}

export async function deleteTripForever(tripId: string) {
  await db.transaction(
    "rw",
    db.trips,
    db.members,
    db.expenses,
    db.activities,
    async () => {
      await db.trips.delete(tripId);
      await db.members.where("tripId").equals(tripId).delete();
      await db.expenses.where("tripId").equals(tripId).delete();
      await db.activities.where("tripId").equals(tripId).delete();
    }
  );
}
