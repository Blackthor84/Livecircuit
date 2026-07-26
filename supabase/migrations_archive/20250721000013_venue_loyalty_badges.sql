-- Milestone 9: default venue loyalty badges (criteria evaluated in app)

INSERT INTO public.venue_badges (venue_id, slug, name, description, criteria)
SELECT
  v.id,
  b.slug,
  b.name,
  b.description,
  b.criteria
FROM public.venues v
CROSS JOIN (
  VALUES
    (
      'first-check-in',
      'First Check-in',
      'Visited the digital concourse for the first time.',
      '{"minCheckIns":1}'::jsonb
    ),
    (
      'concourse-regular',
      'Concourse Regular',
      'Checked in at this venue five times.',
      '{"minCheckIns":5}'::jsonb
    ),
    (
      'silver-member',
      'Silver Member',
      'Reached Silver loyalty tier.',
      '{"minLevel":"silver"}'::jsonb
    ),
    (
      'gold-member',
      'Gold Member',
      'Reached Gold loyalty tier.',
      '{"minLevel":"gold"}'::jsonb
    ),
    (
      'diamond-member',
      'Diamond Member',
      'Reached Diamond loyalty tier.',
      '{"minLevel":"diamond"}'::jsonb
    ),
    (
      'community-critic',
      'Community Critic',
      'Left a star review for this venue.',
      '{"hasReview":true}'::jsonb
    )
) AS b(slug, name, description, criteria)
ON CONFLICT (venue_id, slug) DO NOTHING;
