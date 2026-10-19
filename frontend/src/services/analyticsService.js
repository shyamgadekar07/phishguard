import api from './api.js';

export const analyticsService = {
  /**
   * Fetch aggregate platform behavioral overview metrics
   */
  async getOverview() {
    const response = await api.get('/analytics/overview');
    return response.data;
  },

  /**
   * Fetch all trainees with risk summary metrics for the admin table
   */
  async getTraineesRisk() {
    const response = await api.get('/analytics/users');
    return response.data;
  },

  /**
   * Fetch specific trainee explainable risk profile and history
   * @param {string} userId
   */
  async getUserRiskAnalytics(userId) {
    const response = await api.get(`/analytics/users/${userId}/risk`);
    return response.data;
  },

  /**
   * Fetch currently authenticated user's own risk profile
   */
  async getMyRiskAnalytics() {
    const response = await api.get('/analytics/me/risk');
    return response.data;
  },

  /**
   * Explicitly trigger recalculation of a trainee's risk score
   * @param {string} userId
   */
  async recalculateUserRisk(userId) {
    const response = await api.post(`/analytics/users/${userId}/recalculate`);
    return response.data;
  },
};

export default analyticsService;
