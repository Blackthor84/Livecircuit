-- Agency membership lifecycle fields (SaaS-style org membership)
CREATE TYPE public.agency_membership_status AS ENUM ('active', 'invited', 'suspended', 'removed');
CREATE TYPE public.agency_invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

ALTER TABLE public.agency_organization_members
  ADD COLUMN IF NOT EXISTS status public.agency_membership_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invitation_status public.agency_invitation_status NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Backfill active memberships for test agency profiles missing membership rows
INSERT INTO public.agency_organization_members (
  organization_id,
  user_id,
  role,
  accepted_at,
  status,
  invitation_status,
  last_active_at
)
SELECT
  p.primary_agency_id,
  p.id,
  COALESCE(p.agency_member_role, 'owner'::public.agency_member_role),
  COALESCE(p.test_created_at, now()),
  'active'::public.agency_membership_status,
  'accepted'::public.agency_invitation_status,
  now()
FROM public.profiles p
WHERE p.role = 'agency'
  AND p.is_test_account = true
  AND p.primary_agency_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.agency_organizations o WHERE o.id = p.primary_agency_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.agency_organization_members m
    WHERE m.user_id = p.id AND m.organization_id = p.primary_agency_id
  )
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Sync stale primary_agency_id from membership when profile points at missing org
UPDATE public.profiles p
SET primary_agency_id = m.organization_id
FROM public.agency_organization_members m
WHERE p.id = m.user_id
  AND p.role = 'agency'
  AND p.is_test_account = true
  AND (
    p.primary_agency_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.agency_organizations o WHERE o.id = p.primary_agency_id
    )
  );
