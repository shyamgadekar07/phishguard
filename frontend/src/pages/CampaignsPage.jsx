import React, { useState, useEffect } from 'react';
import campaignService from '../services/campaignService.js';
import templateService from '../services/templateService.js';
import authService from '../services/authService.js';

const CampaignsPage = () => {
  const user = authService.getStoredUser();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SECURITY_OFFICER';

  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Trainee Directory State
  const [trainees, setTrainees] = useState([]);
  const [loadingTrainees, setLoadingTrainees] = useState(false);
  const [traineesError, setTraineesError] = useState('');
  const [traineeSearch, setTraineeSearch] = useState('');

  // Create Campaign Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: '',
    channel: 'EMAIL',
    status: 'DRAFT',
    targets: [],
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Targets Modal (for DRAFT campaigns)
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editTargets, setEditTargets] = useState([]);
  const [savingTargets, setSavingTargets] = useState(false);
  const [editTraineeSearch, setEditTraineeSearch] = useState('');

  // Metrics Modal
  const [selectedMetrics, setSelectedMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await campaignService.getCampaigns(params);
      setCampaigns(res.data?.campaigns || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setError(err.response?.data?.message || 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await templateService.getTemplates({ isActive: true });
      setTemplates(res.data?.templates || []);
      if (res.data?.templates?.length > 0) {
        setFormData((prev) => ({
          ...prev,
          template: prev.template || res.data.templates[0]._id,
          channel: prev.template ? prev.channel : res.data.templates[0].channel,
        }));
      }
    } catch (err) {
      console.error('Failed to load active templates for selection:', err);
    }
  };

  const fetchTrainees = async () => {
    if (!canManage) return;
    setLoadingTrainees(true);
    setTraineesError('');
    try {
      const res = await campaignService.getTrainees();
      const rawTrainees = res.data?.trainees || [];
      // Show only active users with the TRAINEE role
      const activeTrainees = rawTrainees.filter(
        (t) => t.isActive !== false && (!t.role || t.role === 'TRAINEE')
      );
      setTrainees(activeTrainees);
    } catch (err) {
      console.error('Failed to load active trainees:', err);
      if (err.response?.status === 403) {
        setTraineesError('Forbidden: Only administrators and security officers can list and assign trainees.');
      } else if (err.response?.status === 401) {
        setTraineesError('Unauthorized: Please log in to view and assign trainees.');
      } else {
        setTraineesError(err.response?.data?.message || 'Failed to load trainee directory.');
      }
    } finally {
      setLoadingTrainees(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
    fetchTrainees();
  }, [statusFilter]);

  const handleTemplateSelection = (e) => {
    const selectedTplId = e.target.value;
    const matched = templates.find((t) => t._id === selectedTplId);
    setFormData((prev) => ({
      ...prev,
      template: selectedTplId,
      channel: matched ? matched.channel : prev.channel,
    }));
  };

  const filteredTrainees = trainees.filter((t) => {
    if (!traineeSearch.trim()) return true;
    const q = traineeSearch.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q)
    );
  });

  const filteredEditTrainees = trainees.filter((t) => {
    if (!editTraineeSearch.trim()) return true;
    const q = editTraineeSearch.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q)
    );
  });

  const resetCreateForm = () => {
    setFormData({
      name: '',
      description: '',
      template: templates.length > 0 ? templates[0]._id : '',
      channel: templates.length > 0 ? templates[0].channel : 'EMAIL',
      status: 'DRAFT',
      targets: [],
    });
    setTraineeSearch('');
  };

  const handleToggleTarget = (traineeId) => {
    setFormData((prev) => {
      const exists = prev.targets.includes(traineeId);
      return {
        ...prev,
        targets: exists
          ? prev.targets.filter((id) => id !== traineeId)
          : [...prev.targets, traineeId],
      };
    });
  };

  const handleSelectAllTargets = (targetsToSelect) => {
    setFormData((prev) => {
      const idsToAdd = targetsToSelect.map((t) => t._id);
      const updated = Array.from(new Set([...prev.targets, ...idsToAdd]));
      return { ...prev, targets: updated };
    });
  };

  const handleClearTargets = () => {
    setFormData((prev) => ({ ...prev, targets: [] }));
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Keep status as DRAFT when creating a campaign; do not automatically launch
      const payload = {
        ...formData,
        status: 'DRAFT',
        targets: Array.isArray(formData.targets) ? formData.targets : [],
      };
      await campaignService.createCampaign(payload);
      setSuccess('Simulation campaign created successfully with status DRAFT!');
      setShowCreateModal(false);
      resetCreateForm();
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to create campaign:', err);
      setError(err.response?.data?.message || 'Could not create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Targets Modal Handlers
  const handleOpenEditTargets = (campaign) => {
    setError('');
    setSuccess('');
    setEditingCampaign(campaign);
    const existingIds = (campaign.targets || []).map((t) =>
      typeof t === 'string' ? t : t._id
    );
    setEditTargets(existingIds);
    setEditTraineeSearch('');
  };

  const handleToggleEditTarget = (traineeId) => {
    setEditTargets((prev) =>
      prev.includes(traineeId)
        ? prev.filter((id) => id !== traineeId)
        : [...prev, traineeId]
    );
  };

  const handleSelectAllEditTargets = (targetsToSelect) => {
    const idsToAdd = targetsToSelect.map((t) => t._id);
    setEditTargets((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleClearEditTargets = () => {
    setEditTargets([]);
  };

  const handleSaveEditTargets = async (e) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setSavingTargets(true);
    setError('');
    setSuccess('');
    try {
      await campaignService.updateCampaign(editingCampaign._id, {
        targets: editTargets,
      });
      setSuccess(`Targets updated successfully for campaign "${editingCampaign.name}" (${editTargets.length} trainees enrolled).`);
      setEditingCampaign(null);
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to update campaign targets:', err);
      setError(err.response?.data?.message || 'Failed to update campaign targets');
    } finally {
      setSavingTargets(false);
    }
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await campaignService.updateCampaign(campaignId, { status: newStatus });
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to update campaign status:', err);
      setError(err.response?.data?.message || 'Could not update status');
    }
  };

  const handleViewMetrics = async (campaignId) => {
    setLoadingMetrics(true);
    setSelectedMetrics(null);
    try {
      const res = await campaignService.getCampaignMetrics(campaignId);
      setSelectedMetrics(res.data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setError(err.response?.data?.message || 'Could not load campaign metrics');
    } finally {
      setLoadingMetrics(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Campaign Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Plan, monitor, and assess safe multi-channel phishing simulation campaigns
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            + New Simulation Campaign
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

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="RUNNING">Running</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
          No simulation campaigns found. Create your first campaign above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((c) => (
            <div
              key={c._id}
              className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      c.channel === 'EMAIL'
                        ? 'bg-blue-950 text-blue-400 border-blue-800'
                        : c.channel === 'SMS'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-green-950 text-green-400 border-green-800'
                    }`}
                  >
                    {c.channel}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      c.status === 'RUNNING'
                        ? 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse'
                        : c.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : c.status === 'CANCELLED'
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{c.name}</h3>

                <div className="mt-2 text-xs text-slate-400 space-y-1">
                  <p>
                    <span className="text-slate-500">Template:</span>{' '}
                    <span className="text-slate-200 font-medium">
                      {c.template?.name || 'Unassigned'}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-500">Targets Enrolled:</span>{' '}
                    <span className="text-slate-200 font-medium">{c.targets?.length || 0} Trainees</span>
                  </p>
                  {c.description && (
                    <p className="text-[11px] text-slate-500 pt-1 italic">{c.description}</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleViewMetrics(c._id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-blue-400 text-xs font-medium border border-slate-800 transition"
                >
                  View Metrics
                </button>

                {canManage && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleOpenEditTargets(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                          title="Assign or modify targets for this draft campaign"
                        >
                          Edit Targets
                        </button>
                        <button
                          onClick={() => handleStatusChange(c._id, 'RUNNING')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                        >
                          Launch
                        </button>
                      </>
                    )}
                    {c.status === 'RUNNING' && (
                      <button
                        onClick={() => handleStatusChange(c._id, 'COMPLETED')}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        Finish
                      </button>
                    )}
                    {c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleStatusChange(c._id, 'CANCELLED')}
                        className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-rose-400 text-xs border border-slate-800"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Modal */}
      {selectedMetrics && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedMetrics.campaignName}</h2>
                <span className="text-xs text-slate-400">Simulation Analytics &amp; Metrics</span>
              </div>
              <button
                onClick={() => setSelectedMetrics(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Delivered</span>
                <div className="text-lg font-extrabold text-white mt-0.5">
                  {selectedMetrics.metrics?.delivered}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-rose-400">Clicked</span>
                <div className="text-lg font-extrabold text-rose-400 mt-0.5">
                  {selectedMetrics.metrics?.clicked}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedMetrics.percentages?.clickRate}%
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Reported</span>
                <div className="text-lg font-extrabold text-emerald-400 mt-0.5">
                  {selectedMetrics.metrics?.reported}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedMetrics.percentages?.reportRate}%
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Total Targets Enrolled:</span>
                <span className="font-semibold text-white">{selectedMetrics.metrics?.totalTargets}</span>
              </div>
              <div className="flex justify-between">
                <span>Opened Previews:</span>
                <span className="font-semibold text-white">{selectedMetrics.metrics?.opened}</span>
              </div>
              <div className="flex justify-between">
                <span>Ignored / Inactive:</span>
                <span className="font-semibold text-white">{selectedMetrics.metrics?.ignored}</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => setSelectedMetrics(null)}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Close Metrics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Create Simulation Campaign</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Q3 Organization-wide Phishing Probe"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Select Phishing Template
                </label>
                <select
                  value={formData.template}
                  onChange={handleTemplateSelection}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {templates.length === 0 ? (
                    <option value="">No active templates found. Create one first.</option>
                  ) : (
                    templates.map((t) => (
                      <option key={t._id} value={t._id}>
                        [{t.channel}] {t.name} ({t.difficulty} Difficulty)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Channel (Matched)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.channel}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Initial Status
                  </label>
                  <input
                    type="text"
                    disabled
                    value="DRAFT (Safe Creation)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Trainee Target Selection Control */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Assign Trainees ({formData.targets.length} Selected)
                  </label>
                  {trainees.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleSelectAllTargets(filteredTrainees)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleClearTargets}
                        className="text-slate-400 hover:text-slate-300 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {trainees.length > 2 && (
                  <input
                    type="text"
                    value={traineeSearch}
                    onChange={(e) => setTraineeSearch(e.target.value)}
                    placeholder="Search trainees by name, email, department..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                )}

                {loadingTrainees ? (
                  <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                    Loading eligible trainees...
                  </div>
                ) : traineesError ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                    {traineesError}
                  </div>
                ) : trainees.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                    No active trainees found. Register active trainees to enroll them in campaigns.
                  </div>
                ) : filteredTrainees.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                    No trainees match &ldquo;{traineeSearch}&rdquo;.
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-lg p-2 bg-slate-900/40">
                    {filteredTrainees.map((t) => {
                      const isSelected = formData.targets.includes(t._id);
                      return (
                        <label
                          key={t._id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition text-xs ${
                            isSelected
                              ? 'bg-blue-950/40 border-blue-500/60 text-white'
                              : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleTarget(t._id)}
                              className="rounded border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-slate-800 cursor-pointer"
                            />
                            <div className="truncate">
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5 truncate">
                                <span>{t.name}</span>
                                {t.department && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-normal">
                                    {t.department}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{t.email}</div>
                            </div>
                          </div>
                          {t.riskLevel && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                                t.riskLevel === 'HIGH'
                                  ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                                  : t.riskLevel === 'MEDIUM'
                                  ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                              }`}
                            >
                              {t.riskLevel}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {formData.targets.length === 0 ? (
                  <p className="text-[11px] text-amber-400/90">
                    ⚠️ 0 trainees selected. (Campaigns require at least 1 active trainee before they can be launched.)
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-400">
                    ✓ {formData.targets.length} trainee{formData.targets.length > 1 ? 's' : ''} selected as simulation targets.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Campaign Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Simulation objectives and targeted department scope..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.template}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Campaign (Draft)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Targets Modal (for DRAFT campaigns) */}
      {editingCampaign && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Campaign Targets</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign or modify target trainees for draft campaign: &ldquo;{editingCampaign.name}&rdquo;
                </p>
              </div>
              <button
                onClick={() => setEditingCampaign(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTargets} className="space-y-3.5">
              {/* Trainee Target Selection Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Assigned Trainees ({editTargets.length} Selected)
                  </label>
                  {trainees.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleSelectAllEditTargets(filteredEditTrainees)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleClearEditTargets}
                        className="text-slate-400 hover:text-slate-300 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {trainees.length > 2 && (
                  <input
                    type="text"
                    value={editTraineeSearch}
                    onChange={(e) => setEditTraineeSearch(e.target.value)}
                    placeholder="Search trainees by name, email, department..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                )}

                {loadingTrainees ? (
                  <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                    Loading eligible trainees...
                  </div>
                ) : traineesError ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                    {traineesError}
                  </div>
                ) : trainees.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                    No active trainees found. Register active trainees to enroll them.
                  </div>
                ) : filteredEditTrainees.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                    No trainees match &ldquo;{editTraineeSearch}&rdquo;.
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-lg p-2 bg-slate-900/40">
                    {filteredEditTrainees.map((t) => {
                      const isSelected = editTargets.includes(t._id);
                      return (
                        <label
                          key={t._id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition text-xs ${
                            isSelected
                              ? 'bg-blue-950/40 border-blue-500/60 text-white'
                              : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleEditTarget(t._id)}
                              className="rounded border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-slate-800 cursor-pointer"
                            />
                            <div className="truncate">
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5 truncate">
                                <span>{t.name}</span>
                                {t.department && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-normal">
                                    {t.department}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{t.email}</div>
                            </div>
                          </div>
                          {t.riskLevel && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                                t.riskLevel === 'HIGH'
                                  ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                                  : t.riskLevel === 'MEDIUM'
                                  ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                              }`}
                            >
                              {t.riskLevel}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {editTargets.length === 0 ? (
                  <p className="text-[11px] text-amber-400/90">
                    ⚠️ 0 trainees assigned. (At least 1 active trainee must be enrolled before launch.)
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-400">
                    ✓ {editTargets.length} trainee{editTargets.length > 1 ? 's' : ''} enrolled in this campaign.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCampaign(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTargets}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {savingTargets ? 'Saving Targets...' : 'Save Targets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
