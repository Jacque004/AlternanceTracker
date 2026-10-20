import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RhythmSharePage from './RhythmShare';

function renderShare(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/rythme/partage${search}`]}>
      <Routes>
        <Route path="/rythme/partage" element={<RhythmSharePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('page recruteur', () => {
  it('montre la Toussaint en entreprise et la reprise à l école', () => {
    const { container } = renderShare(
      '?z=A&mode=d&wd=12&sw=1&cw=1&fb=s&du=12&sd=2026-09-01&n=Camille%20Martin'
    );

    expect(screen.getByRole('heading', { level: 1, name: /Calendrier d'alternance/ })).toBeInTheDocument();
    expect(screen.getByText('Camille Martin')).toBeInTheDocument();
    // Le sélecteur d'attribut évite getByRole sur les ~400 jours : ce calcul dépasse le délai du test.
    expect(
      container.querySelector(
        '[aria-label="19 octobre 2026, Entreprise, école fermée (vacances de la Toussaint)"]'
      )
    ).toBeTruthy();
    expect(container.querySelector('[aria-label="2 novembre 2026, École"]')).toBeTruthy();
  });

  it('refuse un lien incomplet', () => {
    renderShare('?z=A');
    expect(screen.getByRole('heading', { level: 1, name: /Calendrier introuvable/ })).toBeInTheDocument();
  });
});
