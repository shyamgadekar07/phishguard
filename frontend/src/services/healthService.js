import api from './api.js';

/**
 * Check backend API health status.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const checkBackendHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default {
  checkBackendHealth,
};
