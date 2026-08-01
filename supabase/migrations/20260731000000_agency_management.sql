-- Agency Management System for LiveCircuit

CREATE TYPE public.agency_plan AS ENUM ('starter', 'pro', 'enterprise');

CREATE TYPE public.agency_member_role AS ENUM (
  'owner',
  'admin',
  'booking_manager',
  'artist_manager',
  'assistant',
  'marketing',
  'finance',
  'read_only'
);

CREATE TYPE public.agency_artist_status AS ENUM ('pending', 'active', 'suspended', 'ended');

CREATE TYPE public.agency_booking_status AS ENUM (
  'draft',
  'pending',
  'matched',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TABLE public.agency_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  billing_email TEXT,
  biography TEXT,
  plan public.agency_plan NOT NULL DEFAULT 'starter',
  verified BOOLEAN NOT NULL DEFAULT false,
  years_in_business INTEGER,
  office_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  genres TEXT[] NOT NULL DEFAULT '{}',
  awards JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_started_at TIMESTAMPTZ,
  plan_renews_at TIMESTAMPTZ,
  is_test BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.agency_member_role NOT NULL DEFAULT 'read_only',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE public.agency_managed_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  status public.agency_artist_status NOT NULL DEFAULT 'pending',
  assigned_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_assistant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  biography TEXT,
  press_kit_url TEXT,
  stage_plot_url TEXT,
  technical_rider_url TEXT,
  hospitality_rider_url TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  streaming_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  genres TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  contract_starts_at TIMESTAMPTZ,
  contract_ends_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, artist_id)
);

CREATE TABLE public.agency_booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status public.agency_booking_status NOT NULL DEFAULT 'draft',
  artist_ids UUID[] NOT NULL DEFAULT '{}',
  preferred_dates DATERANGE[],
  preferred_states TEXT[] NOT NULL DEFAULT '{}',
  preferred_genres TEXT[] NOT NULL DEFAULT '{}',
  preferred_times JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_arena_sizes TEXT[] NOT NULL DEFAULT '{}',
  preferred_ticket_price_cents INTEGER,
  preferred_audience TEXT,
  is_bulk BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  template_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_booking_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id UUID NOT NULL REFERENCES public.agency_booking_requests(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  recommendation JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended', 'accepted', 'rejected', 'edited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_booking_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  color TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  subject TEXT,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('artist', 'fan', 'sponsor', 'team', 'venue', 'support')),
  participant_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.agency_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agency_orgs_slug_idx ON public.agency_organizations (slug);
CREATE INDEX agency_orgs_verified_idx ON public.agency_organizations (verified) WHERE verified = true;
CREATE INDEX agency_orgs_test_idx ON public.agency_organizations (is_test) WHERE is_test = true;
CREATE INDEX agency_members_user_idx ON public.agency_organization_members (user_id);
CREATE INDEX agency_roster_org_idx ON public.agency_managed_artists (organization_id, status);
CREATE INDEX agency_roster_artist_idx ON public.agency_managed_artists (artist_id);
CREATE INDEX agency_bookings_org_idx ON public.agency_booking_requests (organization_id, status);
CREATE INDEX agency_calendar_org_idx ON public.agency_calendar_events (organization_id, starts_at);
CREATE INDEX agency_audit_org_idx ON public.agency_action_audit (organization_id, created_at DESC);

ALTER TABLE public.agency_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_managed_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_booking_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_booking_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_action_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_agency_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_organization_members
    WHERE organization_id = p_org_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('admin', 'super_admin')
  );
$$;

-- Public read: verified non-test agencies
CREATE POLICY "Public read verified agencies" ON public.agency_organizations
  FOR SELECT USING (verified = true AND is_test = false);

CREATE POLICY "Agency members read org" ON public.agency_organizations
  FOR SELECT USING (public.is_agency_member(id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency owners update org" ON public.agency_organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agency_organization_members m
      WHERE m.organization_id = id AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    ) OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Platform admin manage agencies" ON public.agency_organizations
  FOR ALL USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Authenticated users create agencies" ON public.agency_organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members read own memberships" ON public.agency_organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_agency_member(organization_id, auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Agency admins manage members" ON public.agency_organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_organization_members m
      WHERE m.organization_id = organization_id AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    ) OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Users create owner membership" ON public.agency_organization_members
  FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'owner');

CREATE POLICY "Agency roster read" ON public.agency_managed_artists
  FOR SELECT USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency roster write" ON public.agency_managed_artists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_organization_members m
      WHERE m.organization_id = organization_id AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin', 'booking_manager', 'artist_manager')
    ) OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Agency bookings access" ON public.agency_booking_requests
  FOR ALL USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency matches access" ON public.agency_booking_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_booking_requests r
      WHERE r.id = booking_request_id
        AND (public.is_agency_member(r.organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()))
    )
  );

CREATE POLICY "Agency templates access" ON public.agency_booking_templates
  FOR ALL USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency calendar access" ON public.agency_calendar_events
  FOR ALL USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency audit read" ON public.agency_action_audit
  FOR SELECT USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency audit insert" ON public.agency_action_audit
  FOR INSERT WITH CHECK (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency conversations access" ON public.agency_conversations
  FOR ALL USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency messages access" ON public.agency_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_conversations c
      WHERE c.id = conversation_id
        AND (public.is_agency_member(c.organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()))
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_messages;
