-- Le rôle authenticator précharge safeupdate, qui refuse un DELETE sans WHERE.
-- L'enregistrement de la visite guidée échouait donc en 400.

CREATE OR REPLACE FUNCTION public.admin_save_onboarding_steps(p_steps jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  idx integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : droits administrateur requis'
      USING ERRCODE = '42501';
  END IF;

  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' THEN
    RAISE EXCEPTION 'La visite doit être une liste d’étapes';
  END IF;

  IF jsonb_array_length(p_steps) > 30 THEN
    RAISE EXCEPTION '30 étapes au maximum';
  END IF;

  DELETE FROM public.onboarding_steps WHERE id IS NOT NULL;

  FOR item IN SELECT value FROM jsonb_array_elements(p_steps)
  LOOP
    IF coalesce(item->>'path', '') NOT LIKE '/%'
      OR char_length(coalesce(item->>'title', '')) NOT BETWEEN 1 AND 120
      OR char_length(coalesce(item->>'body', '')) NOT BETWEEN 1 AND 600
      OR char_length(coalesce(item->>'next_label', '')) NOT BETWEEN 1 AND 40
      OR char_length(coalesce(item->>'highlight', '')) NOT BETWEEN 1 AND 80
      OR char_length(coalesce(item->>'step_key', '')) NOT BETWEEN 1 AND 80
    THEN
      RAISE EXCEPTION 'Une étape est incomplète ou trop longue';
    END IF;

    INSERT INTO public.onboarding_steps (
      position, step_key, path, also_path, title, body, next_label, highlight,
      aside_path_prefix, aside_title, aside_body, aside_back_label
    )
    VALUES (
      idx,
      item->>'step_key',
      item->>'path',
      NULLIF(item->>'also_path', ''),
      item->>'title',
      item->>'body',
      item->>'next_label',
      item->>'highlight',
      NULLIF(item->>'aside_path_prefix', ''),
      NULLIF(item->>'aside_title', ''),
      NULLIF(item->>'aside_body', ''),
      NULLIF(item->>'aside_back_label', '')
    );
    idx := idx + 1;
  END LOOP;
END;
$$;
