import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`${strong ? "glass-strong" : "glass"} card ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-violet-300/80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

export function Chip({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: "slate" | "violet" | "emerald" | "amber" | "rose" | "sky";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-300 bg-slate-400/10",
    violet: "text-violet-300 bg-violet-500/12",
    emerald: "text-emerald-300 bg-emerald-500/12",
    amber: "text-amber-300 bg-amber-500/12",
    rose: "text-rose-300 bg-rose-500/12",
    sky: "text-sky-300 bg-sky-500/12",
  };
  return (
    <span
      className={`chip ${tones[tone]} ${className}`}
      style={{ boxShadow: "inset 0 0 0 1px currentColor" }}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = "violet",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "violet" | "cyan" | "emerald" | "amber" | "rose";
  icon?: ReactNode;
}) {
  const glow: Record<string, string> = {
    violet: "from-violet-500/25",
    cyan: "from-cyan-500/25",
    emerald: "from-emerald-500/25",
    amber: "from-amber-500/25",
    rose: "from-rose-500/25",
  };
  return (
    <div className="glass card relative overflow-hidden p-4">
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${glow[accent]} to-transparent blur-2xl`}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        {icon ? <span className="text-base leading-none">{icon}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function Progress({
  value,
  tone = "violet",
}: {
  value: number;
  tone?: "violet" | "cyan" | "emerald" | "amber";
}) {
  const tones: Record<string, string> = {
    violet: "from-violet-500 to-indigo-400",
    cyan: "from-cyan-400 to-sky-500",
    emerald: "from-emerald-400 to-teal-400",
    amber: "from-amber-400 to-orange-400",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${tones[tone]} transition-all duration-700`}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon = "📭",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="font-medium text-slate-200">{title}</p>
      {body ? <p className="max-w-sm text-sm text-slate-400">{body}</p> : null}
      {action}
    </div>
  );
}

export function Toast({
  tone,
  title,
  body,
  onClose,
}: {
  tone: "success" | "warn" | "danger" | "info";
  title: string;
  body?: string;
  onClose?: () => void;
}) {
  const tones: Record<string, string> = {
    success: "border-emerald-400/40 bg-emerald-500/12 text-emerald-100",
    warn: "border-amber-400/40 bg-amber-500/12 text-amber-100",
    danger: "border-rose-400/40 bg-rose-500/12 text-rose-100",
    info: "border-sky-400/40 bg-sky-500/12 text-sky-100",
  };
  const icons: Record<string, string> = {
    success: "✅",
    warn: "⚠️",
    danger: "⛔",
    info: "ℹ️",
  };
  return (
    <div
      className={`animate-[pop_0.35s_cubic-bezier(0.22,1,0.36,1)_both] flex items-start gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md ${tones[tone]}`}
    >
      <span className="text-lg leading-none">{icons[tone]}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {body ? <p className="text-xs opacity-85">{body}</p> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="text-xs opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}

export function LiveDot({ live = true }: { live?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {live ? (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
      ) : null}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          live ? "bg-emerald-400" : "bg-rose-400"
        }`}
      />
    </span>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  return (
    <Link href={href} className={`btn btn-${variant} ${className}`}>
      {children}
    </Link>
  );
}
