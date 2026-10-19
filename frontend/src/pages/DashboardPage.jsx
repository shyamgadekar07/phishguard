import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService.js';
import analyticsService from '../services/analyticsService.js';
import MLRiskPredictionCard from '../components/MLRiskPredictionCard.jsx';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getStoredUser());
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfileAndRisk = async () => {
      try {
        const [profileRes, riskRes] = await Promise.allSettled([
          authService.getCurrentUser(),
          analyticsService.getMyRiskAnalytics(),
        ]);

        if (profileRes.status === 'fulfilled' && profileRes.value?.data?.user) {
          setUser(profileRes.value.data.user);
        }

        if (riskRes.status === 'fulfilled' && riskRes.value?.data) {
          setRiskData(riskRes.value.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Could not refresh profile from server');
        if (err.response?.status === 401) {
          authService.logout();
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndRisk();
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Authenticated Session Active
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome to PhishGuard
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Adaptive Cybersecurity Awareness &amp; Phishing Simulation Platform
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="self-start sm:self-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* User Information Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-lg space-y-6">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Authenticated User Profile</h2>
            <p className="text-xs text-slate-400">
              Verified identity retrieved via <code className="text-blue-400">GET /api/auth/me</code>
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              user?.role === 'ADMIN'
                ? 'bg-purple-950 text-purple-300 border-purple-800'
                : user?.role === 'SECURITY_OFFICER'
                ? 'bg-amber-950 text-amber-300 border-amber-800'
                : 'bg-blue-950 text-blue-300 border-blue-800'
            }`}
          >
            Role: {user?.role || 'TRAINEE'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Name
            </span>
            <div className="mt-1 text-sm font-bold text-white">
              {user?.name || (loading ? 'Loading...' : 'N/A')}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Email Address
            </span>
            <div className="mt-1 text-sm font-bold text-white truncate">
              {user?.email || (loading ? 'Loading...' : 'N/A')}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Assigned Role
            </span>
            <div className="mt-1 text-sm font-bold text-white">
              {user?.role || (loading ? 'Loading...' : 'TRAINEE')}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Department
            </span>
            <div className="mt-1 text-sm font-medium text-slate-200">
              {user?.department || 'General Trainee'}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Risk Score
            </span>
            <div className="mt-1 text-sm font-bold text-emerald-400">
              {user?.riskScore ?? 0} / 100
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Risk Level
            </span>
            <div className="mt-1 text-sm font-bold text-slate-300">
              {user?.riskLevel || 'LOW'}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <span>Phase 4 Behavioral Analytics &amp; Risk Scoring Active</span>
          <span className="font-mono text-[11px] text-slate-500">Safe Simulation Metadata Only</span>
        </div>
      </div>

      {/* Behavioral Analytics Breakdown Card */}
      {riskData && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-semibold text-white">Your Behavioral Security Profile</h2>
            <p className="text-xs text-slate-400">
              Deterministic susceptibility evaluation derived from authorized phishing drills
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Simulations
              </span>
              <div className="mt-1 text-xl font-bold text-white">
                {riskData.metrics?.totalSimulations ?? 0}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Click Rate
              </span>
              <div className="mt-1 text-xl font-bold text-rose-400">
                {riskData.metrics?.clickRate ?? 0}%
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Report Rate
              </span>
              <div className="mt-1 text-xl font-bold text-emerald-400">
                {riskData.metrics?.reportRate ?? 0}%
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Reports Logged
              </span>
              <div className="mt-1 text-xl font-bold text-blue-400">
                {riskData.metrics?.reportedCount ?? 0}
              </div>
            </div>
          </div>

          {riskData.factors && riskData.factors.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Behavioral Factors &amp; Guidance
              </h3>
              <div className="space-y-2">
                {riskData.factors.map((f, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">
                        {f.factor.replace('_', ' ')}
                      </span>
                      <p className="text-slate-400 mt-0.5">{f.explanation}</p>
                    </div>
                    <span
                      className={`font-mono font-bold text-xs whitespace-nowrap px-2 py-0.5 rounded ${
                        f.impact > 0
                          ? 'bg-rose-500/10 text-rose-400'
                          : f.impact < 0
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {f.impact > 0 ? `+${f.impact}` : f.impact === 0 ? '0' : f.impact} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/40 text-xs text-blue-300">
            <strong>Cybersecurity Notice:</strong> PhishGuard never collects passwords or credentials. This prototype metric helps measure and improve organizational resilience through education.
          </div>
        </div>
      )}

      {/* Phase 5 Experimental ML Advisory Card */}
      {riskData && (
        <MLRiskPredictionCard prediction={riskData.mlPrediction} />
      )}
    </div>
  );
};

export default DashboardPage;
