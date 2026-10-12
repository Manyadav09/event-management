import Link from "next/link";
import EventSetupForm from "@/components/organizer/EventSetupForm";
import { Card, Chip, Progress, SectionTitle } from "@/components/ui";
import { getStats, listEvents, resolveRegistrationState } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrganizePage() {
  const events = await listEvents();
  const stats = await Promise.all(events.map((event) => getStats(event.id)));

  return (
    <div className="space-y-10">
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-violet-600/20 via-indigo-700/10 to-transparent p-6 sm:p-9">
        <Chip tone="violet">organizer studio</Chip>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Fill your event information one time
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          Submit the form below once — EventPulse then publishes the public
          event page, opens registration, generates QR tickets and keeps both
          dashboards updated automatically. Need a change later? Edit the same
          form and every page refreshes itself.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
            1 · Fill details
          </span>
          <span className="text-slate-500">→</span>
          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
            2 · Publish live page
          </span>
          <span className="text-slate-500">→</span>
          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
            3 · Collect registrations &amp; guests
          </span>
          <span className="text-slate-500">→</span>
          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
            4 · Scan QR at gate
          </span>
        </div>
      </section>

      {events.length > 0 ? (
        <section>
          <SectionTitle
            eyebrow="your events"
            title="Manage existing events"
            subtitle="Open a live dashboard to watch registrations, guests and check-ins."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => {
              const s = stats[i];
              const state = resolveRegistrationState(
                event,
                s.confirmed - s.checkedIn,
                s.guestCapacity - s.guestSpotsLeft,
              );
              return (
                <Card key={event.id} className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Chip tone={state.open ? "emerald" : "rose"}>
                      {state.open ? "registration open" : state.reason.replace("_", " ")}
                    </Chip>
                    <span className="text-xs text-slate-500">{event.category}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-white">
                    {event.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(event.startsAt)} · {event.venue || "Venue TBA"}
                  </p>
                  <div className="mt-4 space-y-2">
                    <Progress value={s.participantFill} />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>
                        {s.participants + s.guests} records · {s.guests} guests
                      </span>
                      <span>{s.checkedIn} in</span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={`/organizer/${event.slug}`}
                      className="btn btn-primary btn-sm"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href={`/organizer/${event.slug}/scan`}
                      className="btn btn-ghost btn-sm"
                    >
                      Scan
                    </Link>
                  </div>
                  <p className="mt-3 text-[0.7rem] text-slate-500">
                    Deadline {formatDate(event.registrationDeadline)}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <SectionTitle
          eyebrow="one-time setup"
          title="Create a new event"
          subtitle="Everything the organizer controls lives in this single form."
        />
        <EventSetupForm />
      </section>
    </div>
  );
}
