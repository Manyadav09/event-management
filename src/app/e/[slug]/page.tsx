import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  Chip,
  EmptyState,
  Progress,
  SectionTitle,
  StatTile,
} from "@/components/ui";
import {
  RegistrationGate,
  TicketLookup,
} from "@/components/participant/RegistrationGate";
import { LiveCountdown } from "@/components/participant/LiveCountdown";
import { getPublicEvent } from "@/lib/data";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { OPEN_COPY } from "@/lib/types";

export const dynamic = "force-dynamic";

const TONE_STYLES: Record<string, string> = {
  info: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  danger: "border-rose-400/30 bg-rose-500/10 text-rose-100",
};

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const snapshot = await getPublicEvent(slug);
  if (!snapshot || snapshot.event.status === "draft") notFound();

  const { event, stats, state, announcements } = snapshot;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 p-6 sm:p-9">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/images/hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05060f] via-[#05060f]/90 to-indigo-950/70" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="violet">{event.category}</Chip>
            <Chip tone={state.open ? "emerald" : "rose"}>
              {OPEN_COPY[state.reason] ?? state.reason}
            </Chip>
            {event.status !== "published" ? (
              <Chip tone="amber">status: {event.status}</Chip>
            ) : null}
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {event.name}
          </h1>
          {event.tagline ? (
            <p className="mt-3 max-w-2xl text-base text-slate-300">
              {event.tagline}
            </p>
          ) : null}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <InfoTile icon="📅" label="Date" value={formatDate(event.startsAt)} />
            <InfoTile
              icon="🕘"
              label="Time"
              value={`${formatTime(event.startsAt)} – ${formatTime(event.endsAt)}`}
            />
            <InfoTile
              icon="📍"
              label="Venue"
              value={`${event.venue || "TBA"}${event.city ? `, ${event.city}` : ""}`}
            />
          </div>
          {event.description ? (
            <p className="mt-6 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-slate-300">
              {event.description}
            </p>
          ) : null}
          <div className="mt-7 flex flex-wrap gap-2 text-sm">
            <Link href="#register" className="btn btn-primary">
              {state.open ? "🎟️ Register now" : "🔒 Registration closed"}
            </Link>
            <Link href={`/organizer/${event.slug}/scan`} className="btn btn-ghost">
              📷 Gate console
            </Link>
            <Link href="/events" className="btn btn-ghost">
              All events
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Seats left"
          value={stats.spotsLeft}
          hint={`of ${stats.participantCapacity} participant seats`}
          accent="cyan"
          icon="🪑"
        />
        <StatTile
          label="Registered"
          value={stats.total}
          hint={`${stats.participants} participants · ${stats.guests} guests`}
          accent="violet"
          icon="👥"
        />
        <StatTile
          label="Guest spots"
          value={event.allowGuests ? stats.guestSpotsLeft : "—"}
          hint={event.allowGuests ? `of ${stats.guestCapacity} guest seats` : "guests disabled"}
          accent="emerald"
          icon="🧑‍🤝‍🧑"
        />
        <StatTile
          label="Waitlist"
          value={stats.waitlisted}
          hint={event.waitlistEnabled ? "auto promotion on" : "waitlist off"}
          accent="amber"
          icon="⏳"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" id="register">
        <div className="space-y-6">
          {event.status === "published" ? (
            <RegistrationGate initial={snapshot} />
          ) : (
            <Card strong className="p-6">
              <h3 className="text-lg font-semibold text-white">
                Registration is not available
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                This event is currently <strong>{event.status}</strong>. Please
                contact the organizer.
              </p>
            </Card>
          )}

          <Card className="p-5">
            <SectionTitle
              eyebrow="live updates"
              title="Announcements from the organizer"
            />
            {announcements.length === 0 ? (
              <EmptyState
                icon="📣"
                title="No updates yet"
                body="Schedule changes and gate info appear here automatically."
              />
            ) : (
              <ul className="space-y-3">
                {announcements.map((a) => (
                  <li
                    key={a.id}
                    className={`rounded-2xl border px-4 py-3 ${TONE_STYLES[a.tone] ?? TONE_STYLES.info}`}
                  >
                    <p className="text-sm font-semibold">{a.title}</p>
                    {a.body ? <p className="mt-1 text-xs opacity-90">{a.body}</p> : null}
                    <p className="mt-2 text-[0.68rem] opacity-70">
                      {formatDateTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card strong className="p-5">
            <h3 className="font-semibold text-white">Registration window</h3>
            <div className="mt-4">
              <LiveCountdown target={event.registrationDeadline} label="closes in" />
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <Row label="Deadline" value={formatDateTime(event.registrationDeadline)} />
              <Row label="Event starts" value={formatDateTime(event.startsAt)} />
              <Row label="Event ends" value={formatDateTime(event.endsAt)} />
              <Row label="Guests per pass" value={String(event.guestsPerRegistration)} />
              <Row
                label="Waitlist"
                value={event.waitlistEnabled ? "Enabled" : "Disabled"}
              />
            </div>
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Participant quota</span>
                <span>{stats.participantFill}%</span>
              </div>
              <Progress value={stats.participantFill} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-white">Already registered?</h3>
            <p className="mt-1 text-sm text-slate-400">
              Open your participant dashboard to view the QR ticket, add guests
              and see check-in status.
            </p>
            <div className="mt-4">
              <TicketLookup slug={event.slug} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-white">Organized by</h3>
            <p className="mt-2 text-sm text-slate-300">
              {event.organizerName || "EventPulse organizer"}
            </p>
            {event.contactEmail ? (
              <p className="mt-1 text-sm text-slate-400">{event.contactEmail}</p>
            ) : null}
            {event.contactPhone ? (
              <p className="text-sm text-slate-400">{event.contactPhone}</p>
            ) : null}
            <Link
              href={`/organizer/${event.slug}`}
              className="btn btn-ghost btn-sm mt-4"
            >
              Open organizer dashboard
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
      <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/6 pb-2 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}
