-- Milestone 6/7: event recordings bucket + lobby/VOD support

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-recordings',
  'event-recordings',
  true,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Event recordings public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'event-recordings');

CREATE POLICY "Artist uploads event recordings" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-recordings'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE a.user_id = auth.uid()
        AND (storage.foldername(name))[1] = e.id::text
    )
  );

CREATE POLICY "Artist updates event recordings" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-recordings'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE a.user_id = auth.uid()
        AND (storage.foldername(name))[1] = e.id::text
    )
  );

CREATE POLICY "Artist deletes event recordings" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-recordings'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE a.user_id = auth.uid()
        AND (storage.foldername(name))[1] = e.id::text
    )
  );
