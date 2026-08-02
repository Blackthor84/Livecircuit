-- Agency Booking CRM — full lifecycle booking management for agencies and managers

CREATE TYPE public.agency_crm_pipeline_stage AS ENUM (
  'new_inquiry',
  'contacted',
  'discovery_call',
  'proposal_sent',
  'negotiation',
  'contract_sent',
  'contract_signed',
  'event_scheduled',
  'marketing',
  'tickets_on_sale',
  'live_event',
  'completed',
  'cancelled'
);

CREATE TYPE public.agency_crm_contact_type AS ENUM (
  'brand',
  'sponsor',
  'manager',
  'artist',
  'venue',
  'media',
  'influencer',
  'talent_buyer',
  'other'
);

CREATE TYPE public.agency_crm_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.agency_crm_task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');

CREATE TYPE public.agency_crm_file_category AS ENUM (
  'contract',
  'image',
  'video',
  'brand_asset',
  'stage_asset',
  'marketing',
  'press_kit',
  'invoice',
  'other'
);

CREATE TYPE public.agency_crm_contract_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'signed',
  'expired',
  'void'
);

CREATE TYPE public.agency_crm_payment_type AS ENUM (
  'deposit',
  'balance',
  'refund',
  'payout',
  'invoice',
  'ticket_revenue'
);

CREATE TYPE public.agency_crm_payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded',
  'cancelled',
  'overdue'
);

CREATE TYPE public.agency_crm_activity_type AS ENUM (
  'booking_created',
  'stage_changed',
  'contract_uploaded',
  'contract_signed',
  'payment_received',
  'task_completed',
  'task_created',
  'email_sent',
  'message_sent',
  'ticket_sales_opened',
  'event_completed',
  'note_added',
  'file_uploaded',
  'contact_linked',
  'booking_updated'
);

CREATE TYPE public.agency_crm_event_type AS ENUM (
  'virtual_concert',
  'festival',
  'private_event',
  'corporate',
  'charity',
  'album_release',
  'tour_stop',
  'other'
);

-- Core booking record
CREATE TABLE public.agency_crm_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  stage public.agency_crm_pipeline_stage NOT NULL DEFAULT 'new_inquiry',
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  sponsor_contact_id UUID,
  booking_contact_id UUID,
  event_type public.agency_crm_event_type NOT NULL DEFAULT 'virtual_concert',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  expected_attendance INTEGER,
  ticket_price_cents INTEGER,
  projected_revenue_cents INTEGER NOT NULL DEFAULT 0,
  actual_revenue_cents INTEGER NOT NULL DEFAULT 0,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_website TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  internal_notes TEXT,
  recording_status TEXT NOT NULL DEFAULT 'not_started',
  replay_status TEXT NOT NULL DEFAULT 'not_available',
  priority public.agency_crm_task_priority NOT NULL DEFAULT 'medium',
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  contact_type public.agency_crm_contact_type NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  website TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  relationship_score INTEGER NOT NULL DEFAULT 50 CHECK (relationship_score >= 0 AND relationship_score <= 100),
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  linked_artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  linked_venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_crm_bookings
  ADD CONSTRAINT agency_crm_bookings_sponsor_contact_fk
    FOREIGN KEY (sponsor_contact_id) REFERENCES public.agency_crm_contacts(id) ON DELETE SET NULL,
  ADD CONSTRAINT agency_crm_bookings_booking_contact_fk
    FOREIGN KEY (booking_contact_id) REFERENCES public.agency_crm_contacts(id) ON DELETE SET NULL;

CREATE TABLE public.agency_crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.agency_crm_bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority public.agency_crm_task_priority NOT NULL DEFAULT 'medium',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  status public.agency_crm_task_status NOT NULL DEFAULT 'todo',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_crm_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.agency_crm_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_crm_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.agency_crm_bookings(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.agency_crm_contacts(id) ON DELETE CASCADE,
  category public.agency_crm_file_category NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_crm_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.agency_crm_bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status public.agency_crm_contract_status NOT NULL DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_crm_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.agency_crm_bookings(id) ON DELETE CASCADE,
  payment_type public.agency_crm_payment_type NOT NULL DEFAULT 'deposit',
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.agency_crm_payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.agency_crm_bookings(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type public.agency_crm_activity_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_crm_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.agency_crm_bookings(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('marketing', 'performance')),
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (booking_id, checklist_type, item_key)
);

CREATE TABLE public.agency_crm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.agency_crm_bookings(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX agency_crm_bookings_org_stage_idx ON public.agency_crm_bookings (organization_id, stage);
CREATE INDEX agency_crm_bookings_org_starts_idx ON public.agency_crm_bookings (organization_id, starts_at);
CREATE INDEX agency_crm_bookings_artist_idx ON public.agency_crm_bookings (artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX agency_crm_bookings_assigned_idx ON public.agency_crm_bookings (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX agency_crm_contacts_org_type_idx ON public.agency_crm_contacts (organization_id, contact_type);
CREATE INDEX agency_crm_contacts_org_name_idx ON public.agency_crm_contacts (organization_id, name);
CREATE INDEX agency_crm_tasks_booking_idx ON public.agency_crm_tasks (booking_id, status);
CREATE INDEX agency_crm_tasks_due_idx ON public.agency_crm_tasks (organization_id, due_at) WHERE status != 'done';
CREATE INDEX agency_crm_payments_booking_idx ON public.agency_crm_payments (booking_id, status);
CREATE INDEX agency_crm_activities_org_idx ON public.agency_crm_activities (organization_id, created_at DESC);
CREATE INDEX agency_crm_activities_booking_idx ON public.agency_crm_activities (booking_id, created_at DESC);
CREATE INDEX agency_crm_notifications_user_idx ON public.agency_crm_notifications (user_id, read_at);

-- Full-text search helper
CREATE INDEX agency_crm_bookings_search_idx ON public.agency_crm_bookings
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(contact_name, '') || ' ' || coalesce(notes, '')));

CREATE INDEX agency_crm_contacts_search_idx ON public.agency_crm_contacts
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(email, '')));

-- RLS
ALTER TABLE public.agency_crm_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.agency_crm_can_write(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_organization_members m
    WHERE m.organization_id = p_org_id AND m.user_id = p_user_id
      AND m.role IN ('owner', 'admin', 'booking_manager', 'artist_manager', 'marketing', 'finance')
  ) OR public.is_platform_admin(p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.agency_crm_can_read_finance(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_organization_members m
    WHERE m.organization_id = p_org_id AND m.user_id = p_user_id
      AND m.role IN ('owner', 'admin', 'booking_manager', 'finance')
  ) OR public.is_platform_admin(p_user_id);
$$;

-- Bookings
CREATE POLICY "CRM bookings read" ON public.agency_crm_bookings
  FOR SELECT USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "CRM bookings write" ON public.agency_crm_bookings
  FOR ALL USING (public.agency_crm_can_write(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

-- Contacts
CREATE POLICY "CRM contacts read" ON public.agency_crm_contacts
  FOR SELECT USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "CRM contacts write" ON public.agency_crm_contacts
  FOR ALL USING (public.agency_crm_can_write(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

-- Tasks
CREATE POLICY "CRM tasks access" ON public.agency_crm_tasks
  FOR ALL USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "CRM task comments access" ON public.agency_crm_task_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_crm_tasks t
      WHERE t.id = task_id
        AND (public.is_agency_member(t.organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()))
    )
  );

-- Files
CREATE POLICY "CRM files access" ON public.agency_crm_files
  FOR ALL USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

-- Contracts
CREATE POLICY "CRM contracts access" ON public.agency_crm_contracts
  FOR ALL USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

-- Payments (finance roles)
CREATE POLICY "CRM payments read" ON public.agency_crm_payments
  FOR SELECT USING (
    public.agency_crm_can_read_finance(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "CRM payments write" ON public.agency_crm_payments
  FOR ALL USING (
    public.agency_crm_can_read_finance(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid())
  );

-- Activities
CREATE POLICY "CRM activities read" ON public.agency_crm_activities
  FOR SELECT USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "CRM activities insert" ON public.agency_crm_activities
  FOR INSERT WITH CHECK (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

-- Checklist
CREATE POLICY "CRM checklist access" ON public.agency_crm_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_crm_bookings b
      WHERE b.id = booking_id
        AND (public.is_agency_member(b.organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()))
    )
  );

-- Notifications (own only)
CREATE POLICY "CRM notifications read own" ON public.agency_crm_notifications
  FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "CRM notifications update own" ON public.agency_crm_notifications
  FOR UPDATE USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "CRM notifications insert" ON public.agency_crm_notifications
  FOR INSERT WITH CHECK (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));
