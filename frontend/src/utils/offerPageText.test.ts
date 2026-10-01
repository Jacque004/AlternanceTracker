import { describe, expect, it } from 'vitest';
import { offerTextFromMetadata } from './jobOfferImport';
import {
  cleanJinaReaderText,
  formatFranceTravailOffer,
  franceTravailOfferId,
  mergeOfferTexts,
  offerTextFromSources,
} from './offerPageText';

const longMission = `Vous participez à la conception d’applications. `.repeat(40);

describe('texte complet d’une offre', () => {
  it('conserve toute la description JSON-LD, au-delà d’un extrait de 500 caractères', () => {
    const html = `<!DOCTYPE html><html><head>
      <script type="application/ld+json">
        ${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: 'Développeur en alternance',
          hiringOrganization: { '@type': 'Organization', name: 'Atelier' },
          description: `<p>Missions</p><p>${longMission}</p><p>Profil : Bac+3, compétence React exigée.</p>`,
          responsibilities: ['Développer l’API', 'Participer aux revues de code'],
          skills: ['React', 'TypeScript'],
        })}
      </script>
      <title>Développeur en alternance</title>
    </head><body><nav>Se connecter Accepter tout les cookies newsletter</nav></body></html>`;

    const text = offerTextFromSources(html);
    expect(text.length).toBeGreaterThan(500);
    expect(text).toContain('Développeur en alternance');
    expect(text).toContain('Atelier');
    expect(text).toContain('React');
    expect(text).toContain('Développer l’API');
    expect(text).not.toContain('Se connecter');
  });

  it('retire l’en-tête Jina et garde le corps de l’annonce', () => {
    const raw = `Title: Développeur
URL Source: https://exemple.fr/offre
Markdown Content:
# Développeur en alternance

Missions : concevoir le produit.
Profil recherché : alternance sur 24 mois, compétence en analyse.`;
    const text = cleanJinaReaderText(raw);
    expect(text).not.toMatch(/URL Source/i);
    expect(text).not.toMatch(/Markdown Content/i);
    expect(text).toContain('concevoir le produit');
    expect(text).toContain('Profil recherché');
  });

  it('reconnaît une fiche France Travail et ajoute les compétences absentes du paragraphe', () => {
    expect(franceTravailOfferId('https://candidat.francetravail.fr/offres/recherche/detail/214NTXV')).toBe('214NTXV');
    expect(franceTravailOfferId('https://exemple.fr/detail/214NTXV')).toBeNull();

    const text = formatFranceTravailOffer({
      intitule: 'Employé de rayon en alternance',
      description: 'Mise en rayon et accueil. Contrat en alternance.',
      entreprise: { nom: 'BOLLEDIS' },
      lieuTravail: { libelle: '72 - LE MANS' },
      competences: [
        { libelle: 'Gestion des stocks', exigence: 'E' },
        { libelle: 'Relation client', exigence: 'S' },
      ],
    });
    expect(text).toContain('BOLLEDIS');
    expect(text).toContain('Gestion des stocks (exigée)');
    expect(text).toContain('Relation client (souhaitée)');
    expect(text).toContain('Mise en rayon');
  });

  it('remplace un extrait collé par le texte complet récupéré', () => {
    const snippet = 'Missions : concevoir des applications en alternance pour un profil bac+3.';
    const full = `${snippet} Compétences : React, TypeScript, tests. Profil recherché : rigueur et travail en équipe sur le contrat d’alternance.`;
    expect(mergeOfferTexts(snippet, full)).toBe(full);
    expect(mergeOfferTexts(full, 'Se connecter. Accepter tout les cookies. Newsletter.')).toBe(full);
  });

  it('préfère le corps complet renvoyé par la récupération du lien', () => {
    const full = `${longMission}Profil recherché : alternance, compétence Java.`;
    const text = offerTextFromMetadata({
      companyName: 'Atelier',
      position: 'Développeur en alternance',
      descriptionSnippet: 'Extrait trop court pour une analyse.',
      offerText: full,
      pageTitle: null,
      jobUrl: 'https://exemple.fr/offre',
    });
    expect(text).toContain('Profil recherché');
    expect(text.length).toBeGreaterThan(500);
    expect(text).not.toContain('Extrait trop court');
  });
});
