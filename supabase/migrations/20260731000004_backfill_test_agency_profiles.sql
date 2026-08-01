-- Backfill test agency staff profiles created before agency account type

UPDATE public.profiles p
SET
  role = 'agency',
  primary_agency_id = m.organization_id,
  agency_member_role = m.role
FROM public.agency_organization_members m
JOIN public.agency_organizations o ON o.id = m.organization_id
WHERE p.id = m.user_id
  AND p.is_test_account = true
  AND o.is_test = true
  AND p.role <> 'agency';
