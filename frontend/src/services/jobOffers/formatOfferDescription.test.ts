import { describe, expect, it } from 'vitest';
import { parseOfferDescription } from './formatOfferDescription';

describe('parseOfferDescription', () => {
  it('met chaque mission séparée par un point-virgule sur sa ligne', () => {
    const sections = parseOfferDescription(
      'Présentation du poste. Tes missions : Accueillir les clients ; Prendre les commandes ; Préparer les commandes.'
    );
    const missions = sections.find((section) => section.title === 'Tes missions');
    expect(missions?.items).toEqual([
      'Accueillir les clients',
      'Prendre les commandes',
      'Préparer les commandes.',
    ]);
  });

  it('sépare les missions collées et les tirets', () => {
    const sections = parseOfferDescription(
      'Contexte Vous interviendrez chez le client. Missions clés - Installer les serveurs - Assurer le suivi - Rédiger les procédures'
    );
    expect(sections[0]).toMatchObject({
      title: 'Contexte',
      paragraphs: ['Vous interviendrez chez le client.'],
    });
    expect(sections[1]).toMatchObject({
      title: 'Missions clés',
      items: ['Installer les serveurs', 'Assurer le suivi', 'Rédiger les procédures'],
    });
  });

  it('détache un titre collé au paragraphe et les puces HTML', () => {
    const sections = parseOfferDescription(
      "<p>Description de l'entreprise</p><p>Wavestone est un cabinet de conseil.</p><ul><li>Suivre les certificats</li><li>Administrer l’outil</li></ul>"
    );
    expect(sections[0]).toMatchObject({
      title: "Description de l'entreprise",
      paragraphs: ['Wavestone est un cabinet de conseil.'],
      items: ['Suivre les certificats', 'Administrer l’outil'],
    });
  });

  it('présente une fiche avec titres, missions numérotées et listes', () => {
    const sections = parseOfferDescription(`
Description de l'entreprise :
Nous sommes un groupement d'installateurs.

Description de l'emploi :
Les Associés migrent vers XRP Flex.

Vos missions :
Le stage s'articule autour de 3 volets complémentaires :
1. Compréhension et cartographie de la base SQL Server
Analyser l'architecture de la base.
Réaliser une cartographie complète.
2. Migration de la base de données
Élaborer une stratégie de migration.

Compétences requises :
SQL Server : maîtrise avancée de T-SQL.
MySQL / MariaDB : connaissance approfondie.

Profil :
Étudiant en école d'ingénieur.
Rigoureux, autonome et curieux.

Rémunération : 0,10€ par mois

Avantages :
Prise en charge du transport quotidien
Travail à domicile occasionnel

Lieu du poste : En présentiel
`);

    expect(sections.map((section) => section.title)).toEqual([
      "Description de l'entreprise",
      "Description de l'emploi",
      'Vos missions',
      'Compétences requises',
      'Profil',
      'Rémunération',
      'Avantages',
      'Lieu du poste',
    ]);
    expect(sections[0].paragraphs).toEqual(["Nous sommes un groupement d'installateurs."]);
    expect(sections[2].paragraphs).toEqual(["Le stage s'articule autour de 3 volets complémentaires :"]);
    expect(sections[2].groups).toEqual([
      {
        title: '1. Compréhension et cartographie de la base SQL Server',
        items: ["Analyser l'architecture de la base.", 'Réaliser une cartographie complète.'],
      },
      {
        title: '2. Migration de la base de données',
        items: ['Élaborer une stratégie de migration.'],
      },
    ]);
    expect(sections[3].items).toEqual([
      'SQL Server : maîtrise avancée de T-SQL.',
      'MySQL / MariaDB : connaissance approfondie.',
    ]);
    expect(sections[5].paragraphs).toEqual(['0,10€ par mois']);
    expect(sections[6].items).toEqual([
      'Prise en charge du transport quotidien',
      'Travail à domicile occasionnel',
    ]);
    expect(sections[7].paragraphs).toEqual(['En présentiel']);
  });

  it('coupe les phrases de mission collées sans séparateur', () => {
    const [section] = parseOfferDescription(
      'Missions : Accueillir les clients par la vente de services Mettre en valeur les produits Assurer la tenue du magasin'
    );
    expect(section.title).toBe('Missions');
    expect(section.items).toEqual([
      'Accueillir les clients par la vente de services',
      'Mettre en valeur les produits',
      'Assurer la tenue du magasin',
    ]);
  });
});
