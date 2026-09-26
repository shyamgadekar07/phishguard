import api from './api.js';

export const campaignService = {
  /**
   * Fetch all simulation campaigns
   */
  async getCampaigns(params = {}) {
    const response = await api.get('/campaigns', { params });
    return response.data;
  },

  /**
   * Fetch single campaign by ID
   */
  async getCampaignById(id) {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Create a new simulation campaign
   */
  async createCampaign(campaignData) {
    const response = await api.post('/campaigns', campaignData);
    return response.data;
  },

  /**
   * Update campaign status or parameters
   */
  async updateCampaign(id, campaignData) {
    const response = await api.put(`/campaigns/${id}`, campaignData);
    return response.data;
  },

  /**
   * Cancel or delete campaign
   */
  async deleteCampaign(id) {
    const response = await api.delete(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Fetch campaign simulation metrics
   */
  async getCampaignMetrics(id) {
    const response = await api.get(`/campaigns/${id}/metrics`);
    return response.data;
  },
};

export default campaignService;
