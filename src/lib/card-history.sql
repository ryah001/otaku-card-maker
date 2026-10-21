-- Historique privé des cartes téléchargées par compte Google.
CREATE TABLE IF NOT EXISTS public.card_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Carte Otaku',
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout_data JSONB,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS card_history_user_created_idx ON public.card_history (user_id, created_at DESC);
ALTER TABLE public.card_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own card history" ON public.card_history;
CREATE POLICY "Users read own card history" ON public.card_history FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Users insert own card history" ON public.card_history;
CREATE POLICY "Users insert own card history" ON public.card_history FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Users delete own card history" ON public.card_history;
CREATE POLICY "Users delete own card history" ON public.card_history FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.card_history FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.card_history TO authenticated;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('card-history', 'card-history', false, 10485760, ARRAY['image/png']::text[])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['image/png']::text[];
DROP POLICY IF EXISTS "Card history images read by owner" ON storage.objects;
CREATE POLICY "Card history images read by owner" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'card-history' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS "Card history images uploaded by owner" ON storage.objects;
CREATE POLICY "Card history images uploaded by owner" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'card-history' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS "Card history images deleted by owner" ON storage.objects;
CREATE POLICY "Card history images deleted by owner" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'card-history' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
