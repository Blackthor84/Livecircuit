-- Allow agency accounts to read their primary organization (including test orgs via profile link)

CREATE POLICY "Agency account reads primary organization" ON public.agency_organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'agency'
        AND p.primary_agency_id = agency_organizations.id
    )
  );
