import { Link } from 'react-router-dom';
import { legalConfig } from '../config/legal';
import { formatDisplayDate } from '../utils/dateDisplay';

const PolitiqueConfidentialite = () => (
  <div className="max-w-3xl mx-auto px-4 py-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-2">Politique de confidentialité</h1>
    <p className="text-sm text-gray-500 mb-6">
      Dernière mise à jour : {formatDisplayDate(legalConfig.lastLegalUpdate)}
    </p>
    <div className="prose prose-sm text-gray-700 space-y-4">
      <p>
        {legalConfig.serviceName} traite vos données personnelles dans le respect du Règlement
        général sur la protection des données (RGPD) et de la loi « Informatique et Libertés ».
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est :<br />
        <strong>{legalConfig.editorName}</strong>, {legalConfig.editorForm}.
      </p>
      <p>
        Adresse : {legalConfig.editorAddress}.
      </p>
      <p>
        {legalConfig.editorName} est responsable du traitement des données personnelles collectées sur ce site,
        notamment pour la gestion des candidatures, des contacts professionnels et des informations liées à son
        parcours et ses expériences professionnelles.
      </p>
      <p>
        Contact :{' '}
        <a
          href={`mailto:${legalConfig.contactEmail}`}
          className="text-primary-600 hover:underline"
        >
          {legalConfig.contactEmail}
        </a>
      </p>
      <p>
        {legalConfig.contactWebsite && (
          <>Site web : <a href={legalConfig.contactWebsite} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{legalConfig.contactWebsite}</a></>
        )}
        {legalConfig.contactWebsite && legalConfig.contactLinkedIn && ' · '}
        {legalConfig.contactLinkedIn && (
          <>LinkedIn : <a href={legalConfig.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{legalConfig.contactLinkedIn}</a></>
        )}
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">2. Délégué à la protection des données (DPO)</h2>
      <p>
        Pour toute question relative à vos données personnelles ou pour exercer vos droits, vous
        pouvez contacter notre délégué à la protection des données à l'adresse :{' '}
        <a href={`mailto:${legalConfig.dpoEmail}`} className="text-primary-600 hover:underline">{legalConfig.dpoEmail}</a>
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">3. Données collectées</h2>
      <p>Nous collectons les données que vous nous fournissez :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Identité et contact</strong> : nom, prénom, adresse email</li>
        <li><strong>Profil étudiant</strong> : école, formation, année, rythme d'alternance, date de début souhaitée, lien LinkedIn</li>
        <li><strong>Candidatures</strong> : entreprise, poste, statut, dates, notes, URL de l'offre</li>
        <li><strong>CV</strong> : contenu des CV que vous saisissez ou importez</li>
        <li><strong>Lettres de motivation</strong> : lettres générées ou enregistrées</li>
        <li><strong>Analyses</strong> : résultats des analyses CV (conseils, score ATS)</li>
        <li><strong>Préférences</strong> : consentements (politique de confidentialité, CGU, marketing), préférences de notifications</li>
      </ul>
      <p className="text-sm text-gray-500 mt-2">
        Les données de connexion (adresse IP, logs) peuvent être traitées pour la sécurité et le bon fonctionnement du service.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">4. Finalités et base légale</h2>
      <p>Le traitement a pour finalités :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Fourniture du service (suivi des candidatures, conseils CV, génération de lettres, notifications)</li>
        <li>Gestion de votre compte et de l'authentification</li>
        <li>Respect de nos obligations légales et exercice de vos droits</li>
        <li>Envoi de communications marketing, uniquement si vous y avez consenti</li>
      </ul>
      <p className="mt-2">
        La base légale est l'exécution du contrat (service demandé), notre intérêt légitime (sécurité, amélioration du service)
        et, pour les consentements optionnels (marketing), votre consentement.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">5. Destinataires et hébergement</h2>
      <p>
        Les données sont accessibles aux seules personnes habilitées au sein de {legalConfig.editorName} et aux
        sous-traitants strictement nécessaires au fonctionnement du service.
      </p>
      <p>
        Les données sont hébergées par : <strong>{legalConfig.hostName}</strong>, {legalConfig.hostAddress}.
        Des traitements (par exemple analyse de texte pour l'IA) peuvent être réalisés via des prestataires
        (ex. OpenAI) selon les fonctionnalités utilisées ; les données sont alors traitées conformément à leurs
        politiques de confidentialité et engagements contractuels.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">6. Durée de conservation</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Compte actif</strong> : vos données sont conservées tant que votre compte est actif, et au plus
          pendant {legalConfig.dataRetentionMonths} mois après votre dernière activité, sauf obligation légale de conservation.
        </li>
        <li>
          <strong>Après suppression du compte</strong> : certaines données peuvent être conservées en sauvegarde
          ou pour des obligations légales pendant une durée maximale de {legalConfig.dataRetentionAfterDeletionMonths} mois,
          puis supprimées de manière irréversible.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">7. Vos droits</h2>
      <p>Vous disposez des droits suivants :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Droit de rectification</strong> : faire corriger des données inexactes (depuis Mon profil)</li>
        <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données (suppression du compte depuis Mon profil)</li>
        <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré (bouton « Télécharger mes données » dans Mon profil)</li>
        <li><strong>Droit d'opposition</strong> et <strong>limitation du traitement</strong> dans les cas prévus par le RGPD</li>
      </ul>
      <p className="mt-2">
        Pour exercer ces droits, contactez-nous à {legalConfig.dpoEmail} ou via Mon profil. Vous disposez également
        du droit d'introduire une réclamation auprès de la CNIL :{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">www.cnil.fr</a>.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">8. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées (accès restreint,
        chiffrement, politiques de sécurité) pour protéger vos données contre l'accès non autorisé, la perte
        ou l'altération.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">9. Modifications</h2>
      <p>
        Cette politique peut être modifiée. La date de dernière mise à jour est indiquée en tête de page.
        En cas de changement substantiel, nous vous en informerons (par exemple par email ou message dans l'application).
      </p>

      <p className="mt-8 pt-4 border-t border-gray-200">
        <Link to="/register" className="text-primary-600 hover:underline">Retour à l'inscription</Link>
        {' · '}
        <Link to="/cgu" className="text-primary-600 hover:underline">Conditions générales d'utilisation</Link>
      </p>
    </div>
  </div>
);

export default PolitiqueConfidentialite;
