-- Idempotent demo seed for EventPulse
DO $$
DECLARE
  ev_id int;
  ev2_id int;
  reg_id int;
BEGIN
  IF EXISTS (SELECT 1 FROM events WHERE slug = 'tech-summit-2026') THEN
    RETURN;
  END IF;

  INSERT INTO events (
    slug, name, tagline, description, category, venue, city,
    organizer_name, contact_email, contact_phone,
    starts_at, ends_at, registration_deadline,
    capacity, guest_capacity, guests_per_registration,
    allow_guests, waitlist_enabled, auto_close_when_full, require_check_in,
    status, accent
  ) VALUES (
    'tech-summit-2026',
    'Annual Tech Summit 2026',
    'Where builders, designers and founders meet the next decade',
    E'Join 150 builders for a full day of deep-dive talks, live demos and hands-on labs.\n\n• 09:30 — Registration & badge pickup (QR scan at Gate A)\n• 10:30 — Keynote: Shipping AI products responsibly\n• 12:00 — Lightning talks + lunch\n• 14:00 — Hands-on lab: agents in production\n• 16:30 — Founder panel & networking\n\nRegistration closes automatically at the deadline shown on this page. Every confirmed attendee receives a QR ticket instantly.',
    'Conference', 'Innovation Hall A', 'Bengaluru',
    'DevRel Collective', 'hello@devrel.dev', '+91 90000 12345',
    to_char(now() + interval '9 days', 'YYYY-MM-DD 09:30:00')::timestamp,
    to_char(now() + interval '9 days', 'YYYY-MM-DD 18:00:00')::timestamp,
    to_char(now() + interval '4 days', 'YYYY-MM-DD 23:59:00')::timestamp,
    150, 30, 2,
    true, true, true, true,
    'published', 'violet'
  ) RETURNING id INTO ev_id;

  INSERT INTO announcements (event_id, title, body, tone) VALUES
    (ev_id, 'Gate A opens at 09:00', 'Keep your QR ticket ready — badges are printed at the desk.', 'info'),
    (ev_id, 'Hands-on lab seats are limited', 'Lab access is first-come, first-served for checked-in attendees.', 'warning');

  -- participants
  INSERT INTO registrations (event_id, ticket_code, type, status, full_name, email, phone, organization, designation, ticket_category, checked_in_at, created_at)
  VALUES
    (ev_id, 'TCK-7KQ4XM', 'participant', 'checked_in', 'Aarav Sharma', 'aarav@acme.dev', '+91 98111 22331', 'Acme Labs', 'Frontend engineer', 'Professional', to_char(now() - interval '2 hours', 'YYYY-MM-DD HH24:MI:SS')::timestamp, to_char(now() - interval '3 days', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-3PZN8R', 'participant', 'checked_in', 'Diya Menon', 'diya@northwind.io', '+91 98220 11445', 'Northwind', 'Product designer', 'Professional', to_char(now() - interval '1 hour', 'YYYY-MM-DD HH24:MI:SS')::timestamp, to_char(now() - interval '3 days', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-9HDT2W', 'participant', 'checked_in', 'Kabir Nair', 'kabir@stackly.co', '+91 99330 55621', 'Stackly', 'CTO', 'Speaker', to_char(now() - interval '40 minutes', 'YYYY-MM-DD HH24:MI:SS')::timestamp, to_char(now() - interval '2 days', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-5XLB6V', 'participant', 'confirmed', 'Meera Iyer', 'meera@iitg.ac.in', '+91 90123 77889', 'IIT Guwahati', 'Research scholar', 'Student', NULL, to_char(now() - interval '2 days', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-8WQC1J', 'participant', 'confirmed', 'Rohan Verma', 'rohan@pixelforge.in', '+91 98765 43210', 'Pixelforge', 'Engineering manager', 'Professional', NULL, to_char(now() - interval '1 day', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-2FYM7B', 'participant', 'confirmed', 'Sara Fernandes', 'sara@lumen.ai', '+91 97654 32109', 'Lumen AI', 'ML engineer', 'Professional', NULL, to_char(now() - interval '1 day', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-6RTD4N', 'participant', 'confirmed', 'Aditya Rao', 'aditya@builderhub.dev', '+91 90909 12121', 'BuilderHub', 'Founder', 'VIP', NULL, to_char(now() - interval '20 hours', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-4KJP9L', 'participant', 'confirmed', 'Nisha Kapoor', 'nisha@dailytech.news', '+91 91234 55667', 'DailyTech', 'Correspondent', 'Press', NULL, to_char(now() - interval '12 hours', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-1VBS5G', 'participant', 'confirmed', 'Ishaan Gupta', 'ishaan@college.edu', '+91 99887 66554', 'Christ University', 'Student', 'Student', NULL, to_char(now() - interval '8 hours', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev_id, 'TCK-3MHC7Q', 'participant', 'waitlisted', 'Tanvi Desai', 'tanvi@freelance.dev', '+91 93456 78120', '', 'Freelancer', 'General', NULL, to_char(now() - interval '5 hours', 'YYYY-MM-DD HH24:MI:SS')::timestamp);

  -- guests attached to the first two participants
  SELECT id INTO reg_id FROM registrations WHERE ticket_code = 'TCK-7KQ4XM';
  INSERT INTO registrations (event_id, ticket_code, type, status, full_name, email, organization, ticket_category, guest_label, primary_registration_id, checked_in_at, created_at)
  VALUES (ev_id, 'GST-4QK8ZP', 'guest', 'checked_in', 'Riya Sharma', 'riya@acme.dev', 'Acme Labs', 'Guest', 'Colleague', reg_id, to_char(now() - interval '2 hours', 'YYYY-MM-DD HH24:MI:SS')::timestamp, to_char(now() - interval '3 days', 'YYYY-MM-DD HH24:MI:SS')::timestamp);

  SELECT id INTO reg_id FROM registrations WHERE ticket_code = 'TCK-3PZN8R';
  INSERT INTO registrations (event_id, ticket_code, type, status, full_name, organization, ticket_category, guest_label, primary_registration_id, created_at)
  VALUES (ev_id, 'GST-2WJ6TD', 'guest', 'confirmed', 'Ananya Menon', 'Northwind', 'Guest', 'Plus one', reg_id, to_char(now() - interval '3 days', 'YYYY-MM-DD HH24:MI:SS')::timestamp);

  -- scan history
  INSERT INTO scan_logs (event_id, registration_id, ticket_code, result, message, scanned_by, created_at)
  SELECT ev_id, r.id, r.ticket_code, 'check_in', 'Checked in', 'gate-a', r.checked_in_at
  FROM registrations r WHERE r.event_id = ev_id AND r.status = 'checked_in';

  INSERT INTO scan_logs (event_id, registration_id, ticket_code, result, message, scanned_by, created_at)
  SELECT ev_id, r.id, r.ticket_code, 'duplicate', 'Already inside', 'gate-a', to_char(now() - interval '30 minutes', 'YYYY-MM-DD HH24:MI:SS')::timestamp
  FROM registrations r WHERE r.ticket_code = 'TCK-7KQ4XM';

  -- second event so the boards are not empty
  INSERT INTO events (
    slug, name, tagline, description, category, venue, city,
    organizer_name, contact_email,
    starts_at, ends_at, registration_deadline,
    capacity, guest_capacity, guests_per_registration,
    allow_guests, waitlist_enabled, auto_close_when_full, require_check_in,
    status, accent
  ) VALUES (
    'ai-builders-hackathon',
    'AI Builders Hackathon',
    '36 hours, 40 teams, one shipping deadline',
    'A weekend hackathon for teams building with LLMs. Mentors on site, GPUs provided, demo day on Sunday evening.',
    'Hackathon', 'Tech Park Block C', 'Pune',
    'BuilderHub', 'crew@builderhub.dev',
    to_char(now() + interval '21 days', 'YYYY-MM-DD 10:00:00')::timestamp,
    to_char(now() + interval '23 days', 'YYYY-MM-DD 18:00:00')::timestamp,
    to_char(now() + interval '14 days', 'YYYY-MM-DD 23:59:00')::timestamp,
    120, 0, 0,
    false, true, true, true,
    'published', 'cyan'
  ) RETURNING id INTO ev2_id;

  INSERT INTO announcements (event_id, title, body, tone)
  VALUES (ev2_id, 'Team size is 2-4', 'Register individually, then form teams on day one.', 'info');

  INSERT INTO registrations (event_id, ticket_code, type, status, full_name, email, phone, organization, designation, ticket_category, created_at)
  VALUES
    (ev2_id, 'TCK-8QWN2V', 'participant', 'confirmed', 'Vikram Bose', 'vikram@orbit.dev', '+91 90011 22334', 'Orbit', 'Backend engineer', 'Professional', to_char(now() - interval '2 days', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev2_id, 'TCK-5PJD9K', 'participant', 'confirmed', 'Leena Shah', 'leena@shah.dev', '+91 90888 11223', 'Independent', 'Data scientist', 'Professional', to_char(now() - interval '1 day', 'YYYY-MM-DD HH24:MI:SS')::timestamp),
    (ev2_id, 'TCK-2TYB4M', 'participant', 'confirmed', 'Omar Farooq', 'omar@campus.edu', '+91 93411 99887', 'Campus AI Club', 'Student lead', 'Student', to_char(now() - interval '10 hours', 'YYYY-MM-DD HH24:MI:SS')::timestamp);
END $$;
