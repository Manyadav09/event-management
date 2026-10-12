import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Events — everything the organizer fills in ONE single form.
 * All date/time values are stored as local wall-clock strings
 * (YYYY-MM-DD HH:mm:ss) so form inputs and displays match exactly.
 */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("Conference"),
    venue: text("venue").notNull().default(""),
    city: text("city").notNull().default(""),
    organizerName: text("organizer_name").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    startsAt: timestamp("starts_at", { mode: "string" }).notNull(),
    endsAt: timestamp("ends_at", { mode: "string" }).notNull(),
    registrationDeadline: timestamp("registration_deadline", {
      mode: "string",
    }).notNull(),
    capacity: integer("capacity").notNull().default(100),
    guestCapacity: integer("guest_capacity").notNull().default(20),
    guestsPerRegistration: integer("guests_per_registration")
      .notNull()
      .default(1),
    allowGuests: boolean("allow_guests").notNull().default(true),
    waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
    autoCloseWhenFull: boolean("auto_close_when_full").notNull().default(true),
    requireCheckIn: boolean("require_check_in").notNull().default(true),
    // draft | published | closed
    status: text("status").notNull().default("published"),
    registrationManuallyClosed: boolean("registration_manually_closed")
      .notNull()
      .default(false),
    accent: text("accent").notNull().default("violet"),
    createdAt: timestamp("created_at", { mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("events_slug_unique").on(table.slug)],
);

/** Registrations cover both participants (type = participant) and guests. */
export const registrations = pgTable(
  "registrations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketCode: text("ticket_code").notNull(),
    // participant | guest
    type: text("type").notNull().default("participant"),
    // confirmed | waitlisted | cancelled | checked_in
    status: text("status").notNull().default("confirmed"),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    organization: text("organization").notNull().default(""),
    designation: text("designation").notNull().default(""),
    ticketCategory: text("ticket_category").notNull().default("General"),
    notes: text("notes").notNull().default(""),
    guestLabel: text("guest_label").notNull().default(""),
    primaryRegistrationId: integer("primary_registration_id"),
    checkedInAt: timestamp("checked_in_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("registrations_ticket_code_unique").on(table.ticketCode),
    index("registrations_event_idx").on(table.eventId),
  ],
);

/** Every scan / status change is logged so the organizer sees an audit trail. */
export const scanLogs = pgTable("scan_logs", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  registrationId: integer("registration_id").references(
    () => registrations.id,
    { onDelete: "set null" },
  ),
  ticketCode: text("ticket_code").notNull().default(""),
  // check_in | duplicate | rejected | undo
  result: text("result").notNull(),
  message: text("message").notNull().default(""),
  scannedBy: text("scanned_by").notNull().default("gate-device"),
  createdAt: timestamp("created_at", { mode: "string" })
    .notNull()
    .defaultNow(),
});

/** Live updates pushed by the organizer — auto-refreshed on every dashboard. */
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  // info | success | warning | danger
  tone: text("tone").notNull().default("info"),
  createdAt: timestamp("created_at", { mode: "string" })
    .notNull()
    .defaultNow(),
});

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type RegistrationRow = typeof registrations.$inferSelect;
export type NewRegistrationRow = typeof registrations.$inferInsert;
export type ScanLogRow = typeof scanLogs.$inferSelect;
export type AnnouncementRow = typeof announcements.$inferSelect;
