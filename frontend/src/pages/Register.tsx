import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import { validateRegisterForm } from '../utils/validation';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    acceptPrivacyPolicy: false,
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { signUp } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    const validationErrors = validateRegisterForm(formData);
    if (validationErrors.length > 0) {
      const errorsMap: Record<string, string> = {};
      validationErrors.forEach((error) => {
        errorsMap[error.field] = error.message;
      });
      setErrors(errorsMap);
      return;
    }
    if (!formData.acceptPrivacyPolicy || !formData.acceptTerms) {
      setErrors({
        acceptTerms: !formData.acceptTerms ? 'Vous devez accepter les conditions d\'utilisation' : '',
        acceptPrivacyPolicy: !formData.acceptPrivacyPolicy ? 'Vous devez accepter la politique de confidentialité' : '',
      });
      return;
    }

    setLoading(true);
    setErrors({});

    const consentDate = new Date().toISOString();
    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        {
          privacyPolicyAcceptedAt: consentDate,
          termsAcceptedAt: consentDate,
        }
      );
      
      if (error) {
        if (error.message.includes('email')) {
          setErrors({ email: 'Cet email est déjà utilisé' });
        }
        toast.error(error.message || 'Erreur lors de l\'inscription');
      } else {
        toast.success('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
        navigate('/login');
      }
    } catch (error: any) {
      toast.error('Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Créer un compte
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Démarrez votre suivi de candidatures en alternance
            </p>
            <p className="mt-4 text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded">
                Se connecter
              </Link>
            </p>
          </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                Prénom
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className={`mt-1 block w-full px-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.firstName}
                onChange={handleChange}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Nom
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className={`mt-1 block w-full px-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.lastName}
                onChange={handleChange}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`mt-1 block w-full px-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={`mt-1 block w-full px-3 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700">Consentements (RGPD)</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="acceptPrivacyPolicy"
                  checked={formData.acceptPrivacyPolicy}
                  onChange={handleChange}
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">
                  J'accepte la{' '}
                  <Link to="/politique-confidentialite" className="text-primary-600 hover:underline">
                    politique de confidentialité
                  </Link>{' '}
                  et le traitement de mes données personnelles.
                </span>
              </label>
              {errors.acceptPrivacyPolicy && (
                <p className="text-sm text-red-600">{errors.acceptPrivacyPolicy}</p>
              )}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">
                  J'accepte les{' '}
                  <Link to="/cgu" className="text-primary-600 hover:underline">
                    conditions générales d'utilisation
                  </Link>.
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-sm text-red-600">{errors.acceptTerms}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Inscription...
                </>
              ) : (
                'S\'inscrire'
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Register;

