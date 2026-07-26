-- Milestone 5: default digital concourse booths for flagship venues

INSERT INTO public.concourse_shops (venue_id, kind, name, slug, description, sort_order, zone)
SELECT v.id, x.kind, x.name, x.slug, x.description, x.sort_order, x.zone::jsonb
FROM public.venues v
CROSS JOIN (VALUES
  (
    'information_desk'::public.concourse_shop_kind,
    'Information Desk',
    'information-desk',
    'Maps, accessibility, and guest services.',
    0,
    '{"x":0,"y":0,"w":2,"h":1,"vrAnchor":"information-desk"}'
  ),
  (
    'event_board'::public.concourse_shop_kind,
    'Tonight''s Shows',
    'event-board',
    'Upcoming performances and live room assignments.',
    1,
    '{"x":2,"y":0,"w":2,"h":2,"vrAnchor":"event-board"}'
  ),
  (
    'venue_directory'::public.concourse_shop_kind,
    'Venue Directory',
    'venue-directory',
    'Explore other LiveCircuit venues by region.',
    2,
    '{"x":0,"y":1,"w":2,"h":1,"vrAnchor":"directory"}'
  ),
  (
    'photo_booth'::public.concourse_shop_kind,
    'Fan Photo Booth',
    'photo-booth',
    'Capture a memory before you head to your show.',
    3,
    '{"x":4,"y":0,"w":1,"h":1,"vrAnchor":"photo-booth"}'
  )
) AS x(kind, name, slug, description, sort_order, zone)
WHERE v.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.concourse_shops cs
    WHERE cs.venue_id = v.id AND cs.slug = x.slug
  );
