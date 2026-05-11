-- Durcissement : la création de profil via RPC ne doit pas être invoquée par le rôle anon.
REVOKE EXECUTE ON FUNCTION public.ensure_user_profile() FROM anon;
