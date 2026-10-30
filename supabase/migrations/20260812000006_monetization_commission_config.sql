-- Centralized ticket + private booking commission (SuperAdmin-configurable)

CREATE TABLE IF NOT EXISTS public.monetization_commission_config (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  ticket_commission_percent numeric(6,2) NOT NULL DEFAULT 10,
  private_booking_commission_percent numeric(6,2) NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.monetization_commission_config (id, ticket_commission_percent, private_booking_commission_percent)
VALUES ('default', 10, 10)
ON CONFLICT (id) DO NOTHING;

-- Align ticket config mirror with commission defaults when still at legacy default
UPDATE public.monetization_ticket_config t
SET platform_fee_percent = c.ticket_commission_percent
FROM public.monetization_commission_config c
WHERE t.id = 'default' AND c.id = 'default';

ALTER TABLE public.monetization_commission_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_commission_config" ON public.monetization_commission_config;
CREATE POLICY "auth_read_commission_config" ON public.monetization_commission_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_commission_config" ON public.monetization_commission_config;
CREATE POLICY "admin_all_commission_config" ON public.monetization_commission_config
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

GRANT SELECT ON public.monetization_commission_config TO authenticated;
GRANT ALL ON public.monetization_commission_config TO authenticated;
