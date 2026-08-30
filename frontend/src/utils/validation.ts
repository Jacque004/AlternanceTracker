// Validation côté client avec Zod-like validation

export interface ValidationError {
  field: string;
  message: string;
}

// Regex stricte pour validation email (RFC 5322 simplifié)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Domaines d'email jetables les plus courants (sous-ensemble de la liste backend)
const COMMON_DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'mohmal.com',
  'trashmail.com',
  'maildrop.cc',
  'getnada.com',
  'sharklasers.com',
  'mintemail.com',
  'fakeinbox.com',
  'mailnesia.com',
  'tempinbox.com',
  'throwawaymail.com',
  'spamgourmet.com',
  'mytemp.email',
  'spam4.me',
  'emailondeck.com',
  'binkmail.com',
  'getairmail.com',
  'dumpmail.de',
  'wegwerfmail.de',
  'trashmail.de',
  'tmpmail.net',
  'dropmail.me',
  'tempr.email',
  'spambox.us',
  'burnermail.io',
  'throwaway.link',
]);

export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'L\'email est requis';
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Vérifier la longueur
  if (trimmedEmail.length > 254) {
    return 'L\'email ne peut pas dépasser 254 caractères';
  }

  // Vérifier le format avec regex stricte
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return 'Format d\'email invalide';
  }

  // Extraire le domaine
  const domain = trimmedEmail.split('@')[1];

  if (!domain) {
    return 'Email invalide';
  }

  // Vérifier les caractères interdits dans le domaine
  if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
    return 'Domaine d\'email invalide';
  }

  // Vérifier si c'est un domaine jetable
  if (COMMON_DISPOSABLE_DOMAINS.has(domain)) {
    return 'Les adresses email temporaires ne sont pas autorisées';
  }

  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Le mot de passe est requis';
  }
  if (password.length < 12) {
    return 'Le mot de passe doit contenir au moins 12 caractères';
  }
  if (password.length > 128) {
    return 'Le mot de passe ne peut pas dépasser 128 caractères';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule';
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une minuscule';
  }
  if (!/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un caractère spécial (@, #, $, etc.)';
  }
  return null;
};

export const validateName = (name: string, fieldName: string): string | null => {
  if (!name || name.trim().length === 0) {
    return `${fieldName} est requis`;
  }
  if (name.length > 100) {
    return `${fieldName} ne peut pas dépasser 100 caractères`;
  }
  return null;
};

export const validateRegisterForm = (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }

  const passwordError = validatePassword(data.password);
  if (passwordError) {
    errors.push({ field: 'password', message: passwordError });
  }

  const firstNameError = validateName(data.firstName, 'Le prénom');
  if (firstNameError) {
    errors.push({ field: 'firstName', message: firstNameError });
  }

  const lastNameError = validateName(data.lastName, 'Le nom');
  if (lastNameError) {
    errors.push({ field: 'lastName', message: lastNameError });
  }

  return errors;
};

