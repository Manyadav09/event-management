import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, registrations, type EventRow, type RegistrationRow } from "@/db/schema";
import { countConfirmed, resolveRegistrationState, uniqueTicketCode } from "./data";
import { nowStamp } from "./format";

export type GuestInput = {
  fullName?: string;
  email?: string;
  designation?: string;
  guestLabel?: string;
};

export type RegisterInput = {
  fullName: string;
  email?: string;
  phone?: string;
  organization?: string;
  designation?: string;
  ticketCategory?: string;
  notes?: string;
  guests?: GuestInput[];
};

export type RegisterResult =
  | {
      ok: true;
      primary: RegistrationRow;
      guests: RegistrationRow[];
      waitlisted: boolean;
      guestsWaitlisted: number;
      state: ReturnType<typeof resolveRegistrationState>;
    }
  | { ok: false; error: string; status?: number };

export async function createRegistration(
  event: EventRow,
  input: RegisterInput,
): Promise<RegisterResult> {
  const fullName = (input.fullName ?? "").trim();
  if (fullName.length < 2) {
    return { ok: false, error: "Please enter your full name." };
  }
  const email = (input.email ?? "").trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const state = resolveRegistrationState(
    event,
    await countConfirmed(event.id, "participant"),
    await countConfirmed(event.id, "guest"),
  );
  if (state.reason === "closed" || state.reason === "manual" || state.reason === "deadline" || state.reason === "draft" || state.reason === "ended") {
    return { ok: false, error: `Registration is closed — ${state.reason}.`, status: 409 };
  }

  const guestList = (input.guests ?? [])
    .map((g) => ({ ...g, fullName: (g.fullName ?? "").trim() }))
    .filter((g) => g.fullName.length > 1);

  if (!event.allowGuests && guestList.length > 0) {
    return { ok: false, error: "Guests are not allowed for this event." };
  }
  if (guestList.length > event.guestsPerRegistration) {
    return {
      ok: false,
      error: `You can register up to ${event.guestsPerRegistration} guest(s).`,
    };
  }

  const now = nowStamp();
  const confirmedParticipants = await countConfirmed(event.id, "participant");
  const confirmedGuests = await countConfirmed(event.id, "guest");

  const participantFull =
    event.autoCloseWhenFull && confirmedParticipants >= event.capacity;
  let participantStatus: "confirmed" | "waitlisted" = "confirmed";
  if (participantFull) {
    if (!event.waitlistEnabled) {
      return { ok: false, error: "The event is full — registration closed.", status: 409 };
    }
    participantStatus = "waitlisted";
  }

  const primaryCode = await uniqueTicketCode("TCK");
  const inserted = await db
    .insert(registrations)
    .values({
      eventId: event.id,
      ticketCode: primaryCode,
      type: "participant",
      status: participantStatus,
      fullName,
      email,
      phone: (input.phone ?? "").trim(),
      organization: (input.organization ?? "").trim(),
      designation: (input.designation ?? "").trim(),
      ticketCategory: (input.ticketCategory ?? "General").trim() || "General",
      notes: (input.notes ?? "").trim(),
      createdAt: now,
    })
    .returning();
  const primary = inserted[0];

  const guestRows: RegistrationRow[] = [];
  let guestsWaitlisted = 0;
  if (event.allowGuests && guestList.length > 0) {
    let seats = Math.max(0, event.guestCapacity - confirmedGuests);
    for (const guest of guestList) {
      const guestStatus: "confirmed" | "waitlisted" =
        seats > 0 ? "confirmed" : event.waitlistEnabled ? "waitlisted" : "confirmed";
      if (guestStatus !== "confirmed") guestsWaitlisted += 1;
      seats -= 1;
      const code = await uniqueTicketCode("GST");
      const rows = await db
        .insert(registrations)
        .values({
          eventId: event.id,
          ticketCode: code,
          type: "guest",
          status: guestStatus,
          fullName: guest.fullName,
          email: (guest.email ?? "").trim(),
          organization: (input.organization ?? "").trim(),
          designation: (guest.designation ?? "").trim(),
          ticketCategory: "Guest",
          guestLabel: (guest.guestLabel ?? "Guest").trim() || "Guest",
          primaryRegistrationId: primary.id,
          createdAt: nowStamp(),
        })
        .returning();
      guestRows.push(rows[0]);
    }
  }

  const finalState = resolveRegistrationState(
    event,
    await countConfirmed(event.id, "participant"),
    await countConfirmed(event.id, "guest"),
  );

  return {
    ok: true,
    primary,
    guests: guestRows,
    waitlisted: participantStatus === "waitlisted",
    guestsWaitlisted,
    state: finalState,
  };
}

export async function addGuest(
  event: EventRow,
  primary: RegistrationRow,
  guest: GuestInput,
): Promise<RegisterResult> {
  const name = (guest.fullName ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Guest name is required." };
  if (!event.allowGuests) {
    return { ok: false, error: "Guests are not allowed for this event." };
  }
  const state = resolveRegistrationState(
    event,
    await countConfirmed(event.id, "participant"),
    await countConfirmed(event.id, "guest"),
  );
  if (!state.open) {
    return { ok: false, error: "Registration is closed — guests cannot be added.", status: 409 };
  }
  const existing = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(eq(registrations.primaryRegistrationId, primary.id));
  if (existing.length >= event.guestsPerRegistration) {
    return {
      ok: false,
      error: `Guest limit reached (${event.guestsPerRegistration}).`,
    };
  }
  const confirmedGuests = await countConfirmed(event.id, "guest");
  const status: "confirmed" | "waitlisted" =
    confirmedGuests < event.guestCapacity ? "confirmed" : "waitlisted";
  const code = await uniqueTicketCode("GST");
  const rows = await db
    .insert(registrations)
    .values({
      eventId: event.id,
      ticketCode: code,
      type: "guest",
      status,
      fullName: name,
      email: (guest.email ?? "").trim(),
      designation: (guest.designation ?? "").trim(),
      ticketCategory: "Guest",
      guestLabel: (guest.guestLabel ?? "Guest").trim() || "Guest",
      primaryRegistrationId: primary.id,
      createdAt: nowStamp(),
    })
    .returning();
  return {
    ok: true,
    primary,
    guests: [rows[0]],
    waitlisted: false,
    guestsWaitlisted: status === "waitlisted" ? 1 : 0,
    state,
  };
}

/** Promote waitlisted people automatically when seats free up. */
export async function promoteWaitlist(eventId: number) {
  const found = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const row = found[0];
  if (!row || !row.waitlistEnabled) return;
  for (const type of ["participant", "guest"] as const) {
    const capacity = type === "participant" ? row.capacity : row.guestCapacity;
    if (!capacity) continue;
    const confirmed = await countConfirmed(eventId, type);
    let seats = capacity - confirmed;
    if (seats <= 0) continue;
    const waiting = await db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.type, type),
          eq(registrations.status, "waitlisted"),
        ),
      );
    const ids = waiting.slice(0, seats).map((r) => r.id);
    if (ids.length > 0) {
      await db
        .update(registrations)
        .set({ status: "confirmed" })
        .where(inArray(registrations.id, ids));
    }
  }
}


