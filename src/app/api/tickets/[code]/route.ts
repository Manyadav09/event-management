import { eq } from "drizzle-orm";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getRegistrationByCode, getStats } from "@/lib/data";
import { addGuest, promoteWaitlist, type GuestInput } from "@/lib/registration";
import { nowStamp } from "@/lib/format";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

const ALLOWED = new Set(["confirmed", "waitlisted", "cancelled"]);

export async function GET(_request: Request, { params }: Ctx) {
  const { code } = await params;
  const found = await getRegistrationByCode(code.toUpperCase());
  if (!found) return jsonError("Ticket not found", 404);
  return jsonOk(found);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { code } = await params;
  const found = await getRegistrationByCode(code.toUpperCase());
  if (!found) return jsonError("Ticket not found", 404);

  const body = await readJson(request);
  const action = String(body.action ?? "status");

  if (action === "cancel") {
    await db
      .update(registrations)
      .set({ status: "cancelled" })
      .where(eq(registrations.id, found.registration.id));
    await promoteWaitlist(found.event.id);
  } else if (action === "restore") {
    await db
      .update(registrations)
      .set({ status: "confirmed", checkedInAt: null })
      .where(eq(registrations.id, found.registration.id));
    await promoteWaitlist(found.event.id);
  } else if (action === "undo-checkin") {
    await db
      .update(registrations)
      .set({ status: "confirmed", checkedInAt: null })
      .where(eq(registrations.id, found.registration.id));
  } else {
    const status = String(body.status ?? "");
    if (!ALLOWED.has(status)) return jsonError("Unsupported status", 422);
    await db
      .update(registrations)
      .set({ status, checkedInAt: null })
      .where(eq(registrations.id, found.registration.id));
    if (status === "cancelled") await promoteWaitlist(found.event.id);
  }

  const refreshed = await getRegistrationByCode(code.toUpperCase());
  return jsonOk(refreshed);
}

/** Participant adds an extra guest from their own ticket page. */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  const found = await getRegistrationByCode(code.toUpperCase());
  if (!found) return jsonError("Ticket not found", 404);
  if (found.registration.primaryRegistrationId) {
    return jsonError("Guests cannot add more guests.", 422);
  }
  const body = await readJson(request);
  const result = await addGuest(
    found.event,
    found.registration,
    body as GuestInput,
  );
  if (!result.ok) return jsonError(result.error, result.status ?? 422);
  const stats = await getStats(found.event.id);
  return jsonOk({ guest: result.guests[0], waitlisted: result.guestsWaitlisted > 0, stats }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { code } = await params;
  const found = await getRegistrationByCode(code.toUpperCase());
  if (!found) return jsonError("Ticket not found", 404);
  await db
    .delete(registrations)
    .where(eq(registrations.id, found.registration.id));
  await promoteWaitlist(found.event.id);
  return jsonOk({ deleted: code.toUpperCase(), at: nowStamp() });
}
