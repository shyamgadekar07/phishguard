import api from './api.js';

export const authService = {
  /**
   * Register a new trainee account.
   * @param {{ name: string, email: string, password: string, department?: string }} userData
   */
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Log in with email and password.
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.data?.token) {
      localStorage.setItem('phishguard_token', response.data.data.token);
      localStorage.setItem('phishguard_user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  /**
   * Fetch current authenticated user's profile from /auth/me.
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    if (response.data?.data?.user) {
      localStorage.setItem('phishguard_user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  /**
   * Log out and clear stored session tokens.
   */
  logout() {
    localStorage.removeItem('phishguard_token');
    localStorage.removeItem('phishguard_user');
  },

  /**
   * Get currently saved token.
   */
  getToken() {
    return localStorage.getItem('phishguard_token');
  },

  /**
   * Get cached user profile object.
   */
  getStoredUser() {
    const raw = localStorage.getItem('phishguard_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};

export default authService;
