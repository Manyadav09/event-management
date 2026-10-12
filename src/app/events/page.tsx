import Link from "next/link";
import { Card, Chip, EmptyState, Progress, SectionTitle } from "@/components/ui";
import { LiveCountdown } from "@/components/participant/LiveCountdown";
import { getPublicEvent, listEvents } from "@/lib/data";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { OPEN_COPY } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await listEvents();
  const published = await Promise.all(
    events
      .filter((e) => e.status !== "draft")
      .map(async (event) => ({
        event,
        snapshot: await getPublicEvent(event.slug),
      })),
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-cyan-500/15 via-indigo-600/10 to-transparent p-6 sm:p-9">
        <Chip tone="sky">participant side</Chip>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Events open for registration
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          Every card below is generated from the organizer&apos;s single form
          submission and updates itself — seat counts, deadlines and status are
          always current.
        </p>
      </section>

      <SectionTitle
        eyebrow="live inventory"
        title="Pick an event"
        subtitle="Register once, get an instant QR ticket, add guests, and track check-in."
      />

      {published.length === 0 ? (
        <EmptyState
          icon="🎪"
          title="No published events yet"
          body="Once an organizer publishes an event it appears here instantly."
          action={
            <Link href="/organize" className="btn btn-primary mt-3">
              Create the first event
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {published.map(({ event, snapshot }) => {
            const stats = snapshot!.stats;
            const state = snapshot!.state;
            return (
              <Card key={event.id} strong className="flex flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Chip tone={state.open ? "emerald" : "rose"}>
                    {state.open ? "● registration open" : OPEN_COPY[state.reason]}
                  </Chip>
                  <span className="text-xs text-slate-400">{event.category}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">
                  {event.name}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{event.tagline}</p>

                <dl className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-400">
                      Starts
                    </dt>
                    <dd>
                      {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-400">
                      Venue
                    </dt>
                    <dd>
                      {event.venue || "TBA"}
                      {event.city ? `, ${event.city}` : ""}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Registration closes {formatDateTime(event.registrationDeadline)}</span>
                    <span>{formatDate(event.registrationDeadline)}</span>
                  </div>
                  <div className="mt-2">
                    <LiveCountdown target={event.registrationDeadline} compact />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Progress value={stats.participantFill} tone="cyan" />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>
                      {stats.spotsLeft} of {stats.participantCapacity} seats left
                    </span>
                    <span>
                      {event.allowGuests
                        ? `${stats.guestCapacity - stats.guestSpotsLeft} guests joining`
                        : "no guests"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/e/${event.slug}`} className="btn btn-primary flex-1">
                    {state.open ? "Register now" : "View event"}
                  </Link>
                  <Link href={`/organizer/${event.slug}`} className="btn btn-ghost btn-sm">
                    Organizer view
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
