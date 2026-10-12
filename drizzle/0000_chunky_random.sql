CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"tone" text DEFAULT 'info' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Conference' NOT NULL,
	"venue" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"organizer_name" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"registration_deadline" timestamp NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"guest_capacity" integer DEFAULT 20 NOT NULL,
	"guests_per_registration" integer DEFAULT 1 NOT NULL,
	"allow_guests" boolean DEFAULT true NOT NULL,
	"waitlist_enabled" boolean DEFAULT true NOT NULL,
	"auto_close_when_full" boolean DEFAULT true NOT NULL,
	"require_check_in" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"registration_manually_closed" boolean DEFAULT false NOT NULL,
	"accent" text DEFAULT 'violet' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"ticket_code" text NOT NULL,
	"type" text DEFAULT 'participant' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"full_name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"organization" text DEFAULT '' NOT NULL,
	"designation" text DEFAULT '' NOT NULL,
	"ticket_category" text DEFAULT 'General' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"guest_label" text DEFAULT '' NOT NULL,
	"primary_registration_id" integer,
	"checked_in_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"registration_id" integer,
	"ticket_code" text DEFAULT '' NOT NULL,
	"result" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"scanned_by" text DEFAULT 'gate-device' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_unique" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_ticket_code_unique" ON "registrations" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "registrations_event_idx" ON "registrations" USING btree ("event_id");