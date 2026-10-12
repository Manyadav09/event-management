import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { registrations, scanLogs } from "@/db/schema";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getEventBySlug, getStats } from "@/lib/data";
import { extractTicketCode, nowStamp } from "@/lib/format";

export const dynamic = "force-dynamic";

export type ScanOutcome = {
  result: "check_in" | "duplicate" | "rejected" | "not_found" | "undo";
  message: string;
  tone: "success" | "warn" | "danger";
  ticket?: {
    ticketCode: string;
    fullName: string;
    type: string;
    status: string;
    category: string;
    guestLabel: string;
    checkedInAt: string | null;
  };
  stats?: Awaited<ReturnType<typeof getStats>>;
};

export async function POST(request: Request) {
  const body = await readJson(request);
  const raw = String(body.code ?? "");
  const slug = String(body.slug ?? "");
  const mode = String(body.mode ?? "checkin");
  const scannedBy = String(body.scannedBy ?? "gate-device");
  const code = extractTicketCode(raw);
  if (!code) return jsonError("Nothing readable in that scan.", 422);

  const event = slug ? await getEventBySlug(slug) : null;

  const rows = await db
    .select()
    .from(registrations)
    .where(eq(registrations.ticketCode, code))
    .limit(1);
  const ticket = rows[0];
  const log = async (result: string, message: string, registrationId?: number) => {
    if (!event && !ticket) return;
    await db.insert(scanLogs).values({
      eventId: event?.id ?? ticket.eventId,
      registrationId: registrationId ?? ticket?.id ?? null,
      ticketCode: code,
      result,
      message,
      scannedBy,
      createdAt: nowStamp(),
    });
  };

  if (!ticket) {
    await log("not_found", "Unknown ticket scanned");
    const outcome: ScanOutcome = {
      result: "not_found",
      tone: "danger",
      message: `${code} is not a valid ticket for this event.`,
    };
    return jsonOk({ outcome });
  }

  if (event && ticket.eventId !== event.id) {
    await log("rejected", "Ticket belongs to another event", ticket.id);
    const outcome: ScanOutcome = {
      result: "rejected",
      tone: "danger",
      message: `${ticket.fullName}'s ticket is for a different event.`,
      ticket: toTicket(ticket),
    };
    return jsonOk({ outcome });
  }

  if (ticket.status === "cancelled") {
    await log("rejected", "Cancelled ticket presented", ticket.id);
    const outcome: ScanOutcome = {
      result: "rejected",
      tone: "danger",
      message: `Ticket ${code} was cancelled (${ticket.fullName}).`,
      ticket: toTicket(ticket),
    };
    return jsonOk({ outcome });
  }

  if (mode === "undo") {
    await db
      .update(registrations)
      .set({ status: "confirmed", checkedInAt: null })
      .where(eq(registrations.id, ticket.id));
    await log("undo", "Check-in reverted", ticket.id);
    const stats = await getStats(ticket.eventId);
    const outcome: ScanOutcome = {
      result: "undo",
      tone: "warn",
      message: `Check-in reverted for ${ticket.fullName}.`,
      ticket: toTicket({ ...ticket, status: "confirmed", checkedInAt: null }),
      stats,
    };
    return jsonOk({ outcome });
  }

  if (ticket.status === "checked_in") {
    await log("duplicate", "Already inside", ticket.id);
    const stats = await getStats(ticket.eventId);
    const outcome: ScanOutcome = {
      result: "duplicate",
      tone: "warn",
      message: `${ticket.fullName} already checked in.`,
      ticket: toTicket(ticket),
      stats,
    };
    return jsonOk({ outcome });
  }

  if (ticket.status === "waitlisted") {
    await log("rejected", "Waitlisted ticket", ticket.id);
    const outcome: ScanOutcome = {
      result: "rejected",
      tone: "warn",
      message: `${ticket.fullName} is on the waitlist — confirm them first.`,
      ticket: toTicket(ticket),
    };
    return jsonOk({ outcome });
  }

  const stamp = nowStamp();
  await db
    .update(registrations)
    .set({ status: "checked_in", checkedInAt: stamp })
    .where(and(eq(registrations.id, ticket.id)));
  await log("check_in", "Checked in", ticket.id);
  const stats = await getStats(ticket.eventId);
  const outcome: ScanOutcome = {
    result: "check_in",
    tone: "success",
    message: `Welcome, ${ticket.fullName}!`,
    ticket: toTicket({ ...ticket, status: "checked_in", checkedInAt: stamp }),
    stats,
  };
  return jsonOk({ outcome });
}

function toTicket(row: typeof registrations.$inferSelect) {
  return {
    ticketCode: row.ticketCode,
    fullName: row.fullName,
    type: row.type,
    status: row.status,
    category: row.ticketCategory,
    guestLabel: row.guestLabel,
    checkedInAt: row.checkedInAt ?? null,
  };
}
