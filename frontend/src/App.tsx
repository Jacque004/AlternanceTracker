import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import SupabaseConfigCheck from './components/SupabaseConfigCheck';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ConseilsCV from './pages/ConseilsCV';
import Coaching from './pages/Coaching';
import ModelesLettres from './pages/ModelesLettres';
import AnalyserOffre from './pages/AnalyserOffre';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import ApplicationForm from './pages/ApplicationForm';
import Profile from './pages/Profile';
import Layout from './components/Layout';

function App() {
  return (
    <>
      <SupabaseConfigCheck />
      <SupabaseAuthProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="conseils-cv" element={<ConseilsCV />} />
              <Route path="coaching" element={<Coaching />} />
              <Route path="modeles-lettres" element={<ModelesLettres />} />
              <Route path="analyser-offre" element={<AnalyserOffre />} />
              <Route path="applications" element={<Applications />} />
              <Route path="applications/new" element={<ApplicationForm />} />
              <Route path="applications/:id/edit" element={<ApplicationForm />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Router>
      </SupabaseAuthProvider>
    </>
  );
}

export default App;

