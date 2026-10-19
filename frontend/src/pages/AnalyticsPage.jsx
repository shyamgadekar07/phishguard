import React, { useState, useEffect } from 'react';
import analyticsService from '../services/analyticsService.js';
import authService from '../services/authService.js';
import UserRiskDetailModal from '../components/UserRiskDetailModal.jsx';

const AnalyticsPage = () => {
  const currentUser = authService.getStoredUser();
  const isSecurityStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'SECURITY_OFFICER';

  const [overview, setOverview] = useState(null);
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('ALL');

  // Selected User for Detail Modal
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, traineesRes] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getTraineesRisk(),
      ]);
      setOverview(overviewRes.data);
      setTrainees(traineesRes.data?.trainees || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.response?.data?.message || 'Failed to fetch platform analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTrainees = trainees.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRisk =
      riskLevelFilter === 'ALL' || t.riskLevel === riskLevelFilter;

    return matchesSearch && matchesRisk;
  });

  const getRiskBadge = (level) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            LOW
          </span>
        );
    }
  };

  if (!isSecurityStaff) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 rounded-xl bg-slate-900 border border-slate-800 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-400">
          Platform behavioral analytics are restricted to authorized Administrators and Security Officers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            Phase 4: Behavioral Analytics Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Behavioral Risk &amp; Security Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic risk evaluation and vulnerability tracking derived from safe simulation events
          </p>
        </div>

        <button
          onClick={fetchData}
          className="self-start md:self-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2"
        >
          Refresh Analytics
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Trainees
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {overview ? overview.totalTrainees : '—'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Low Risk Users
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {overview ? overview.lowRiskUsers : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Score 0–39</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Medium Risk
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {overview ? overview.mediumRiskUsers : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Score 40–69</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            High Risk
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {overview ? overview.highRiskUsers : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Score 70–100</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Simulations
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {overview ? overview.totalSimulations : '—'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Click Rate
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {overview ? `${overview.overallClickRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{overview ? `${overview.totalClicks} clicks` : ''}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Report Rate
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {overview ? `${overview.overallReportRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{overview ? `${overview.totalReports} reports` : ''}</div>
        </div>
      </div>

      {/* Trainees Risk Table Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Trainee Behavioral Risk Registry</h2>
            <p className="text-xs text-slate-400">
              User-level susceptibility and threat awareness records
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            <select
              value={riskLevelFilter}
              onChange={(e) => setRiskLevelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">LOW Risk (0–39)</option>
              <option value="MEDIUM">MEDIUM Risk (40–69)</option>
              <option value="HIGH">HIGH Risk (70–100)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4">Trainee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Risk Score</th>
                <th className="py-3 px-4 text-center">Risk Level</th>
                <th className="py-3 px-4 text-center">Simulations</th>
                <th className="py-3 px-4 text-center">Click Rate</th>
                <th className="py-3 px-4 text-center">Report Rate</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    Loading trainee risk registry...
                  </td>
                </tr>
              ) : filteredTrainees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No trainees match the specified filters.
                  </td>
                </tr>
              ) : (
                filteredTrainees.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {t.department || 'General'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-sm">
                      {t.riskScore ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getRiskBadge(t.riskLevel)}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {t.simulationCount}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-rose-400">
                      {t.clickRate}%
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-emerald-400">
                      {t.reportRate}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedUserId(t._id)}
                        className="px-3 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 transition"
                      >
                        View Analysis
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Risk Detail Modal */}
      {selectedUserId && (
        <UserRiskDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
};

export default AnalyticsPage;
