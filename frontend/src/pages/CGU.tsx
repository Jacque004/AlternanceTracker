import { Link } from 'react-router-dom';
import { legalConfig } from '../config/legal';

const CGU = () => (
  <div className="max-w-3xl mx-auto px-4 py-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-2">Conditions générales d'utilisation</h1>
    <p className="text-sm text-gray-500 mb-6">
      Dernière mise à jour : {new Date(legalConfig.lastLegalUpdate).toLocaleDateString('fr-FR')}
    </p>
    <div className="prose prose-sm text-gray-700 space-y-4">
      <p>
        Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation du
        service {legalConfig.serviceName} proposé par {legalConfig.editorName}.
      </p>
      <p>
        En créant un compte ou en utilisant le service, vous acceptez sans réserve les présentes CGU.
        Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le service.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">1. Éditeur du service</h2>
      <p>
        Le service {legalConfig.serviceName} est édité par :<br />
        <strong>{legalConfig.editorName}</strong>, {legalConfig.editorForm}.<br />
        Adresse : {legalConfig.editorAddress}.
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
          <>
            Site web:{' '}
            <a
              href={legalConfig.contactWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              {legalConfig.contactWebsite}
            </a>
          </>
        )}
        {legalConfig.contactWebsite && legalConfig.contactLinkedIn && ' · '}
        {legalConfig.contactLinkedIn && (
          <>
            LinkedIn:{' '}
            <a
              href={legalConfig.contactLinkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              {legalConfig.contactLinkedIn}
            </a>
          </>
        )}
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">2. Objet du service</h2>
      <p>{legalConfig.serviceName} est un outil d'aide à la recherche d'alternance permettant notamment :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>le suivi des candidatures (entreprises, postes, statuts, relances)</li>
        <li>la préparation et l'amélioration du CV (conseils, analyse ATS)</li>
        <li>la génération de lettres de motivation</li>
        <li>l'analyse d'offres d'emploi et des conseils de candidature</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">3. Inscription et compte</h2>
      <p>
        L'utilisation de certaines fonctionnalités nécessite la création d'un compte. Vous vous engagez à
        fournir des informations exactes et à maintenir à jour vos données. Vous êtes responsable de la
        confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.
      </p>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">4. Règles d'utilisation</h2>
      <p>Vous vous engagez à :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>utiliser le service de manière conforme aux lois et règlements en vigueur</li>
        <li>ne pas usurper l'identité d'autrui ni fournir de fausses informations</li>
        <li>ne pas tenter de porter atteinte au fonctionnement du service</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 text-gray-900">5. Données personnelles</h2>
      <p>
        Pour toute information sur le traitement de vos données personnelles et vos droits, veuillez
        consulter la{' '}
        <Link to="/politique-confidentialite" className="text-primary-600 hover:underline">
          Politique de confidentialité
        </Link>
        .
      </p>

      <p className="mt-8 pt-4 border-t border-gray-200">
        <Link to="/register" className="text-primary-600 hover:underline">
          Retour à l'inscription
        </Link>
        {' · '}
        <Link to="/politique-confidentialite" className="text-primary-600 hover:underline">
          Politique de confidentialité
        </Link>
      </p>
    </div>
  </div>
);

export default CGU;

