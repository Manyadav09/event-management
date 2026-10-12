import { db } from "@/db";
import { events } from "@/db/schema";
import { jsonError, jsonOk, parseEventPayload, readJson } from "@/lib/api";
import { getStats, listEvents, resolveRegistrationState, uniqueSlug } from "@/lib/data";
import { slugFromName } from "@/lib/api";
import { nowStamp } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listEvents();
  const payload = await Promise.all(
    rows.map(async (event) => {
      const stats = await getStats(event.id);
      const state = resolveRegistrationState(event, stats.confirmed - stats.checkedIn, stats.guestCapacity - stats.guestSpotsLeft);
      return { event, stats, state };
    }),
  );
  return jsonOk({ events: payload });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const { values, errors } = parseEventPayload(body, "create");
  if (errors.length > 0) return jsonError(errors[0], 422, { errors });

  const slug = await uniqueSlug(
    slugFromName(String(values.name ?? "event")),
  );
  const inserted = await db
    .insert(events)
    .values({
      slug,
      name: values.name ?? "Untitled event",
      tagline: values.tagline ?? "",
      description: values.description ?? "",
      category: values.category ?? "Conference",
      venue: values.venue ?? "",
      city: values.city ?? "",
      organizerName: values.organizerName ?? "",
      contactEmail: values.contactEmail ?? "",
      contactPhone: values.contactPhone ?? "",
      startsAt: values.startsAt ?? nowStamp(),
      endsAt: values.endsAt ?? nowStamp(),
      registrationDeadline: values.registrationDeadline ?? nowStamp(),
      capacity: values.capacity ?? 100,
      guestCapacity: values.guestCapacity ?? 0,
      guestsPerRegistration: values.guestsPerRegistration ?? 1,
      allowGuests: values.allowGuests ?? true,
      waitlistEnabled: values.waitlistEnabled ?? true,
      autoCloseWhenFull: values.autoCloseWhenFull ?? true,
      requireCheckIn: values.requireCheckIn ?? true,
      status: values.status ?? "published",
      accent: values.accent ?? "violet",
      updatedAt: nowStamp(),
    })
    .returning();

  return jsonOk({ event: inserted[0] }, { status: 201 });
}
