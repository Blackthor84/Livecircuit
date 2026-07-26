-- Artist media, verification requests, follower counts, storage

CREATE TABLE IF NOT EXISTS public.artist_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('gallery', 'video', 'album')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_media_artist ON public.artist_media(artist_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_artist ON public.verification_requests(artist_id);

ALTER TABLE public.artist_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist media public read" ON public.artist_media FOR SELECT USING (true);
CREATE POLICY "Artist manages media" ON public.artist_media FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Verification read own" ON public.verification_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Verification insert own" ON public.verification_requests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.sync_artist_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.artists SET follower_count = follower_count + 1 WHERE id = NEW.artist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.artists SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.artist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_follower_change ON public.followers;
CREATE TRIGGER on_follower_change
  AFTER INSERT OR DELETE ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.sync_artist_follower_count();

CREATE TRIGGER set_updated_at_artist_media
  BEFORE UPDATE ON public.artist_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_verification_requests
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage buckets (Supabase Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('artist-media', 'artist-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar upload own folder" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar update own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artist media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'artist-media');

CREATE POLICY "Artist media upload own" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artist-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Artist media update own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'artist-media' AND auth.uid()::text = (storage.foldername(name))[1]);
