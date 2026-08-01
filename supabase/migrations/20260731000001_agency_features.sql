-- Agency feature expansion: background jobs, sponsorship proposals, attachments bucket

CREATE TYPE public.agency_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

CREATE TYPE public.agency_job_type AS ENUM (
  'bulk_booking',
  'bulk_auto_match',
  'bulk_calendar_sync'
);

CREATE TYPE public.agency_proposal_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'withdrawn'
);

CREATE TABLE public.agency_background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_type public.agency_job_type NOT NULL,
  status public.agency_job_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  total_steps INTEGER NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_sponsorship_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  slot_type_slug TEXT,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  budget_cents INTEGER,
  status public.agency_proposal_status NOT NULL DEFAULT 'draft',
  campaign_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agency_jobs_org_status_idx ON public.agency_background_jobs (organization_id, status, created_at DESC);
CREATE INDEX agency_jobs_pending_idx ON public.agency_background_jobs (status, created_at)
  WHERE status IN ('pending', 'running');
CREATE INDEX agency_proposals_org_idx ON public.agency_sponsorship_proposals (organization_id, status);

ALTER TABLE public.agency_background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_sponsorship_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency jobs access" ON public.agency_background_jobs
  FOR ALL USING (
    public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Agency proposals access" ON public.agency_sponsorship_proposals
  FOR ALL USING (
    public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid())
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-attachments',
  'agency-attachments',
  false,
  26214400,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain',
    'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agency attachments read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agency-attachments'
    AND (
      public.is_platform_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.agency_organization_members m
        WHERE m.organization_id::text = (storage.foldername(name))[1]
          AND m.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agency attachments upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agency-attachments'
    AND EXISTS (
      SELECT 1 FROM public.agency_organization_members m
      WHERE m.organization_id::text = (storage.foldername(name))[1]
        AND m.user_id = auth.uid()
    )
  );
