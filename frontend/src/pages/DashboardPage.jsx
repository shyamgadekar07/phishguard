import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService.js';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getStoredUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (response.data?.user) {
          setUser(response.data.user);
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

    fetchProfile();
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
          <span>Phase 2 Authentication &amp; JWT Protection is fully active.</span>
          <span className="font-mono text-[11px] text-slate-500">Bearer Token Verified</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
