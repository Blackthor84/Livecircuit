-- Rename agency plan tiers to partnership program names

ALTER TYPE public.agency_plan RENAME VALUE 'starter' TO 'boutique';
ALTER TYPE public.agency_plan RENAME VALUE 'pro' TO 'growth';

ALTER TABLE public.agency_organizations
  ALTER COLUMN plan SET DEFAULT 'boutique';
