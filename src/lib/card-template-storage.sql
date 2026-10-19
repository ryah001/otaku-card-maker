-- Configuration du stockage public des maquettes de carte.
-- À examiner puis exécuter une fois dans Supabase SQL Editor, après schema.sql.
-- Les fichiers sont des images publiques; seuls les admins autorisés peuvent
-- ajouter ou supprimer les fichiers dans le dossier templates/.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-templates',
  'card-templates',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read card template images" ON storage.objects;
CREATE POLICY "Public can read card template images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'card-templates' AND (storage.foldername(name))[1] = 'templates');

DROP POLICY IF EXISTS "Template admins can upload card template images" ON storage.objects;
CREATE POLICY "Template admins can upload card template images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'card-templates'
    AND (storage.foldername(name))[1] = 'templates'
    AND public.current_admin_has('manage_templates')
  );

DROP POLICY IF EXISTS "Template admins can delete card template images" ON storage.objects;
CREATE POLICY "Template admins can delete card template images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'card-templates'
    AND (storage.foldername(name))[1] = 'templates'
    AND public.current_admin_has('manage_templates')
  );
