import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import SupabaseConfigCheck from './components/SupabaseConfigCheck';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ConfirmSuccess from './pages/ConfirmSuccess';
import APropos from './pages/APropos';
import ConseilsCV from './pages/ConseilsCV';
import Coaching from './pages/Coaching';
import ModelesLettres from './pages/ModelesLettres';
import AnalyserOffre from './pages/AnalyserOffre';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import ApplicationForm from './pages/ApplicationForm';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import PreparerLayout from './pages/PreparerLayout';

function App() {
  return (
    <>
      <SupabaseConfigCheck />
      <SupabaseAuthProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: '!rounded-xl !shadow-card-hover !border !border-gray-200',
              success: { iconTheme: { primary: '#0284c7', secondary: '#ffffff' } },
              error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/confirm-success" element={<ConfirmSuccess />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
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
              <Route path="profile" element={<Profile />} />
              <Route path="a-propos" element={<APropos />} />
            </Route>
          </Routes>
        </Router>
      </SupabaseAuthProvider>
    </>
  );
}

export default App;

