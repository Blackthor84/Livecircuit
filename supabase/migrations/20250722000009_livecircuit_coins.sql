-- Ecosystem M9: LiveCircuit Coins (wallet, ledger, shop, cosmetics)

CREATE TABLE public.coin_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  category TEXT NOT NULL,
  source_key TEXT,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_key)
);

CREATE INDEX idx_coin_transactions_user ON public.coin_transactions(user_id, created_at DESC);

CREATE TABLE public.coin_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (
    category IN (
      'avatar',
      'theme',
      'animation',
      'badge',
      'profile',
      'venue_collectible',
      'digital_merch',
      'reaction'
    )
  ),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_coins INTEGER NOT NULL CHECK (price_coins > 0),
  image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_coin_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.coin_shop_items(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE TABLE public.user_coin_equipment (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('avatar', 'theme', 'animation', 'badge', 'profile', 'reaction')),
  item_id UUID NOT NULL REFERENCES public.coin_shop_items(id) ON DELETE CASCADE,
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE public.coin_daily_claims (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_date)
);

CREATE TABLE public.coin_referral_codes (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.coin_referral_redemptions (
  referred_user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.coin_shop_items (slug, category, name, description, price_coins, sort_order, metadata) VALUES
  ('avatar-neon-ring', 'avatar', 'Neon ring', 'Pulsing ring around your avatar.', 250, 10, '{"slot":"avatar"}'::jsonb),
  ('avatar-gold-crown', 'avatar', 'Gold crown', 'Show VIP energy in every room.', 600, 11, '{"slot":"avatar"}'::jsonb),
  ('theme-midnight', 'theme', 'Midnight theme', 'Deep purple interface accent for your profile.', 400, 20, '{"slot":"theme"}'::jsonb),
  ('theme-aurora', 'theme', 'Aurora theme', 'Northern-lights gradient profile styling.', 550, 21, '{"slot":"theme"}'::jsonb),
  ('anim-confetti', 'animation', 'Confetti burst', 'Celebrate drops and encores.', 350, 30, '{"slot":"animation"}'::jsonb),
  ('badge-coin-collector', 'badge', 'Coin collector', 'Badge for early economy adopters.', 200, 40, '{"slot":"badge"}'::jsonb),
  ('profile-gradient-banner', 'profile', 'Gradient banner', 'Wide hero banner on your public fan card.', 450, 50, '{"slot":"profile"}'::jsonb),
  ('venue-holo-ticket', 'venue_collectible', 'Holographic ticket stub', 'Digital venue collectible for your shelf.', 500, 60, '{}'::jsonb),
  ('merch-sticker-pack', 'digital_merch', 'Artist sticker pack', 'Animated stickers for chat and DMs.', 300, 70, '{}'::jsonb),
  ('reaction-sparkle-pack', 'reaction', 'Sparkle reactions', 'Unlock ✨ and 💫 exclusive live reactions.', 275, 80, '{"slot":"reaction"}'::jsonb);

ALTER TABLE public.coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coin_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coin_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_referral_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coin wallet read own" ON public.coin_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coin tx read own" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coin shop public read" ON public.coin_shop_items FOR SELECT USING (is_active = true);
CREATE POLICY "Coin inventory read own" ON public.user_coin_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coin equipment read own" ON public.user_coin_equipment FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coin equipment read public" ON public.user_coin_equipment FOR SELECT USING (true);
CREATE POLICY "Coin daily read own" ON public.coin_daily_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Referral code read own" ON public.coin_referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Referral code read by code" ON public.coin_referral_codes FOR SELECT USING (true);
CREATE POLICY "Referral redemption read involved" ON public.coin_referral_redemptions
  FOR SELECT USING (auth.uid() = referred_user_id OR auth.uid() = referrer_id);

CREATE POLICY "Admin coin wallets" ON public.coin_wallets
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
CREATE POLICY "Admin coin tx" ON public.coin_transactions
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
