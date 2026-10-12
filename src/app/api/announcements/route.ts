import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getEventBySlug, listAnnouncements } from "@/lib/data";
import { nowStamp } from "@/lib/format";

export const dynamic = "force-dynamic";

const TONES = new Set(["info", "success", "warning", "danger"]);

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return jsonError("slug is required", 422);
  const event = await getEventBySlug(slug);
  if (!event) return jsonError("Event not found", 404);
  const rows = await listAnnouncements(event.id, 20);
  return jsonOk({ announcements: rows });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const slug = String(body.slug ?? "");
  const title = String(body.title ?? "").trim();
  if (!slug) return jsonError("slug is required", 422);
  if (title.length < 3) return jsonError("Give the update a title.", 422);
  const event = await getEventBySlug(slug);
  if (!event) return jsonError("Event not found", 404);
  const tone = String(body.tone ?? "info");
  const inserted = await db
    .insert(announcements)
    .values({
      eventId: event.id,
      title,
      body: String(body.body ?? "").trim(),
      tone: TONES.has(tone) ? tone : "info",
      createdAt: nowStamp(),
    })
    .returning();
  return jsonOk({ announcement: inserted[0] }, { status: 201 });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number.parseInt(url.searchParams.get("id") ?? "", 10);
  const slug = url.searchParams.get("slug") ?? "";
  if (!Number.isFinite(id) || !slug) return jsonError("id and slug are required", 422);
  const event = await getEventBySlug(slug);
  if (!event) return jsonError("Event not found", 404);
  await db
    .delete(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.eventId, event.id)));
  return jsonOk({ deleted: id });
}
