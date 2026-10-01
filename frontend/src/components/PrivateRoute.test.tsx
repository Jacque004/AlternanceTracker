import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';

const mockUseSupabaseAuth = vi.fn();

vi.mock('../contexts/SupabaseAuthContext', () => ({
  useSupabaseAuth: () => mockUseSupabaseAuth(),
}));

describe('PrivateRoute', () => {
  it('affiche le contenu protege quand une session existe', () => {
    mockUseSupabaseAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/applications']}>
        <PrivateRoute>
          <div>Zone securisee</div>
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Zone securisee')).toBeInTheDocument();
  });

  it('redirige vers login sans session hors routes publiques', () => {
    mockUseSupabaseAuth.mockReturnValue({
      session: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/applications']}>
        <Routes>
          <Route path="/login" element={<h1>Connexion</h1>} />
          <Route
            path="/applications"
            element={
              <PrivateRoute>
                <div>Zone securisee</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(screen.queryByText('Zone securisee')).not.toBeInTheDocument();
  });

  it('laisse passer l accueil et a propos sans session, meme avec un slash final', () => {
    mockUseSupabaseAuth.mockReturnValue({
      session: null,
      loading: false,
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/a-propos/']}>
        <PrivateRoute>
          <div>Page publique</div>
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Page publique')).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/']}>
        <PrivateRoute>
          <div>Accueil public</div>
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Accueil public')).toBeInTheDocument();
  });
});

