// Validation côté client avec Zod-like validation

export interface ValidationError {
  field: string;
  message: string;
}

export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'L\'email est requis';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email invalide';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Le mot de passe est requis';
  }
  if (password.length < 6) {
    return 'Le mot de passe doit contenir au moins 6 caractères';
  }
  if (password.length > 100) {
    return 'Le mot de passe ne peut pas dépasser 100 caractères';
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

