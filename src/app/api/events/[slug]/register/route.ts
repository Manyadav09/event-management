import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getEventBySlug, getStats } from "@/lib/data";
import { createRegistration, type RegisterInput } from "@/lib/registration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return jsonError("Event not found", 404);
  if (event.status === "draft") {
    return jsonError("Registration has not opened yet.", 409);
  }

  const body = await readJson(request);
  const result = await createRegistration(event, body as RegisterInput);
  if (!result.ok) return jsonError(result.error, result.status ?? 422);

  const stats = await getStats(event.id);
  return jsonOk(
    {
      registration: result.primary,
      guests: result.guests,
      waitlisted: result.waitlisted,
      guestsWaitlisted: result.guestsWaitlisted,
      stats,
    },
    { status: 201 },
  );
}
