import { Link } from 'react-router-dom';
import { legalConfig, legalProcessors } from '../config/legal';
import { formatDisplayDate } from '../utils/dateDisplay';

const PolitiqueConfidentialite = () => (
  <div className="max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold text-gray-900 mb-2">Politique de confidentialité</h1>
    <p className="text-sm text-gray-500 mb-6">
      Dernière mise à jour : {formatDisplayDate(legalConfig.lastLegalUpdate)}
      {' · '}
      Version {legalConfig.policyVersion}
    </p>
    <div className="prose prose-sm text-gray-700 space-y-4">
      <p>
        {legalConfig.serviceName} traite vos données personnelles dans le respect du Règlement
        général sur la protection des données (RGPD) et de la loi « Informatique et Libertés ».
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est :<br />
        <strong>{legalConfig.editorName}</strong>, {legalConfig.editorForm}.
      </p>
      <p>Adresse : {legalConfig.editorAddress}.</p>
      <p>
        Contact :{' '}
        <a href={`mailto:${legalConfig.contactEmail}`} className="text-primary-600 hover:underline">
          {legalConfig.contactEmail}
        </a>
      </p>
      <p>
        {legalConfig.contactWebsite && (
          <>
            Site web :{' '}
            <a href={legalConfig.contactWebsite} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              {legalConfig.contactWebsite}
            </a>
          </>
        )}
        {legalConfig.contactWebsite && legalConfig.contactLinkedIn && ' · '}
        {legalConfig.contactLinkedIn && (
          <>
            LinkedIn :{' '}
            <a href={legalConfig.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              {legalConfig.contactLinkedIn}
            </a>
          </>
        )}
      </p>
      <p>
        Aucun délégué à la protection des données n’est désigné. Pour exercer vos droits ou poser une
        question sur vos données, écrivez à l’adresse ci-dessus.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">2. Données collectées</h2>
      <p>Selon les fonctions que vous utilisez :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Compte</strong> : nom, prénom, adresse e-mail, mot de passe (stocké sous forme chiffrée par l’hébergeur), photo de profil envoyée par vous</li>
        <li><strong>Compte Google</strong> : si vous choisissez cette connexion, e-mail, nom et photo transmis par Google. Cette photo reste à l’adresse fournie par Google</li>
        <li><strong>Profil</strong> : école, formation, année, rythme, date de début souhaitée, lien LinkedIn, préférences d’offres et d’e-mails</li>
        <li><strong>Candidatures</strong> : entreprise, poste, statut, dates, notes, URL, historique des changements</li>
        <li><strong>Documents</strong> : CV, lettres, analyses, préparations d’entretien</li>
        <li><strong>Notifications</strong> : messages affichés dans l’application, et e-mails de service si vous les laissez actifs</li>
        <li><strong>Offres</strong> : recherches enregistrées pour les alertes e-mail, et identifiant de l’offre lorsque vous cliquez sur « Voir l’offre »</li>
        <li><strong>Calendrier de rythme</strong> : réglages, nom et école saisis, enregistrés dans ce navigateur uniquement</li>
        <li><strong>Connexion</strong> : date de dernière ouverture de l’application, utilisée pour la durée de conservation</li>
      </ul>
      <p className="text-sm text-gray-500 mt-2">
        Des données techniques (adresse IP, journaux) peuvent être traitées par l’hébergeur pour la sécurité
        et le fonctionnement du service. Il n’y a pas de cookie publicitaire ni de mesure d’audience.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">3. Finalités et bases légales</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Exécution du service demandé</strong> : compte, candidatures, CV, lettres, analyses,
          préparation d’entretien, calendrier de rythme, notifications et alertes d’offres que vous activez
        </li>
        <li>
          <strong>Intérêt légitime</strong> : sécurité du service, prévention des abus, statistiques internes
          des clics sur les offres, e-mails de rappel activés par défaut (vous pouvez les couper dans Mon espace)
        </li>
        <li>
          <strong>Obligation légale</strong> : réponse à une demande d’exercice de droits ou à une autorité
        </li>
      </ul>
      <p>
        La case cochée à l’inscription confirme que vous avez lu cette politique et que vous acceptez les
        conditions d’utilisation, dans la version indiquée en tête de page. Le traitement nécessaire au
        compte ne repose pas sur un consentement que vous pourriez retirer tout en continuant à utiliser
        le service : pour l’arrêter, supprimez le compte.
      </p>
      <p>
        Aucun e-mail de prospection n’est envoyé. Les textes produits par l’IA sont une aide : aucune
        décision n’est prise automatiquement à votre sujet.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">4. Calendrier partagé avec un recruteur</h2>
      <p>
        Le lien de calendrier est construit dans votre navigateur. Il n’est pas enregistré sur nos serveurs.
        Par défaut, il ne contient ni votre nom, ni votre école, ni votre e-mail. Si vous cochez l’option
        prévue à cet effet, le nom et l’école sont placés dans l’adresse du lien.
      </p>
      <p>
        Toute personne qui possède le lien peut ouvrir la page. L’adresse peut aussi rester dans l’historique
        du navigateur, dans un e-mail, ou dans les journaux de l’hébergeur du site. Vous choisissez à qui vous
        l’envoyez.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">5. Destinataires</h2>
      <p>
        Les données du compte sont accessibles au responsable du traitement et aux sous-traitants nécessaires
        au service :
      </p>
      <ul className="list-disc pl-6 space-y-1">
        {legalProcessors.map((processor) => (
          <li key={processor.name}>
            <strong>{processor.name}</strong> — {processor.role} Lieu : {processor.place}
          </li>
        ))}
      </ul>
      <p className="mt-2">
        L’hébergeur du site est <strong>{legalConfig.siteHostName}</strong>, {legalConfig.siteHostAddress}
        {' '}({legalConfig.siteUrl}). L’hébergeur des données est <strong>{legalConfig.hostName}</strong>,{' '}
        {legalConfig.hostAddress}. Les données du projet sont stockées à {legalConfig.dataRegion}. Les
        contenus envoyés à une IA se limitent à ce qui est nécessaire pour répondre à votre demande (par
        exemple un CV ou le texte d’une offre). Ils ne sont pas vendus.
      </p>
      <p>
        Le responsable du traitement voit, dans l’espace d’administration, le nom, le prénom et l’e-mail
        des comptes, afin de gérer les accès. Il n’y consulte pas les CV ni les lettres.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">6. Transferts hors de l’Union européenne</h2>
      <p>
        Les données du compte sont stockées à {legalConfig.dataRegion}. Supabase, GitHub, Google, OpenAI
        et Resend sont des sociétés qui peuvent accéder à des données depuis les États-Unis, ou d’autres
        pays, pour faire fonctionner leur service. Ces accès s’appuient sur les clauses contractuelles
        types incluses dans le contrat de sous-traitance de chaque prestataire. Le responsable accepte ce
        contrat depuis le compte ouvert chez le prestataire.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">7. Durée de conservation</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Compte actif</strong> : les données sont conservées tant que vous ouvrez le service.
        </li>
        <li>
          <strong>Inactivité</strong> : sans ouverture pendant {legalConfig.inactivityMonths} mois, un e-mail
          vous prévient {legalConfig.inactivityWarningDays} jours avant la suppression. La connexion pendant
          ce délai conserve le compte. Sans cet e-mail (envoi non configuré), le compte n’est pas effacé
          automatiquement. Cette règle vaut pour les comptes qui ont accepté la présente version de la
          politique.
        </li>
        <li>
          <strong>Suppression</strong> : le compte, les candidatures, CV, lettres, analyses, préparations,
          notifications, clics et la photo sont effacés. Les sauvegardes de Supabase sont ensuite écrasées
          selon la durée du plan (sauvegardes quotidiennes, conservation limitée par l’hébergeur). Elles ne
          servent pas à rouvrir un compte supprimé. Les journaux techniques de GitHub et de Supabase suivent
          la durée propre à chaque hébergeur, en général quelques jours à quelques mois.
        </li>
        <li>
          <strong>Navigateur</strong> : le calendrier de rythme reste dans le stockage local de cet appareil
          jusqu’à ce que vous effaciez les données du site, ou jusqu’à la suppression du compte depuis ce
          navigateur.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">8. Cookies et stockage local</h2>
      <p>
        La session est conservée dans le stockage local du navigateur pour vous maintenir connecté. Le
        calendrier de rythme et quelques préférences d’affichage y sont aussi enregistrés. Ces stockages sont
        nécessaires au service que vous demandez. Aucun traceur publicitaire n’est déposé, et aucun bandeau
        de consentement n’est affiché pour cette raison.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">9. Vos droits</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Accès et portabilité</strong> : bouton « Télécharger mes données » dans Mon espace (fichier JSON)</li>
        <li><strong>Rectification</strong> : Mon espace, et modification de vos candidatures</li>
        <li><strong>Effacement</strong> : « Supprimer mon compte » dans Mon espace, ou sur l’écran de confirmation si vous ne souhaitez pas accepter les documents</li>
        <li><strong>Opposition et limitation</strong> : par e-mail à {legalConfig.contactEmail}</li>
        <li><strong>E-mails de rappel</strong> : désactivation dans Mon espace, sans supprimer le compte</li>
      </ul>
      <p className="mt-2">
        Vous pouvez aussi introduire une réclamation auprès de la CNIL :{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
          www.cnil.fr
        </a>
        .
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">10. Sécurité</h2>
      <p>
        L’accès aux données du compte est limité au titulaire, sauf l’identité visible par le responsable
        dans l’administration. Le mot de passe n’est pas stocké en clair. Les échanges passent par une
        connexion chiffrée. La photo que vous envoyez est dans un espace privé : elle n’est affichée que
        par un lien temporaire créé pour votre session.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">11. Mineurs</h2>
      <p>
        Le service s’adresse aux personnes qui préparent une alternance. La création d’un compte demande de
        confirmer avoir au moins {legalConfig.minimumAge} ans. Il n’est pas destiné aux enfants plus jeunes.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">12. Modifications</h2>
      <p>
        Cette politique peut être modifiée. La date et la version figurent en tête de page. Quand la version
        change, une confirmation est demandée à la connexion suivante, avant d’utiliser le service. Vous
        pouvez aussi supprimer le compte depuis cet écran, sans accepter la nouvelle version.
      </p>

      <p className="mt-8 pt-4 border-t border-gray-200">
        <Link to="/register" className="text-primary-600 hover:underline">Retour à l&apos;inscription</Link>
        {' · '}
        <Link to="/cgu" className="text-primary-600 hover:underline">Conditions générales d&apos;utilisation</Link>
      </p>
    </div>
  </div>
);

export default PolitiqueConfidentialite;
