# Registre des traitements

Document interne du responsable, Jacques Philippe LOEMBA. Il décrit les traitements du service AlternanceTracker au 20 octobre 2026. Article 30 du RGPD.

## 1. Compte et suivi de candidature

- **Finalité** : fournir le compte, le suivi des candidatures, les CV, les lettres, les analyses, la préparation d’entretien et les notifications demandées.
- **Base légale** : exécution du service demandé par la personne.
- **Personnes** : titulaires d’un compte.
- **Données** : identité, e-mail, profil de formation, candidatures, documents, photo, préférences.
- **Destinataires** : le responsable ; Supabase (base, auth, photo) à Paris, région eu-west-3.
- **Transferts** : la société Supabase est hors UE. Accès éventuel couvert par son contrat de sous-traitance et ses clauses contractuelles types, à accepter dans le compte Supabase.
- **Durée** : tant que le compte est utilisé. Après 24 mois sans ouverture, e-mail puis suppression 30 jours plus tard, pour les comptes qui ont accepté cette règle et si l’envoi d’e-mails est configuré.
- **Mesures** : accès limité au titulaire (RLS), mot de passe chiffré, HTTPS, photo dans un bucket privé.

## 2. Connexion Google

- **Finalité** : créer ou ouvrir la session sans mot de passe AlternanceTracker.
- **Base légale** : exécution du service, lorsque la personne choisit Google.
- **Données** : e-mail, nom, photo Google.
- **Destinataire** : Google.
- **Durée** : celle du compte. La photo Google reste hébergée par Google.

## 3. Aide à la rédaction

- **Finalité** : produire un texte demandé (CV, lettre, offre, entretien).
- **Base légale** : exécution de la demande.
- **Données** : extraits envoyés pour cette demande.
- **Destinataires** : Google (Gemini) ou OpenAI, selon la clé configurée.
- **Durée** : le résultat est enregistré dans le compte ; le prestataire d’IA ne reçoit que la demande en cours.
- **Mesure** : pas de décision automatique produisant un effet juridique.

## 4. E-mails de service

- **Finalité** : confirmation de compte, mot de passe, rappels, résumé hebdomadaire, avertissement avant suppression.
- **Base légale** : exécution du service pour les messages de compte ; intérêt légitime pour les rappels, avec interrupteur dans Mon espace. Le résumé hebdomadaire est désactivé par défaut.
- **Destinataires** : Supabase (messages de compte), Resend (rappels et avertissement).
- **Durée** : le message part au moment de l’envoi. Les journaux du prestataire suivent son propre délai.

## 5. Site public

- **Finalité** : afficher les pages, y compris le calendrier de rythme ouvert par un lien.
- **Base légale** : intérêt légitime pour la sécurité et le fonctionnement.
- **Données** : adresse IP et journaux techniques chez GitHub Pages. Le lien de calendrier ne contient le nom et l’école que si la personne le demande, et il est construit dans le navigateur.
- **Destinataire** : GitHub, Inc.
- **Durée** : celle des journaux de l’hébergeur du site.

## 6. Administration

- **Finalité** : gérer les rôles d’administration.
- **Base légale** : intérêt légitime du responsable.
- **Données vues** : nom, prénom, e-mail, date de création, rôle. Pas les CV ni les lettres.
- **Durée** : celle du compte.

## 7. Contrats à tenir à jour

Depuis chaque compte prestataire, accepter le contrat de sous-traitance :

- Supabase
- Google (connexion et, si la clé est utilisée, Gemini)
- OpenAI, si la clé est utilisée
- Resend, si les e-mails de rappel sont activés
- GitHub, pour l’hébergement des pages

## 8. Droits

Export JSON et suppression dans l’application. Rectification dans Mon espace et sur les candidatures. Opposition et limitation : jacquesloemba@outlook.fr. Réclamation : CNIL.
