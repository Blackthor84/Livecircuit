-- super_admin inherits all admin RLS permissions.

CREATE OR REPLACE FUNCTION public.is_admin_profile()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  );
$$;

DROP POLICY IF EXISTS "Admin manages observer accounts" ON public.observer_accounts;
CREATE POLICY "Admin manages observer accounts" ON public.observer_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admin reads observer presence" ON public.observer_presence;
CREATE POLICY "Admin reads observer presence" ON public.observer_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );
