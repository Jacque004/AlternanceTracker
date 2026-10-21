import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Application } from '../types';
import { ApplicationsKanban } from './ApplicationsKanban';

const pending: Application = {
  id: 1,
  companyName: 'Acme',
  position: 'Développeur',
  status: 'pending',
  location: 'Lyon',
  applicationDate: '2020-01-15',
  createdAt: '2020-01-15',
};

const interview: Application = {
  id: 2,
  companyName: 'Nordic',
  position: 'Data',
  status: 'interview',
  interviewDate: '2026-03-20',
  interviewTime: '14:30',
};

function renderBoard(
  applications: Application[] = [pending, interview],
  props?: Partial<ComponentProps<typeof ApplicationsKanban>>
) {
  const onStatusChange = props?.onStatusChange ?? vi.fn().mockResolvedValue(undefined);
  const onMarkRelance = props?.onMarkRelance ?? vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <ApplicationsKanban
        applications={applications}
        onStatusChange={onStatusChange}
        onMarkRelance={onMarkRelance}
        movingId={props?.movingId ?? null}
      />
    </MemoryRouter>
  );
  return { onStatusChange, onMarkRelance };
}

describe('ApplicationsKanban', () => {
  it('affiche le pipeline et le signal de relance', () => {
    renderBoard();

    expect(screen.getByRole('region', { name: 'Envoyée, 1 candidature' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Entretien, 1 candidature' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'À postuler, 0 candidature' })).toBeInTheDocument();
    expect(screen.getByText('Lyon')).toBeInTheDocument();
    expect(screen.getByText('À relancer')).toBeInTheDocument();
    expect(screen.getByText('20/03/2026 · 14:30')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Acme/ })).toHaveAttribute('href', '/applications/1/edit');
    expect(screen.getByRole('link', { name: 'Préparer une lettre pour Acme' })).toHaveAttribute(
      'href',
      '/preparer/lettres?company=Acme&position=D%C3%A9veloppeur'
    );
  });

  it('déplace une carte vers une autre étape', () => {
    const { onStatusChange } = renderBoard();

    fireEvent.click(screen.getByRole('button', { name: /Déplacer Acme/ }));
    fireEvent.click(screen.getByRole('option', { name: /Entretien/ }));

    expect(onStatusChange).toHaveBeenCalledWith(1, 'interview');
  });

  it('enregistre une relance depuis la carte', () => {
    const { onMarkRelance } = renderBoard();

    fireEvent.click(screen.getByRole('button', { name: 'Relancer Acme' }));

    expect(onMarkRelance).toHaveBeenCalledWith(1);
  });

  it('ferme le menu avec Échap', () => {
    renderBoard();

    fireEvent.click(screen.getByRole('button', { name: /Déplacer Nordic/ }));
    expect(screen.getByRole('listbox', { name: /Nordic/ })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
