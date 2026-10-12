import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { jsonError, jsonOk, parseEventPayload, readJson } from "@/lib/api";
import { getLiveSnapshot, getPublicEvent } from "@/lib/data";
import { promoteWaitlist } from "@/lib/registration";
import { nowStamp } from "@/lib/format";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const scope = new URL(request.url).searchParams.get("scope");
  const snapshot = scope === "public"
    ? null
    : await getLiveSnapshot(slug);
  if (snapshot) return jsonOk(snapshot);
  const pub = await getPublicEvent(slug);
  if (!pub) return jsonError("Event not found", 404);
  return jsonOk(pub);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const existing = await db
    .select()
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);
  const event = existing[0];
  if (!event) return jsonError("Event not found", 404);

  const body = await readJson(request);
  const current = {
    _currentStartsAt: event.startsAt,
    _currentEndsAt: event.endsAt,
    _currentDeadline: event.registrationDeadline,
  };
  const { values, errors } = parseEventPayload(
    { ...body, ...current },
    "update",
  );
  if (errors.length > 0) return jsonError(errors[0], 422, { errors });

  const updated = await db
    .update(events)
    .set({ ...values, updatedAt: nowStamp() })
    .where(eq(events.id, event.id))
    .returning();

  if (values.registrationManuallyClosed === false) {
    await promoteWaitlist(event.id);
  }

  return jsonOk({ event: updated[0] });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { slug } = await params;
  const deleted = await db
    .delete(events)
    .where(eq(events.slug, slug))
    .returning({ id: events.id });
  if (deleted.length === 0) return jsonError("Event not found", 404);
  return jsonOk({ deleted: deleted[0].id });
}
