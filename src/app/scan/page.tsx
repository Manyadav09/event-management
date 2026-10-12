import Link from "next/link";
import { Card, Chip, EmptyState, SectionTitle } from "@/components/ui";
import { getStats, listEvents } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ScanHubPage() {
  const events = await listEvents();

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-emerald-500/15 via-teal-600/10 to-transparent p-6 sm:p-9">
        <Chip tone="emerald">gate mode</Chip>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          QR ticket scanning system
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          Pick the event running at the door. The console reads QR codes from a
          device camera or typed codes, blocks duplicates, rejects cancelled and
          waitlisted tickets, and pushes every result into the live dashboards.
        </p>
      </section>

      <SectionTitle
        eyebrow="step 1"
        title="Choose the event you are checking in"
        subtitle="Each gate keeps its own scan log and live counters."
      />

      {events.length === 0 ? (
        <EmptyState
          icon="📷"
          title="No events to scan yet"
          body="Create an event first — tickets generated from registrations can then be scanned here."
          action={
            <Link href="/organize" className="btn btn-primary mt-3">
              Create event
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {await Promise.all(
            events.map(async (event) => {
              const stats = await getStats(event.id);
              return (
                <Card key={event.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <Chip tone="violet">{event.category}</Chip>
                    <span className="text-xs text-slate-500">
                      {stats.checkedIn}/{stats.confirmed} in
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-white">
                    {event.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(event.startsAt)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/organizer/${event.slug}/scan`}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      📷 Scan tickets
                    </Link>
                    <Link
                      href={`/organizer/${event.slug}`}
                      className="btn btn-ghost btn-sm"
                    >
                      Dashboard
                    </Link>
                  </div>
                </Card>
              );
            }),
          )}
        </div>
      )}
    </div>
  );
}
