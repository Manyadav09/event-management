import { jsonOk } from "@/lib/api";
import { getEventBySlug, listRegistrations } from "@/lib/data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

const HEADERS = [
  "ticket_code",
  "type",
  "status",
  "full_name",
  "email",
  "phone",
  "organization",
  "designation",
  "category",
  "guest_label",
  "checked_in_at",
  "registered_at",
];

function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "all";
  const status = url.searchParams.get("status") ?? "all";
  const q = url.searchParams.get("q") ?? "";
  const rows = await listRegistrations(event.id, { type, status, q, limit: 5000 });

  if (url.searchParams.get("format") === "csv") {
    const lines = [HEADERS.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.ticketCode,
          r.type,
          r.status,
          r.fullName,
          r.email,
          r.phone,
          r.organization,
          r.designation,
          r.ticketCategory,
          r.guestLabel,
          r.checkedInAt ?? "",
          r.createdAt ?? "",
        ]
          .map(csvCell)
          .join(","),
      );
    }
    return new Response(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${slug}-registrations.csv"`,
      },
    });
  }

  return jsonOk({ registrations: rows, count: rows.length });
}
