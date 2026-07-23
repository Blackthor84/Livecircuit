-- Milestone 1: RLS hardening and tour stop mutations for artists

-- Tour stops: artist can manage stops on their tours
CREATE POLICY "Artist manages tour stops" ON public.tour_stops
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      JOIN public.artists a ON a.id = t.artist_id
      WHERE t.id = tour_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tours t
      JOIN public.artists a ON a.id = t.artist_id
      WHERE t.id = tour_id AND a.user_id = auth.uid()
    )
  );

-- Reactions
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions read" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Reactions insert auth" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments public read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Comments insert own" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Comments update own" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Likes insert" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Likes delete own" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews insert own" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reviews update own" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports insert auth" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reports read own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Order items (read via order ownership)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items via order" ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- Notifications: users cannot forge notifications for others
CREATE POLICY "Notifications insert own" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Artist genres
ALTER TABLE public.artist_genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artist genres read" ON public.artist_genres FOR SELECT USING (true);
CREATE POLICY "Artist manages genres" ON public.artist_genres FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

-- Product categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories read" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Artist manages categories" ON public.product_categories FOR ALL
  USING (
    artist_id IS NULL OR EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

-- Profiles: allow insert for trigger + self (signup edge cases)
CREATE POLICY "Service profile insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Storage buckets policy placeholder comment — configure in Supabase dashboard:
-- avatars (public read, auth upload own path)
-- artist-media, merch-images
