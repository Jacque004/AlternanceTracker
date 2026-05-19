import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import SupabaseConfigCheck from './components/SupabaseConfigCheck';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ConfirmSuccess from './pages/ConfirmSuccess';
import APropos from './pages/APropos';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConseilsCV from './pages/ConseilsCV';
import Coaching from './pages/Coaching';
import ModelesLettres from './pages/ModelesLettres';
import AnalyserOffre from './pages/AnalyserOffre';
import Applications from './pages/Applications';
import ApplicationForm from './pages/ApplicationForm';
import CalendarPage from './pages/Calendar';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import PreparerLayout from './pages/PreparerLayout';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite';
import CGU from './pages/CGU';
import HomeRoute from './pages/HomeRoute';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/AdminDashboard';
import { pageTitleFromPath } from './utils/documentTitle';

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
    <>
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
        </Router>
      </SupabaseAuthProvider>
    </>
  );
}

export default App;

