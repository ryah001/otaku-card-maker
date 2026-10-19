-- Ajoute un identifiant permanent par compte Google.
-- À examiner puis exécuter une fois après schema.sql.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS card_number TEXT;

-- Préserve le numéro d'une carte existante lorsqu'un membre en possède déjà une.
UPDATE public.members AS member
SET card_number = COALESCE(
  (
    SELECT card.card_number
    FROM public.cards AS card
    WHERE card.member_id = member.id
    ORDER BY card.created_at, card.id
    LIMIT 1
  ),
  public.generate_hunter_card_id()
)
WHERE member.card_number IS NULL;

ALTER TABLE public.members
  ALTER COLUMN card_number SET DEFAULT public.generate_hunter_card_id(),
  ALTER COLUMN card_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_card_number_unique
  ON public.members (card_number);

CREATE OR REPLACE FUNCTION public.ensure_current_member()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  member_card_number TEXT;
  member_display_name TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT member.card_number
    INTO member_card_number
    FROM public.members AS member
    WHERE member.auth_user_id = current_user_id;

  IF member_card_number IS NOT NULL THEN
    RETURN member_card_number;
  END IF;

  member_display_name := COALESCE(
    NULLIF(auth.jwt() ->> 'name', ''),
    NULLIF(auth.jwt() ->> 'email', ''),
    'Membre'
  );

  INSERT INTO public.members (auth_user_id, display_name)
  VALUES (current_user_id, member_display_name)
  ON CONFLICT (auth_user_id) DO NOTHING;

  SELECT member.card_number
    INTO member_card_number
    FROM public.members AS member
    WHERE member.auth_user_id = current_user_id;

  IF member_card_number IS NULL THEN
    RAISE EXCEPTION 'Unable to assign member card number';
  END IF;

  RETURN member_card_number;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_current_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_member() TO authenticated;
