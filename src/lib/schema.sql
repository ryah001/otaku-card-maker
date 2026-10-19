-- Schéma Supabase HUNTERS ANIMES.
-- À exécuter dans le SQL Editor du projet avant d'activer l'authentification.

CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.card_id_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_hunter_card_id()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT 'HUNTER ' || lpad(nextval('public.card_id_seq')::text, 6, '0');
$$;

CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_number TEXT UNIQUE NOT NULL DEFAULT public.generate_hunter_card_id(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    color TEXT NOT NULL DEFAULT 'blue',
    username TEXT NOT NULL,
    real_name TEXT,
    nationality TEXT,
    status TEXT,
    genre TEXT,
    quote TEXT,
    photo_url TEXT,
    has_whatsapp_qr BOOLEAN NOT NULL DEFAULT false,
    whatsapp_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('idea', 'assumption', 'suggestion')),
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
    description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 3000),
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_memberships (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    can_read_suggestions BOOLEAN NOT NULL DEFAULT false,
    can_write_suggestions BOOLEAN NOT NULL DEFAULT false,
    can_edit_layout BOOLEAN NOT NULL DEFAULT false,
    can_manage_templates BOOLEAN NOT NULL DEFAULT false,
    can_publish_layout BOOLEAN NOT NULL DEFAULT false,
    can_manage_admins BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (can_read_suggestions OR can_write_suggestions OR can_edit_layout
      OR can_manage_templates OR can_publish_layout OR can_manage_admins)
);

CREATE OR REPLACE FUNCTION public.current_admin_has(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT CASE permission_name
      WHEN 'read_suggestions' THEN can_read_suggestions
      WHEN 'write_suggestions' THEN can_write_suggestions
      WHEN 'edit_layout' THEN can_edit_layout
      WHEN 'manage_templates' THEN can_manage_templates
      WHEN 'publish_layout' THEN can_publish_layout
      WHEN 'manage_admins' THEN can_manage_admins
      ELSE false
    END
    FROM public.admin_memberships
    WHERE user_id = (SELECT auth.uid())
  ), false);
$$;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membres visibles par leur propriétaire" ON public.members;
CREATE POLICY "Membres visibles par leur propriétaire"
  ON public.members FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Cartes visibles par tous" ON public.cards;
DROP POLICY IF EXISTS "Cartes lisibles par tous" ON public.cards;
CREATE POLICY "Cartes lisibles par tous"
  ON public.cards FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Création de carte possible" ON public.cards;
DROP POLICY IF EXISTS "Création de carte par le propriétaire" ON public.cards;
CREATE POLICY "Création de carte par le propriétaire"
  ON public.cards FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = cards.member_id
      AND members.auth_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Mise à jour par propriétaire" ON public.cards;
DROP POLICY IF EXISTS "Mise à jour de carte par le propriétaire" ON public.cards;
CREATE POLICY "Mise à jour de carte par le propriétaire"
  ON public.cards FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = cards.member_id
      AND members.auth_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = cards.member_id
      AND members.auth_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Suggestion personnelle ou lecture admin" ON public.suggestions;
CREATE POLICY "Suggestion personnelle ou lecture admin"
  ON public.suggestions FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.current_admin_has('read_suggestions')
  );

DROP POLICY IF EXISTS "Utilisateur authentifié peut proposer" ON public.suggestions;
CREATE POLICY "Utilisateur authentifié peut proposer"
  ON public.suggestions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin autorisé peut modérer" ON public.suggestions;
CREATE POLICY "Admin autorisé peut modérer"
  ON public.suggestions FOR UPDATE TO authenticated
  USING (public.current_admin_has('write_suggestions'))
  WITH CHECK (public.current_admin_has('write_suggestions'));

DROP POLICY IF EXISTS "Administrateur lit ses droits" ON public.admin_memberships;
CREATE POLICY "Administrateur lit ses droits"
  ON public.admin_memberships FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.current_admin_has('manage_admins')
  );

REVOKE ALL ON public.members, public.cards, public.suggestions, public.admin_memberships
  FROM anon, authenticated;
GRANT SELECT ON public.cards TO anon, authenticated;
GRANT SELECT ON public.members TO authenticated;
GRANT SELECT, INSERT ON public.suggestions TO authenticated;
GRANT UPDATE (status) ON public.suggestions TO authenticated;
GRANT SELECT ON public.admin_memberships TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.card_id_seq TO authenticated;

REVOKE ALL ON FUNCTION public.current_admin_has(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_admin_has(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS suggestions_touch_updated_at ON public.suggestions;
CREATE TRIGGER suggestions_touch_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- L'administration des rôles passe par ces RPC vérifiées côté base.
CREATE OR REPLACE FUNCTION public.list_admin_memberships()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  can_read_suggestions BOOLEAN,
  can_write_suggestions BOOLEAN,
  can_edit_layout BOOLEAN,
  can_manage_templates BOOLEAN,
  can_publish_layout BOOLEAN,
  can_manage_admins BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.current_admin_has('manage_admins') THEN
    RAISE EXCEPTION 'Permission refusée' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT memberships.user_id, users.email::text,
      memberships.can_read_suggestions,
      memberships.can_write_suggestions,
      memberships.can_edit_layout,
      memberships.can_manage_templates,
      memberships.can_publish_layout,
      memberships.can_manage_admins,
      memberships.created_at
    FROM public.admin_memberships AS memberships
    JOIN auth.users AS users ON users.id = memberships.user_id
    ORDER BY memberships.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_admin_by_email(
  target_email TEXT,
  allow_read BOOLEAN,
  allow_write BOOLEAN,
  allow_layout BOOLEAN,
  allow_templates BOOLEAN,
  allow_publish BOOLEAN,
  allow_manage BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF NOT public.current_admin_has('manage_admins') THEN
    RAISE EXCEPTION 'Permission refusée' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(74821046);
  IF NOT (allow_read OR allow_write OR allow_layout OR allow_templates
      OR allow_publish OR allow_manage) THEN
    RAISE EXCEPTION 'Accorde au moins une permission';
  END IF;
  SELECT users.id INTO target_user_id
    FROM auth.users AS users
    WHERE lower(users.email) = lower(trim(target_email))
    LIMIT 1;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte Google trouvé pour cette adresse';
  END IF;
  INSERT INTO public.admin_memberships (
    user_id, can_read_suggestions, can_write_suggestions, can_edit_layout,
    can_manage_templates, can_publish_layout, can_manage_admins
  ) VALUES (target_user_id, allow_read, allow_write, allow_layout,
    allow_templates, allow_publish, allow_manage)
  ON CONFLICT (user_id) DO UPDATE SET
    can_read_suggestions = EXCLUDED.can_read_suggestions,
    can_write_suggestions = EXCLUDED.can_write_suggestions,
    can_edit_layout = EXCLUDED.can_edit_layout,
    can_manage_templates = EXCLUDED.can_manage_templates,
    can_publish_layout = EXCLUDED.can_publish_layout,
    can_manage_admins = EXCLUDED.can_manage_admins;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin_by_email(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id UUID;
  target_can_manage BOOLEAN;
  manager_count BIGINT;
BEGIN
  IF NOT public.current_admin_has('manage_admins') THEN
    RAISE EXCEPTION 'Permission refusée' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(74821046);
  SELECT users.id INTO target_user_id
    FROM auth.users AS users
    WHERE lower(users.email) = lower(trim(target_email))
    LIMIT 1;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte Google trouvé pour cette adresse';
  END IF;
  SELECT memberships.can_manage_admins INTO target_can_manage
    FROM public.admin_memberships AS memberships
    WHERE memberships.user_id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ce compte n’a pas de rôle administrateur';
  END IF;
  SELECT count(*) INTO manager_count
    FROM public.admin_memberships AS memberships
    WHERE memberships.can_manage_admins;
  IF target_can_manage AND manager_count <= 1 THEN
    RAISE EXCEPTION 'Impossible de retirer le dernier gestionnaire';
  END IF;
  DELETE FROM public.admin_memberships WHERE user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_admin_memberships() FROM PUBLIC, anon;
DROP FUNCTION IF EXISTS public.grant_admin_by_email(TEXT, BOOLEAN, BOOLEAN, BOOLEAN);
REVOKE ALL ON FUNCTION public.grant_admin_by_email(TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_admin_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_memberships() TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_by_email(TEXT) TO authenticated;

-- Bootstrap initial à exécuter une seule fois après connexion du propriétaire avec Google:
-- INSERT INTO public.admin_memberships (user_id, can_read_suggestions, can_write_suggestions, can_edit_layout, can_manage_templates, can_publish_layout, can_manage_admins)
-- SELECT id, true, true, true, true, true, true FROM auth.users WHERE lower(email) = lower('ADRESSE_DU_PROPRIETAIRE');

-- Modèles de carte et mises en page:
-- Les versions en brouillon sont privées aux admins; les versions publiées sont publiques en lecture.
CREATE TABLE IF NOT EXISTS public.card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  asset_path TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.layout_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER GENERATED ALWAYS AS IDENTITY UNIQUE,
  layout_json JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Modèles actifs visibles" ON public.card_templates;
CREATE POLICY "Modèles actifs visibles"
  ON public.card_templates FOR SELECT TO anon, authenticated
  USING (is_active OR public.current_admin_has('manage_templates'));
DROP POLICY IF EXISTS "Admins gèrent les modèles" ON public.card_templates;
DROP POLICY IF EXISTS "Admins créent les modèles" ON public.card_templates;
DROP POLICY IF EXISTS "Admins modifient les modèles" ON public.card_templates;
DROP POLICY IF EXISTS "Admins suppriment les modèles" ON public.card_templates;
CREATE POLICY "Admins créent les modèles"
  ON public.card_templates FOR INSERT TO authenticated
  WITH CHECK (public.current_admin_has('manage_templates')
    AND (NOT is_active OR public.current_admin_has('publish_layout')));
CREATE POLICY "Admins modifient les modèles"
  ON public.card_templates FOR UPDATE TO authenticated
  USING (public.current_admin_has('manage_templates'))
  WITH CHECK (public.current_admin_has('manage_templates')
    AND (NOT is_active OR public.current_admin_has('publish_layout')));
CREATE POLICY "Admins suppriment les modèles"
  ON public.card_templates FOR DELETE TO authenticated
  USING (public.current_admin_has('manage_templates')
    AND (NOT is_active OR public.current_admin_has('publish_layout')));
DROP POLICY IF EXISTS "Mises en page publiées visibles" ON public.layout_versions;
CREATE POLICY "Mises en page publiées visibles"
  ON public.layout_versions FOR SELECT TO anon, authenticated
  USING (state = 'published' OR public.current_admin_has('edit_layout')
    OR public.current_admin_has('publish_layout'));
DROP POLICY IF EXISTS "Admins gèrent les mises en page" ON public.layout_versions;
DROP POLICY IF EXISTS "Admins créent les brouillons de mise en page" ON public.layout_versions;
DROP POLICY IF EXISTS "Admins modifient les brouillons" ON public.layout_versions;
DROP POLICY IF EXISTS "Admins publient les mises en page" ON public.layout_versions;
DROP POLICY IF EXISTS "Admins suppriment les brouillons" ON public.layout_versions;
DROP POLICY IF EXISTS "Admins suppriment les versions publiées" ON public.layout_versions;
CREATE POLICY "Admins créent les brouillons de mise en page"
  ON public.layout_versions FOR INSERT TO authenticated
  WITH CHECK (public.current_admin_has('edit_layout')
    AND state = 'draft' AND created_by = (SELECT auth.uid()));
CREATE POLICY "Admins modifient les brouillons"
  ON public.layout_versions FOR UPDATE TO authenticated
  USING (public.current_admin_has('edit_layout') AND state = 'draft')
  WITH CHECK (public.current_admin_has('edit_layout') AND state IN ('draft', 'archived'));
CREATE POLICY "Admins publient les mises en page"
  ON public.layout_versions FOR UPDATE TO authenticated
  USING (public.current_admin_has('publish_layout') AND state IN ('draft', 'published'))
  WITH CHECK (public.current_admin_has('publish_layout') AND state IN ('published', 'archived'));
CREATE POLICY "Admins suppriment les brouillons"
  ON public.layout_versions FOR DELETE TO authenticated
  USING (public.current_admin_has('edit_layout') AND state = 'draft');
CREATE POLICY "Admins suppriment les versions publiées"
  ON public.layout_versions FOR DELETE TO authenticated
  USING (public.current_admin_has('publish_layout') AND state = 'published');
REVOKE ALL ON public.card_templates, public.layout_versions FROM anon, authenticated;
GRANT SELECT ON public.card_templates, public.layout_versions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.card_templates, public.layout_versions TO authenticated;
