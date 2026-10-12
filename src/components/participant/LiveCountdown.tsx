"use client";

import { useNow } from "@/hooks/usePoll";
import { countdownFrom } from "@/lib/format";

export function LiveCountdown({
  target,
  compact = false,
  label,
}: {
  target: string;
  compact?: boolean;
  label?: string;
}) {
  const now = useNow(1000);
  const c = countdownFrom(target, now);
  const expired = c.past;

  if (compact) {
    return (
      <p
        className={`font-mono text-sm font-semibold ${
          expired ? "text-rose-300" : "text-emerald-300"
        }`}
      >
        {expired ? "closed " : "closes in "}
        {c.label}
      </p>
    );
  }

  const blocks = [
    { value: c.days, unit: "days" },
    { value: c.hours, unit: "hrs" },
    { value: c.minutes, unit: "min" },
    { value: c.seconds, unit: "sec" },
  ];

  return (
    <div>
      {label ? (
        <p className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
      ) : null}
      <div className="grid grid-cols-4 gap-2">
        {blocks.map((b) => (
          <div
            key={b.unit}
            className={`rounded-xl border p-2 text-center ${
              expired
                ? "border-rose-400/30 bg-rose-500/10"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <p className="text-xl font-semibold tabular-nums text-white">
              {String(b.value).padStart(2, "0")}
            </p>
            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
              {b.unit}
            </p>
          </div>
        ))}
      </div>
      <p
        className={`mt-2 text-center text-xs ${
          expired ? "text-rose-300" : "text-emerald-300"
        }`}
      >
        {expired ? "Deadline passed — registration locked" : "until registration closes"}
      </p>
    </div>
  );
}
