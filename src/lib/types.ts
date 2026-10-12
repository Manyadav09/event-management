import type {
  AnnouncementRow,
  EventRow,
  RegistrationRow,
  ScanLogRow,
} from "@/db/schema";
import type { EventStats, RegistrationOpenState } from "@/lib/data";

export type {
  AnnouncementRow,
  EventRow,
  RegistrationRow,
  ScanLogRow,
  EventStats,
  RegistrationOpenState,
};

export type LiveSnapshot = {
  event: EventRow;
  stats: EventStats;
  recent: RegistrationRow[];
  scans: ScanLogRow[];
  announcements: AnnouncementRow[];
  state: RegistrationOpenState;
};

export type PublicSnapshot = {
  event: EventRow;
  stats: EventStats;
  state: RegistrationOpenState;
  announcements: AnnouncementRow[];
};

export type TicketSnapshot = {
  registration: RegistrationRow;
  event: EventRow;
  guests: RegistrationRow[];
  stats: EventStats;
  state: RegistrationOpenState;
};

export const OPEN_COPY: Record<string, string> = {
  open: "Registration is live",
  draft: "Draft — not visible to the public",
  closed: "Registration permanently closed",
  manual: "Closed early by organizer",
  deadline: "Deadline passed — form locked",
  full: "Event full — waitlist off",
  ended: "Event finished",
};
