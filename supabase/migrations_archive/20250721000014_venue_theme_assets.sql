-- Milestone 10: seasonal theme palettes & assets

UPDATE public.venue_themes SET
  description = 'Sun-soaked stages, open-air energy, and festival lighting.',
  default_palette = '{"primary":"oklch(0.78 0.18 85)","accent":"oklch(0.72 0.2 45)","glow":"oklch(0.85 0.14 95)"}'::jsonb,
  assets = '{"icon":"☀️","heroGradient":"linear-gradient(180deg, oklch(0.55 0.16 85 / 45%), transparent)","meshTint":"oklch(0.72 0.18 85 / 30%)","panelBorder":"oklch(0.85 0.12 85 / 35%)"}'::jsonb
WHERE slug = 'summer-festival';

UPDATE public.venue_themes SET
  description = 'Spooky concourse decor and midnight purple highlights.',
  default_palette = '{"primary":"oklch(0.68 0.22 55)","accent":"oklch(0.55 0.2 300)","glow":"oklch(0.72 0.18 55)"}'::jsonb,
  assets = '{"icon":"🎃","heroGradient":"linear-gradient(180deg, oklch(0.45 0.18 55 / 55%), transparent)","meshTint":"oklch(0.5 0.2 55 / 25%)","panelBorder":"oklch(0.65 0.16 55 / 40%)"}'::jsonb
WHERE slug = 'halloween';

UPDATE public.venue_themes SET
  description = 'Frosted glass panels and aurora accents.',
  default_palette = '{"primary":"oklch(0.82 0.1 230)","accent":"oklch(0.75 0.14 200)","glow":"oklch(0.88 0.08 210)"}'::jsonb,
  assets = '{"icon":"❄️","heroGradient":"linear-gradient(180deg, oklch(0.55 0.12 230 / 50%), transparent)","meshTint":"oklch(0.65 0.1 230 / 28%)","panelBorder":"oklch(0.8 0.08 230 / 35%)"}'::jsonb
WHERE slug = 'winter-wonderland';

UPDATE public.venue_themes SET
  description = 'Classic holiday concert halls with warm gold trim.',
  default_palette = '{"primary":"oklch(0.72 0.16 145)","accent":"oklch(0.78 0.18 85)","glow":"oklch(0.8 0.12 145)"}'::jsonb,
  assets = '{"icon":"🎄","heroGradient":"linear-gradient(180deg, oklch(0.5 0.14 145 / 45%), transparent)","meshTint":"oklch(0.55 0.12 145 / 22%)","panelBorder":"oklch(0.7 0.1 145 / 38%)"}'::jsonb
WHERE slug = 'holiday-concert';

UPDATE public.venue_themes SET
  description = 'Rainbow-forward branding across venue surfaces.',
  default_palette = '{"primary":"oklch(0.7 0.22 330)","accent":"oklch(0.72 0.2 250)","glow":"oklch(0.78 0.18 300)"}'::jsonb,
  assets = '{"icon":"🏳️‍🌈","heroGradient":"linear-gradient(135deg, oklch(0.55 0.2 330 / 40%), oklch(0.55 0.18 250 / 35%), transparent)","meshTint":"oklch(0.6 0.18 300 / 25%)","panelBorder":"oklch(0.72 0.16 330 / 35%)"}'::jsonb
WHERE slug = 'pride-month';

UPDATE public.venue_themes SET
  description = 'Bold comic panels and convention floor energy.',
  default_palette = '{"primary":"oklch(0.72 0.22 25)","accent":"oklch(0.68 0.2 260)","glow":"oklch(0.78 0.18 25)"}'::jsonb,
  assets = '{"icon":"💥","heroGradient":"linear-gradient(180deg, oklch(0.5 0.2 25 / 50%), transparent)","meshTint":"oklch(0.55 0.18 25 / 22%)","panelBorder":"oklch(0.68 0.2 25 / 40%)"}'::jsonb
WHERE slug = 'comic-convention';

UPDATE public.venue_themes SET
  description = 'Neon sakura accents and anime-night promos.',
  default_palette = '{"primary":"oklch(0.72 0.2 350)","accent":"oklch(0.7 0.18 280)","glow":"oklch(0.8 0.14 350)"}'::jsonb,
  assets = '{"icon":"🌸","heroGradient":"linear-gradient(180deg, oklch(0.52 0.18 350 / 45%), transparent)","meshTint":"oklch(0.58 0.16 350 / 25%)","panelBorder":"oklch(0.72 0.14 350 / 38%)"}'::jsonb
WHERE slug = 'anime-festival';

UPDATE public.venue_themes SET
  description = 'Warm amber stages and rustic concourse signage.',
  default_palette = '{"primary":"oklch(0.7 0.16 65)","accent":"oklch(0.62 0.12 55)","glow":"oklch(0.78 0.12 70)"}'::jsonb,
  assets = '{"icon":"🤠","heroGradient":"linear-gradient(180deg, oklch(0.48 0.12 65 / 48%), transparent)","meshTint":"oklch(0.55 0.1 65 / 22%)","panelBorder":"oklch(0.65 0.1 65 / 35%)"}'::jsonb
WHERE slug = 'country-weekend';

UPDATE public.venue_themes SET
  description = 'Smoky lounge lighting and brass accents.',
  default_palette = '{"primary":"oklch(0.68 0.14 55)","accent":"oklch(0.72 0.12 85)","glow":"oklch(0.75 0.1 55)"}'::jsonb,
  assets = '{"icon":"🎷","heroGradient":"linear-gradient(180deg, oklch(0.42 0.1 55 / 55%), transparent)","meshTint":"oklch(0.5 0.08 55 / 25%)","panelBorder":"oklch(0.62 0.08 55 / 38%)"}'::jsonb
WHERE slug = 'jazz-festival';

UPDATE public.venue_themes SET
  description = 'Laser-grid aesthetics and bass-forward visuals.',
  default_palette = '{"primary":"oklch(0.72 0.22 280)","accent":"oklch(0.68 0.24 320)","glow":"oklch(0.78 0.2 280)"}'::jsonb,
  assets = '{"icon":"🎧","heroGradient":"linear-gradient(180deg, oklch(0.45 0.22 280 / 55%), transparent)","meshTint":"oklch(0.5 0.2 280 / 30%)","panelBorder":"oklch(0.65 0.2 280 / 42%)"}'::jsonb
WHERE slug = 'electronic-month';

-- Demo active assignments (one theme per flagship venue)
INSERT INTO public.venue_theme_assignments (venue_id, theme_id, is_active)
SELECT v.id, t.id, true
FROM public.venues v
JOIN public.venue_themes t ON t.slug = 'summer-festival'
WHERE v.slug = 'new-york-city-arena'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_theme_assignments a
    WHERE a.venue_id = v.id AND a.is_active = true AND a.ends_at IS NULL
  );

INSERT INTO public.venue_theme_assignments (venue_id, theme_id, is_active)
SELECT v.id, t.id, true
FROM public.venues v
JOIN public.venue_themes t ON t.slug = 'halloween'
WHERE v.slug = 'buffalo-arena'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_theme_assignments a
    WHERE a.venue_id = v.id AND a.is_active = true AND a.ends_at IS NULL
  );

INSERT INTO public.venue_theme_assignments (venue_id, theme_id, is_active)
SELECT v.id, t.id, true
FROM public.venues v
JOIN public.venue_themes t ON t.slug = 'winter-wonderland'
WHERE v.slug = 'boston-arena'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_theme_assignments a
    WHERE a.venue_id = v.id AND a.is_active = true AND a.ends_at IS NULL
  );
