-- Observer accounts for internal LiveCircuit monitoring (admin-managed)

CREATE TABLE public.observer_accounts (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.observer_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id UUID NOT NULL REFERENCES public.observer_accounts(user_id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX observer_presence_observer_idx ON public.observer_presence (observer_id, joined_at DESC);
CREATE INDEX observer_presence_event_idx ON public.observer_presence (event_id, joined_at DESC);

ALTER TABLE public.observer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observer_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages observer accounts" ON public.observer_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Observers read own account" ON public.observer_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin reads observer presence" ON public.observer_presence
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Observers insert own presence" ON public.observer_presence
  FOR INSERT WITH CHECK (
    auth.uid() = observer_id
    AND EXISTS (
      SELECT 1 FROM public.observer_accounts o
      WHERE o.user_id = auth.uid() AND o.active = true
    )
  );
