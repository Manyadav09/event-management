import Link from "next/link";
import { Card, Chip, Progress, StatTile } from "@/components/ui";
import { getStats, listEvents, resolveRegistrationState } from "@/lib/data";
import { formatDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const FLOW = [
  {
    step: "01",
    title: "Organizer fills one form",
    body: "Event name, venue, date & time, capacity, guest quota and the registration deadline — a single setup, saved instantly.",
    href: "/organize",
    cta: "Open organizer form",
    tone: "from-violet-500/20",
  },
  {
    step: "02",
    title: "Site updates itself",
    body: "The public page, participant dashboards and organizer metrics poll the live database — no rebuild, no refresh needed.",
    href: "/events",
    cta: "See live events",
    tone: "from-indigo-500/20",
  },
  {
    step: "03",
    title: "Participants register",
    body: "One tap registration with optional guests. A QR ticket is issued instantly with confirmed / waitlisted status.",
    href: "/events",
    cta: "Register now",
    tone: "from-cyan-500/20",
  },
  {
    step: "04",
    title: "Deadline closes the gate",
    body: "The countdown hits zero, the form locks automatically, and the organizer can close or extend it at any time.",
    href: "/events",
    cta: "View deadlines",
    tone: "from-sky-500/20",
  },
  {
    step: "05",
    title: "Scan QR at the door",
    body: "Camera scanner validates every ticket, blocks duplicates, and pushes live check-in counts into both dashboards.",
    href: "/scan",
    cta: "Try the scanner",
    tone: "from-emerald-500/20",
  },
];

const ORGANIZER_FEATURES = [
  ["📝", "One-time setup form", "Everything about the event in a single submission."],
  ["📊", "Auto-refreshing metrics", "Counts, fill % and scan rate update every few seconds."],
  ["🗂️", "Registration records", "Search, filter, export CSV, approve or cancel."],
  ["📷", "QR gate scanner", "Camera or manual code entry with duplicate blocking."],
  ["🧑‍🤝‍🧑", "Guest section", "Separate guest quota, labels and guest check-ins."],
  ["⏱️", "Deadline control", "Extend, close early, reopen — reflected instantly."],
  ["📣", "Live announcements", "Broadcast schedule changes to every attendee."],
];

const PARTICIPANT_FEATURES = [
  ["🎟️", "QR ticket wallet", "Digital pass with status, category and guest passes."],
  ["⏳", "Live countdown", "See exactly when registration closes."],
  ["➕", "Add guests", "Add extra guests while the window is open."],
  ["🔔", "Live updates", "Organizer announcements appear in real time."],
  ["✅", "Check-in status", "Know the moment your QR is scanned at the gate."],
  ["❌", "Cancel or rejoin", "Cancel to free a seat for the waitlist."],
];

export default async function HomePage() {
  const events = await listEvents();
  const featured = events[0] ?? null;
  const totals = await Promise.all(
    events.map((event) => getStats(event.id)),
  );
  const sum = totals.reduce(
    (acc, s) => {
      acc.registrations += s.total;
      acc.checkedIn += s.checkedIn;
      acc.capacity += s.totalCapacity;
      return acc;
    },
    { registrations: 0, checkedIn: 0, capacity: 0 },
  );
  const featuredStats = featured ? totals[0] : null;
  const featuredState = featured
    ? resolveRegistrationState(
        featured,
        featuredStats!.confirmed - featuredStats!.checkedIn,
        featuredStats!.guestCapacity - featuredStats!.guestSpotsLeft,
      )
    : null;

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#05060f]/95 via-[#05060f]/80 to-violet-950/60" />
        <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-14">
          <div className="animate-fade-up">
            <Chip tone="violet">⚡ live event operations platform</Chip>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              One form.
              <br />
              Two live dashboards.
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                Zero manual work.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              EventPulse turns a single organizer submission into a fully live
              event hub — public registration, guest management, deadline
              auto-closing, QR tickets and gate scanning, all synced across the
              organizer and participant dashboards in real time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/organize" className="btn btn-primary">
                🚀 Set up your event
              </Link>
              <Link href="/events" className="btn btn-ghost">
                🎟️ Join an event
              </Link>
              <Link href="/scan" className="btn btn-ghost">
                📷 Open gate scanner
              </Link>
            </div>
            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4">
              <div>
                <dt className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-400">
                  Registrations
                </dt>
                <dd className="text-2xl font-semibold text-white">
                  {sum.registrations}
                </dd>
              </div>
              <div>
                <dt className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-400">
                  Checked in
                </dt>
                <dd className="text-2xl font-semibold text-white">
                  {sum.checkedIn}
                </dd>
              </div>
              <div>
                <dt className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-400">
                  Seats offered
                </dt>
                <dd className="text-2xl font-semibold text-white">
                  {sum.capacity}
                </dd>
              </div>
            </dl>
          </div>

          {featured ? (
            <Card strong className="animate-fade-up p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <Chip tone="emerald">featured event</Chip>
                <span className="text-xs text-slate-400">
                  {featuredState?.open ? "🟢 registering" : "🔒 closed"}
                </span>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-white">
                {featured.name}
              </h3>
              <p className="mt-1 text-sm text-slate-400">{featured.tagline}</p>
              <div className="mt-4 space-y-1.5 text-sm text-slate-300">
                <p>📅 {formatDate(featured.startsAt)} · {formatTime(featured.startsAt)}</p>
                <p>📍 {featured.venue || "Venue TBA"}{featured.city ? `, ${featured.city}` : ""}</p>
                <p>⏰ Deadline {formatDate(featured.registrationDeadline)}</p>
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Seats filled</span>
                  <span>
                    {featuredStats!.participantCapacity - featuredStats!.spotsLeft}/
                    {featuredStats!.participantCapacity}
                  </span>
                </div>
                <Progress value={featuredStats!.participantFill} />
              </div>
              <div className="mt-5 flex gap-2">
                <Link
                  href={`/e/${featured.slug}`}
                  className="btn btn-primary flex-1"
                >
                  View & register
                </Link>
                <Link
                  href={`/organizer/${featured.slug}`}
                  className="btn btn-ghost"
                >
                  Organizer
                </Link>
              </div>
            </Card>
          ) : (
            <Card strong className="animate-fade-up p-6">
              <h3 className="text-lg font-semibold text-white">
                No events yet
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Fill the organizer form once and this space becomes your live
                event hub instantly.
              </p>
              <Link href="/organize" className="btn btn-primary mt-5">
                Create the first event
              </Link>
            </Card>
          )}
        </div>
      </section>

      {/* Flow */}
      <section id="flow">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-violet-300/80">
            the flow
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How the website moves
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Five clear steps from organizer setup to a scanned QR at the door.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FLOW.map((item) => (
            <Card key={item.step} className="relative overflow-hidden p-5">
              <div
                className={`pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${item.tone} to-transparent blur-2xl`}
              />
              <span className="text-xs font-black tracking-[0.2em] text-violet-300/70">
                {item.step}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {item.body}
              </p>
              <Link
                href={item.href}
                className="mt-4 inline-flex text-sm font-medium text-violet-300 hover:text-violet-200"
              >
                {item.cta} →
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Dashboards */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Card strong className="p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-xl">
              🎛️
            </span>
            <div>
              <Chip tone="violet">dashboard 01</Chip>
              <h3 className="mt-1 text-xl font-semibold text-white">
                Organizer dashboard
              </h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Built for the person running the show: fill information once, then
            watch registrations, guests and check-ins update themselves.
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {ORGANIZER_FEATURES.map(([icon, title, body]) => (
              <li key={title} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-sm font-medium text-white">
                  {icon} {title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/organize" className="btn btn-primary">
              Setup / manage
            </Link>
            <Link href={featured ? `/organizer/${featured.slug}` : "/events"} className="btn btn-ghost">
              Live dashboard
            </Link>
          </div>
        </Card>

        <Card strong className="p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-400 text-xl">
              🎟️
            </span>
            <div>
              <Chip tone="sky">dashboard 02</Chip>
              <h3 className="mt-1 text-xl font-semibold text-white">
                Participant dashboard
              </h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            What every attendee sees: their QR ticket, live status, guests under
            their pass and organizer updates as they happen.
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {PARTICIPANT_FEATURES.map(([icon, title, body]) => (
              <li key={title} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-sm font-medium text-white">
                  {icon} {title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/events" className="btn btn-primary">
              Register for an event
            </Link>
            <Link href="/ticket/TCK-7KQ4XM" className="btn btn-ghost">
              Sample ticket view
            </Link>
          </div>
        </Card>
      </section>

      {/* Live events strip */}
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              auto-updating
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Live events board
            </h2>
          </div>
          <Link href="/events" className="btn btn-ghost btn-sm">
            All events →
          </Link>
        </div>
        {events.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-400">
            Nothing published yet —{" "}
            <Link href="/organize" className="link-underline text-violet-300">
              create the first event
            </Link>
            .
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.slice(0, 6).map((event, i) => {
              const stats = totals[i];
              const state = resolveRegistrationState(
                event,
                stats.confirmed - stats.checkedIn,
                stats.guestCapacity - stats.guestSpotsLeft,
              );
              return (
                <Card key={event.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <Chip tone={state.open ? "emerald" : "rose"}>
                      {state.open ? "open" : state.reason}
                    </Chip>
                    <span className="text-xs text-slate-500">
                      {stats.total} registered
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">
                    {event.name}
                  </h3>
                  <p className="text-sm text-slate-400">{event.category}</p>
                  <div className="mt-4 space-y-2">
                    <Progress value={stats.participantFill} tone="cyan" />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{stats.spotsLeft} seats left</span>
                      <span>{stats.checkedIn} checked in</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/e/${event.slug}`} className="btn btn-ghost btn-sm flex-1">
                      Register
                    </Link>
                    <Link
                      href={`/organizer/${event.slug}`}
                      className="btn btn-ghost btn-sm"
                    >
                      Stats
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Trust strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Setup time" value="1 form" hint="No repeating steps" accent="violet" icon="⚡" />
        <StatTile label="Live refresh" value="5s" hint="Auto-updating dashboards" accent="cyan" icon="🔄" />
        <StatTile label="Scan modes" value="2" hint="Camera + manual code" accent="emerald" icon="📷" />
        <StatTile label="Deadline guard" value="Auto" hint="Closes itself on time" accent="amber" icon="⏱️" />
      </section>
    </div>
  );
}
