import { Link } from 'react-router-dom';

const ConfirmSuccess = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-6">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Email confirmé
          </h1>
          <p className="text-gray-600 mb-6">
            Votre compte AlternanceTracker est activé. Vous pouvez maintenant vous connecter et commencer à suivre vos candidatures.
          </p>
          <Link
            to="/login"
            className="inline-flex justify-center items-center w-full py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSuccess;
