import axios from 'axios';
import { User, Application, DashboardStatistics } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error: { response?: { status?: number } }) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await api.post('/auth/register', { email, password, firstName, lastName });
    return response.data;
  },
};

export const userService = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/users/profile', data);
    return response.data.user;
  },
};

export const applicationService = {
  getAll: async (status?: string): Promise<Application[]> => {
    const params = status ? { status } : {};
    const response = await api.get('/applications', { params });
    return response.data;
  },
  getById: async (id: number): Promise<Application> => {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },
  create: async (data: Partial<Application>): Promise<Application> => {
    const response = await api.post('/applications', data);
    return response.data.application;
  },
  update: async (id: number, data: Partial<Application>): Promise<Application> => {
    const response = await api.patch(`/applications/${id}`, data);
    return response.data.application;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/applications/${id}`);
  },
};

export const dashboardService = {
  getStatistics: async (): Promise<DashboardStatistics> => {
    const response = await api.get('/dashboard/statistics');
    return response.data;
  },
  getRecent: async (limit: number = 5): Promise<Application[]> => {
    const response = await api.get('/dashboard/recent', { params: { limit } });
    return response.data;
  },
};

export const aiService = {
  generateCoverLetter: async (data: {
    companyName: string;
    position: string;
    userInfo?: string;
    additionalContext?: string;
  }): Promise<string> => {
    const response = await api.post('/ai/cover-letter', data);
    return response.data.coverLetter;
  },
};

export default api;

