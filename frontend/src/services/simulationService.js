import api from './api.js';

export const simulationService = {
  /**
   * Process simulation link click safely and fetch educational guidance
   * @param {string} trackingId
   */
  async trackSimulation(trackingId) {
    const response = await api.get(`/simulation/${trackingId}`);
    return response.data;
  },

  /**
   * Report simulation as suspected phishing
   * @param {string} trackingId
   */
  async reportSimulation(trackingId) {
    const response = await api.post(`/simulation/${trackingId}/report`);
    return response.data;
  },
};

export default simulationService;
