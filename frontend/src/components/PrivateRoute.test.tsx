import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
        <PrivateRoute>
          <div>Zone securisee</div>
        </PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Zone securisee')).not.toBeInTheDocument();
  });
});

