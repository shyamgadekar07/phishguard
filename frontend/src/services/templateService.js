import api from './api.js';

export const templateService = {
  /**
   * Fetch all simulation templates with optional filters (channel, difficulty, isActive)
   */
  async getTemplates(params = {}) {
    const response = await api.get('/templates', { params });
    return response.data;
  },

  /**
   * Fetch a single template by ID
   */
  async getTemplateById(id) {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  /**
   * Create a new template (ADMIN / SECURITY_OFFICER)
   */
  async createTemplate(templateData) {
    const response = await api.post('/templates', templateData);
    return response.data;
  },

  /**
   * Update an existing template
   */
  async updateTemplate(id, templateData) {
    const response = await api.put(`/templates/${id}`, templateData);
    return response.data;
  },

  /**
   * Deactivate a template
   */
  async deleteTemplate(id) {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },
};

export default templateService;
