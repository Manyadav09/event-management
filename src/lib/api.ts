import type { NewEventRow } from "@/db/schema";
import { slugify } from "./format";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json({ ok: true, ...(data as object) }, init);
}

export function jsonError(message: string, status = 400, extra?: object) {
  return Response.json({ ok: false, error: message, ...extra }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function num(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(str(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function stamp(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const normalized = raw.replace("T", " ").slice(0, 19);
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)
    ? normalized
    : null;
}

export type ParsedEvent = {
  values: Partial<NewEventRow>;
  errors: string[];
};

/** Validates the single organizer form payload. */
export function parseEventPayload(
  body: Record<string, unknown>,
  mode: "create" | "update",
): ParsedEvent {
  const errors: string[] = [];
  const values: Partial<NewEventRow> = {};

  if (mode === "create" || body.name !== undefined) {
    const name = str(body.name);
    if (name.length < 3) errors.push("Event name must be at least 3 characters.");
    else values.name = name;
  }
  if (mode === "create" || body.tagline !== undefined) {
    values.tagline = str(body.tagline).slice(0, 180);
  }
  if (mode === "create" || body.description !== undefined) {
    values.description = str(body.description).slice(0, 4000);
  }
  if (mode === "create" || body.category !== undefined) {
    values.category = str(body.category, "Conference") || "Conference";
  }
  if (mode === "create" || body.venue !== undefined) {
    values.venue = str(body.venue);
  }
  if (mode === "create" || body.city !== undefined) {
    values.city = str(body.city);
  }
  if (mode === "create" || body.organizerName !== undefined) {
    values.organizerName = str(body.organizerName);
  }
  if (mode === "create" || body.contactEmail !== undefined) {
    const email = str(body.contactEmail);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push("Contact email looks invalid.");
    } else {
      values.contactEmail = email;
    }
  }
  if (mode === "create" || body.contactPhone !== undefined) {
    values.contactPhone = str(body.contactPhone);
  }

  const startsAt = body.startsAt === undefined ? undefined : stamp(body.startsAt);
  const endsAt = body.endsAt === undefined ? undefined : stamp(body.endsAt);
  const deadline =
    body.registrationDeadline === undefined
      ? undefined
      : stamp(body.registrationDeadline);

  if (mode === "create") {
    if (!startsAt) errors.push("Event start date & time is required.");
    if (!endsAt) errors.push("Event end date & time is required.");
    if (!deadline) errors.push("Registration deadline is required.");
  }
  if (startsAt) values.startsAt = startsAt;
  if (endsAt) values.endsAt = endsAt;
  if (deadline) values.registrationDeadline = deadline;

  const effectiveStart = (startsAt ?? str(body._currentStartsAt)) || "";
  const effectiveEnd = (endsAt ?? str(body._currentEndsAt)) || "";
  const effectiveDeadline =
    (deadline ?? str(body._currentDeadline)) || "";
  if (
    effectiveStart &&
    effectiveEnd &&
    effectiveEnd < effectiveStart
  ) {
    errors.push("End time must be after the start time.");
  }
  if (effectiveDeadline && effectiveStart && effectiveDeadline > effectiveStart) {
    errors.push("Registration deadline must be before the event starts.");
  }

  if (body.capacity !== undefined || mode === "create") {
    const capacity = num(body.capacity, 100);
    if (capacity < 1 || capacity > 100000) errors.push("Capacity must be 1–100000.");
    else values.capacity = capacity;
  }
  if (body.guestCapacity !== undefined || mode === "create") {
    const guestCapacity = num(body.guestCapacity, 0);
    if (guestCapacity < 0 || guestCapacity > 100000) {
      errors.push("Guest capacity must be 0–100000.");
    } else {
      values.guestCapacity = guestCapacity;
    }
  }
  if (body.guestsPerRegistration !== undefined || mode === "create") {
    const per = num(body.guestsPerRegistration, 1);
    if (per < 0 || per > 10) errors.push("Guests per registration must be 0–10.");
    else values.guestsPerRegistration = per;
  }
  if (body.allowGuests !== undefined) values.allowGuests = bool(body.allowGuests, true);
  if (mode === "create") values.allowGuests = bool(body.allowGuests, true);
  if (body.waitlistEnabled !== undefined) {
    values.waitlistEnabled = bool(body.waitlistEnabled, true);
  }
  if (body.autoCloseWhenFull !== undefined) {
    values.autoCloseWhenFull = bool(body.autoCloseWhenFull, true);
  }
  if (body.requireCheckIn !== undefined) {
    values.requireCheckIn = bool(body.requireCheckIn, true);
  }
  if (body.registrationManuallyClosed !== undefined) {
    values.registrationManuallyClosed = bool(body.registrationManuallyClosed, false);
  }
  if (body.status !== undefined) {
    const status = str(body.status, "published");
    if (!["draft", "published", "closed"].includes(status)) {
      errors.push("Unknown status.");
    } else {
      values.status = status;
    }
  }
  if (body.accent !== undefined) values.accent = str(body.accent, "violet") || "violet";

  return { values, errors };
}

export function slugFromName(name: string): string {
  return slugify(name);
}
