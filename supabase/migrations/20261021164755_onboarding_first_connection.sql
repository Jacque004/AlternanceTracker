-- La visite guidée ne se relance plus après la première ouverture de session.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.users.onboarding_completed_at IS
  'Renseigné à la première ouverture de session. La visite guidée ne se relance plus ensuite.';

UPDATE public.users
SET onboarding_completed_at = COALESCE(last_seen_at, created_at, NOW())
WHERE onboarding_completed_at IS NULL;
