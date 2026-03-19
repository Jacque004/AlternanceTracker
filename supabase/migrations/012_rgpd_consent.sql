-- RGPD : consentement et traçabilité
-- Politique de confidentialité, CGU, consentement marketing

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS marketing_emails_consent BOOLEAN DEFAULT false;

COMMENT ON COLUMN users.privacy_policy_accepted_at IS 'Date d''acceptation de la politique de confidentialité (RGPD)';
COMMENT ON COLUMN users.terms_accepted_at IS 'Date d''acceptation des conditions générales d''utilisation';
COMMENT ON COLUMN users.marketing_emails_consent IS 'Consentement aux emails marketing (optionnel, distinct des notifications de service)';
