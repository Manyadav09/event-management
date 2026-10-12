export type RegistrationType = "participant" | "guest";
export type RegistrationStatus =
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "checked_in";
export type EventStatus = "draft" | "published" | "closed";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** DB stores "YYYY-MM-DD HH:mm:ss" (local wall clock). */
export function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.trim().replace(" ", "T");
  return normalized.slice(0, 16);
}

function parts(value: string) {
  const iso = value.trim().replace(" ", "T");
  const m = iso.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };
}

/** Format a wall-clock DB timestamp without any timezone shifting. */
export function formatDate(value: string | null | undefined): string {
  const p = value ? parts(value) : null;
  if (!p) return "—";
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

export function formatTime(value: string | null | undefined): string {
  const p = value ? parts(value) : null;
  if (!p) return "—";
  const h = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const suffix = p.hour < 12 ? "AM" : "PM";
  return `${h}:${String(p.minute).padStart(2, "0")} ${suffix}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function formatStamp(value: string | null | undefined): string {
  if (!value) return "—";
  return formatDateTime(value);
}

/** Local-time Date from a wall-clock string — safe for countdowns in browser. */
export function localDate(value: string | null | undefined): Date | null {
  const p = value ? parts(value) : null;
  if (!p) return null;
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0);
}

export function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export type Countdown = {
  label: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  past: boolean;
};

export function countdownFrom(
  target: string | null | undefined,
  from: Date = new Date(),
): Countdown {
  const end = localDate(target);
  if (!end) {
    return { label: "—", days: 0, hours: 0, minutes: 0, seconds: 0, past: false };
  }
  const diff = end.getTime() - from.getTime();
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);
  const chunk = `${days}d ${String(hours).padStart(2, "0")}h ${String(
    minutes,
  ).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  return {
    label: diff >= 0 ? chunk : `${chunk} ago`,
    days,
    hours,
    minutes,
    seconds,
    past: diff < 0,
  };
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "event"
  );
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeTicketCode(prefix = "TCK"): string {
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${prefix}-${out}`;
}

/** Accepts a raw code, a full URL, or JSON-ish QR payloads. */
export function extractTicketCode(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const codeLike = value.match(/[A-Za-z]{2,5}-[A-Z0-9]{4,10}/);
  if (codeLike) return codeLike[0].toUpperCase();
  const segments = value.split(/[/?#]/).filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  return last.toUpperCase();
}

export const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  checked_in: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  waitlisted: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  cancelled: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  published: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  draft: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  closed: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export function statusLabel(status: string): string {
  return status === "checked_in"
    ? "Checked in"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export function statusTone(status: string): string {
  switch (status) {
    case "confirmed":
      return "text-emerald-300";
    case "checked_in":
      return "text-sky-300";
    case "waitlisted":
      return "text-amber-300";
    case "cancelled":
      return "text-rose-300";
    default:
      return "text-slate-300";
  }
}
