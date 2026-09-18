import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import SupabaseConfigCheck from './components/SupabaseConfigCheck';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import RouteFallback from './components/RouteFallback';
import Login from './pages/Login';
import Register from './pages/Register';
import { queryClient } from './query/client';
import { pageTitleFromPath } from './utils/documentTitle';

const ConfirmSuccess = lazy(() => import('./pages/ConfirmSuccess'));
const APropos = lazy(() => import('./pages/APropos'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ConseilsCV = lazy(() => import('./pages/ConseilsCV'));
const Coaching = lazy(() => import('./pages/Coaching'));
const ModelesLettres = lazy(() => import('./pages/ModelesLettres'));
const AnalyserOffre = lazy(() => import('./pages/AnalyserOffre'));
const Applications = lazy(() => import('./pages/Applications'));
const ApplicationForm = lazy(() => import('./pages/ApplicationForm'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const Profile = lazy(() => import('./pages/Profile'));
const PreparerLayout = lazy(() => import('./pages/PreparerLayout'));
const PolitiqueConfidentialite = lazy(() => import('./pages/PolitiqueConfidentialite'));
const CGU = lazy(() => import('./pages/CGU'));
const HomeRoute = lazy(() => import('./pages/HomeRoute'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminRoute = lazy(() => import('./components/AdminRoute'));

function RouteTitle() {
  const location = useLocation();
  useEffect(() => {
    const raw = pageTitleFromPath(location.pathname);
    document.title =
      raw === 'AlternanceTracker' ? 'AlternanceTracker' : `${raw} · AlternanceTracker`;
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseConfigCheck />
      <SupabaseAuthProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <RouteTitle />
          <Toaster
            position="top-center"
            containerStyle={{
              top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            }}
            toastOptions={{
              duration: 4200,
              className: '!rounded-xl !shadow-card-hover !border !border-gray-200 !text-sm',
              style: {
                maxWidth: 'min(calc(100dvw - 1.5rem), 22rem)',
              },
              success: { iconTheme: { primary: '#0284c7', secondary: '#ffffff' } },
              error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' }, duration: 5500 },
            }}
          />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
              <Route path="/cgu" element={<CGU />} />
              <Route path="/auth/confirm-success" element={<ConfirmSuccess />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route index element={<HomeRoute />} />
                <Route path="preparer" element={<PreparerLayout />}>
                  <Route index element={<Navigate to="/preparer/cv" replace />} />
                  <Route path="cv" element={<ConseilsCV />} />
                  <Route path="lettres" element={<ModelesLettres />} />
                  <Route path="analyser-offre" element={<AnalyserOffre />} />
                  <Route path="conseils" element={<Coaching />} />
                </Route>
                <Route path="conseils-cv" element={<Navigate to="/preparer/cv" replace />} />
                <Route path="mon-cv" element={<Navigate to="/preparer/cv" replace />} />
                <Route path="coaching" element={<Navigate to="/preparer/conseils" replace />} />
                <Route path="modeles-lettres" element={<Navigate to="/preparer/lettres" replace />} />
                <Route path="analyser-offre" element={<Navigate to="/preparer/analyser-offre" replace />} />
                <Route path="applications" element={<Applications />} />
                <Route path="applications/new" element={<ApplicationForm />} />
                <Route path="applications/:id/edit" element={<ApplicationForm />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="profile" element={<Profile />} />
                <Route path="aide/notifications" element={<Navigate to="/profile#notifications" replace />} />
                <Route path="a-propos" element={<APropos />} />
                <Route
                  path="admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </SupabaseAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
