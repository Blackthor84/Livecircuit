-- Developer Testing & Impersonation System

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_scenario TEXT,
  ADD COLUMN IF NOT EXISTS test_created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS test_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_test_account ON public.profiles(is_test_account) WHERE is_test_account = true;
CREATE INDEX IF NOT EXISTS idx_profiles_test_scenario ON public.profiles(test_scenario) WHERE is_test_account = true;

-- Optional admin impersonation permission (super_admin bypasses)
CREATE TABLE IF NOT EXISTS public.admin_testing_permissions (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_impersonate BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail for impersonation sessions
CREATE TABLE IF NOT EXISTS public.impersonation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_impersonation_audit_admin ON public.impersonation_audit(admin_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_audit_target ON public.impersonation_audit(target_user_id, started_at DESC);

-- Platform simulator job log
CREATE TABLE IF NOT EXISTS public.testing_simulator_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  rows_affected INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_testing_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testing_simulator_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Testing permissions admin read" ON public.admin_testing_permissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Impersonation audit admin read" ON public.impersonation_audit
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Simulator runs admin read" ON public.testing_simulator_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
  );

-- Prevent non-service updates to test flags from client JWT
CREATE OR REPLACE FUNCTION public.protect_test_account_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.testing_bootstrap', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.is_test_account IS DISTINCT FROM OLD.is_test_account
     OR NEW.test_scenario IS DISTINCT FROM OLD.test_scenario
     OR NEW.test_created_by IS DISTINCT FROM OLD.test_created_by
     OR NEW.test_created_at IS DISTINCT FROM OLD.test_created_at THEN
    RAISE EXCEPTION 'Test account flags are managed by the Testing Center only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_test_flags ON public.profiles;
CREATE TRIGGER profiles_protect_test_flags
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.is_test_account OR NEW.is_test_account)
  EXECUTE FUNCTION public.protect_test_account_flags();
