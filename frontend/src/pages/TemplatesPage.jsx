import React, { useState, useEffect } from 'react';
import templateService from '../services/templateService.js';
import authService from '../services/authService.js';

const TemplatesPage = () => {
  const user = authService.getStoredUser();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SECURITY_OFFICER';

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering state
  const [filterChannel, setFilterChannel] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  // Create template modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    channel: 'EMAIL',
    subject: '',
    content: '',
    description: '',
    difficulty: 'LOW',
  });
  const [creating, setCreating] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterChannel) params.channel = filterChannel;
      if (filterDifficulty) params.difficulty = filterDifficulty;

      const response = await templateService.getTemplates(params);
      setTemplates(response.data?.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(err.response?.data?.message || 'Could not load phishing templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [filterChannel, filterDifficulty]);

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      await templateService.createTemplate(formData);
      setSuccess('Template created successfully!');
      setShowModal(false);
      setFormData({
        name: '',
        channel: 'EMAIL',
        subject: '',
        content: '',
        description: '',
        difficulty: 'LOW',
      });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to create template:', err);
      setError(err.response?.data?.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this template?')) return;
    try {
      await templateService.deleteTemplate(id);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to deactivate template:', err);
      setError(err.response?.data?.message || 'Failed to deactivate template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Phishing Simulation Templates</h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardized educational templates across Email, SMS, and WhatsApp channels
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            + Create Template
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filters:</span>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Channels</option>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>

        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Difficulties</option>
          <option value="LOW">Low Difficulty</option>
          <option value="MEDIUM">Medium Difficulty</option>
          <option value="HIGH">High Difficulty</option>
        </select>

        <button
          onClick={() => {
            setFilterChannel('');
            setFilterDifficulty('');
          }}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition"
        >
          Reset Filters
        </button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
          No phishing simulation templates found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl) => (
            <div
              key={tpl._id}
              className={`rounded-xl border bg-slate-950 p-5 space-y-3 transition flex flex-col justify-between ${
                tpl.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      tpl.channel === 'EMAIL'
                        ? 'bg-blue-950 text-blue-400 border-blue-800'
                        : tpl.channel === 'SMS'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-green-950 text-green-400 border-green-800'
                    }`}
                  >
                    {tpl.channel}
                  </span>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      tpl.difficulty === 'HIGH'
                        ? 'bg-rose-950 text-rose-400'
                        : tpl.difficulty === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {tpl.difficulty}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{tpl.name}</h3>

                {tpl.subject && (
                  <p className="text-xs text-slate-300 font-medium mt-1 truncate">
                    <span className="text-slate-500">Subject:</span> {tpl.subject}
                  </p>
                )}

                <p className="text-xs text-slate-400 line-clamp-3 mt-2 bg-slate-900 p-2.5 rounded border border-slate-800/80 font-mono">
                  {tpl.content}
                </p>

                {tpl.description && (
                  <p className="text-[11px] text-slate-500 mt-2 italic">{tpl.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className={tpl.isActive ? 'text-emerald-400' : 'text-slate-500'}>
                  {tpl.isActive ? '● Active' : '○ Inactive'}
                </span>

                {canManage && tpl.isActive && (
                  <button
                    onClick={() => handleDeactivate(tpl._id)}
                    className="text-rose-400 hover:text-rose-300 hover:underline"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Create Simulation Template</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Urgent Payroll Verification Notice"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Channel
                  </label>
                  <select
                    name="channel"
                    value={formData.channel}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Difficulty
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              {formData.channel === 'EMAIL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Action Required: Review your quarterly tax statement"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Message Content (Educational Simulation Body)
                </label>
                <textarea
                  name="content"
                  required
                  rows={4}
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Dear employee, your quarterly bonus requires immediate confirmation at the link below..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Educational Description (Optional)
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Designed to test urgency cues and authority spoofing"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
