import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  events,
  registrations,
  scanLogs,
  type EventRow,
  type RegistrationRow,
} from "@/db/schema";
import { nowStamp } from "./format";

export type EventStats = {
  total: number;
  participants: number;
  guests: number;
  confirmed: number;
  waitlisted: number;
  cancelled: number;
  checkedIn: number;
  participantCapacity: number;
  guestCapacity: number;
  totalCapacity: number;
  participantFill: number;
  guestFill: number;
  overallFill: number;
  spotsLeft: number;
  guestSpotsLeft: number;
  scanRate: number;
  lastActivityAt: string | null;
};

export type RegistrationOpenState = {
  open: boolean;
  reason:
    | "open"
    | "draft"
    | "closed"
    | "manual"
    | "deadline"
    | "full"
    | "ended";
};

export function resolveRegistrationState(
  event: EventRow,
  confirmedParticipants: number,
  confirmedGuests: number,
  at: string = nowStamp(),
): RegistrationOpenState {
  if (event.status === "draft") {
    return { open: false, reason: "draft" };
  }
  if (event.status === "closed") {
    return { open: false, reason: "closed" };
  }
  if (event.registrationManuallyClosed) {
    return { open: false, reason: "manual" };
  }
  if (at > event.registrationDeadline) {
    return { open: false, reason: "deadline" };
  }
  if (at > event.endsAt) {
    return { open: false, reason: "ended" };
  }
  const participantFull = event.autoCloseWhenFull
    ? confirmedParticipants >= event.capacity
    : false;
  const guestFull =
    event.allowGuests && confirmedGuests >= event.guestCapacity;
  if (participantFull && (!event.allowGuests || guestFull)) {
    if (!event.waitlistEnabled) return { open: false, reason: "full" };
  }
  return { open: true, reason: "open" };
}

export function openStateCopy(state: RegistrationOpenState): string {
  switch (state.reason) {
    case "draft":
      return "Event is still a draft — publish it to open registration.";
    case "closed":
      return "Registration is permanently closed by the organizer.";
    case "manual":
      return "Registration closed early by the organizer.";
    case "deadline":
      return "Registration deadline has passed.";
    case "full":
      return "All spots are taken — waitlist is disabled.";
    case "ended":
      return "This event has already ended.";
    default:
      return "Registration is live.";
  }
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEventById(id: number): Promise<EventRow | null> {
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listEvents(): Promise<EventRow[]> {
  return db.select().from(events).orderBy(desc(events.startsAt));
}

export async function getStats(eventId: number): Promise<EventStats> {
  const rows = await db
    .select({
      type: registrations.type,
      status: registrations.status,
      count: sql<number>`count(*)::int`,
      lastAt: sql<string | null>`max(${registrations.createdAt})`,
    })
    .from(registrations)
    .where(eq(registrations.eventId, eventId))
    .groupBy(registrations.type, registrations.status);

  const stats: EventStats = {
    total: 0,
    participants: 0,
    guests: 0,
    confirmed: 0,
    waitlisted: 0,
    cancelled: 0,
    checkedIn: 0,
    participantCapacity: 0,
    guestCapacity: 0,
    totalCapacity: 0,
    participantFill: 0,
    guestFill: 0,
    overallFill: 0,
    spotsLeft: 0,
    guestSpotsLeft: 0,
    scanRate: 0,
    lastActivityAt: null,
  };

  for (const row of rows) {
    const count = Number(row.count ?? 0);
    stats.total += count;
    if (row.lastAt && (!stats.lastActivityAt || row.lastAt > stats.lastActivityAt)) {
      stats.lastActivityAt = row.lastAt;
    }
    if (row.type === "guest") {
      stats.guests += count;
    } else {
      stats.participants += count;
    }
    if (row.status === "waitlisted") stats.waitlisted += count;
    if (row.status === "cancelled") stats.cancelled += count;
    if (row.status === "checked_in") stats.checkedIn += count;
    if (row.status === "confirmed" || row.status === "checked_in") {
      stats.confirmed += count;
    }
  }

  const event = await getEventById(eventId);
  const participantCapacity = event?.capacity ?? 0;
  const guestCapacity = event?.allowGuests ? (event?.guestCapacity ?? 0) : 0;
  const confirmedParticipants = await countConfirmed(eventId, "participant");
  const confirmedGuests = await countConfirmed(eventId, "guest");

  stats.participantCapacity = participantCapacity;
  stats.guestCapacity = guestCapacity;
  stats.totalCapacity = participantCapacity + guestCapacity;
  stats.participantFill = participantCapacity
    ? Math.min(100, Math.round((confirmedParticipants / participantCapacity) * 100))
    : 0;
  stats.guestFill = guestCapacity
    ? Math.min(100, Math.round((confirmedGuests / guestCapacity) * 100))
    : 0;
  stats.overallFill = stats.totalCapacity
    ? Math.min(
        100,
        Math.round(
          ((confirmedParticipants + confirmedGuests) / stats.totalCapacity) * 100,
        ),
      )
    : 0;
  stats.spotsLeft = Math.max(0, participantCapacity - confirmedParticipants);
  stats.guestSpotsLeft = Math.max(0, guestCapacity - confirmedGuests);
  stats.scanRate = stats.confirmed
    ? Math.round((stats.checkedIn / stats.confirmed) * 100)
    : 0;
  return stats;
}

export async function countConfirmed(
  eventId: number,
  type: "participant" | "guest",
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.type, type),
        or(
          eq(registrations.status, "confirmed"),
          eq(registrations.status, "checked_in"),
        ),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

export async function listRegistrations(
  eventId: number,
  opts: { type?: string; status?: string; q?: string; limit?: number } = {},
): Promise<RegistrationRow[]> {
  const filters = [eq(registrations.eventId, eventId)];
  if (opts.type === "participant" || opts.type === "guest") {
    filters.push(eq(registrations.type, opts.type));
  }
  if (opts.status && opts.status !== "all") {
    if (opts.status === "active") {
      filters.push(
        or(
          eq(registrations.status, "confirmed"),
          eq(registrations.status, "checked_in"),
        )!,
      );
    } else {
      filters.push(eq(registrations.status, opts.status));
    }
  }
  if (opts.q) {
    const like = `%${opts.q}%`;
    filters.push(
      or(
        ilike(registrations.fullName, like),
        ilike(registrations.email, like),
        ilike(registrations.ticketCode, like),
        ilike(registrations.organization, like),
        ilike(registrations.phone, like),
      )!,
    );
  }
  return db
    .select()
    .from(registrations)
    .where(and(...filters))
    .orderBy(desc(registrations.createdAt))
    .limit(opts.limit ?? 300);
}

export async function listScans(eventId: number, limit = 25) {
  return db
    .select()
    .from(scanLogs)
    .where(eq(scanLogs.eventId, eventId))
    .orderBy(desc(scanLogs.createdAt), desc(scanLogs.id))
    .limit(limit);
}

export async function listAnnouncements(eventId: number, limit = 12) {
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.eventId, eventId))
    .orderBy(desc(announcements.createdAt), desc(announcements.id))
    .limit(limit);
}

export async function getRegistrationByCode(code: string) {
  const rows = await db
    .select()
    .from(registrations)
    .where(eq(registrations.ticketCode, code))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const event = await getEventById(row.eventId);
  if (!event) return null;
  const guests = row.primaryRegistrationId
    ? []
    : await db
        .select()
        .from(registrations)
        .where(eq(registrations.primaryRegistrationId, row.id))
        .orderBy(asc(registrations.id));
  const stats = await getStats(event.id);
  const state = resolveRegistrationState(
    event,
    await countConfirmed(event.id, "participant"),
    await countConfirmed(event.id, "guest"),
  );
  return { registration: row, event, guests, stats, state };
}

export async function getLiveSnapshot(slug: string) {
  const event = await getEventBySlug(slug);
  if (!event) return null;
  const [stats, recent, scans, notes] = await Promise.all([
    getStats(event.id),
    listRegistrations(event.id, { limit: 12 }),
    listScans(event.id, 8),
    listAnnouncements(event.id, 6),
  ]);
  const state = resolveRegistrationState(
    event,
    await countConfirmed(event.id, "participant"),
    await countConfirmed(event.id, "guest"),
  );
  return { event, stats, recent, scans, announcements: notes, state };
}

export async function getPublicEvent(slug: string) {
  const event = await getEventBySlug(slug);
  if (!event) return null;
  const stats = await getStats(event.id);
  const state = resolveRegistrationState(
    event,
    await countConfirmed(event.id, "participant"),
    await countConfirmed(event.id, "guest"),
  );
  const notes = await listAnnouncements(event.id, 4);
  return { event, stats, state, announcements: notes };
}

export async function uniqueTicketCode(prefix: string): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = `${prefix}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "X")}`;
    const existing = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(eq(registrations.ticketCode, code))
      .limit(1);
    if (existing.length === 0) return code;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function uniqueSlug(base: string): Promise<string> {
  const root = base || "event";
  let candidate = root;
  for (let i = 0; i < 20; i += 1) {
    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}
