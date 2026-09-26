import React, { useState, useEffect } from 'react';
import { checkBackendHealth } from '../services/healthService.js';

const HomePage = () => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'connected' | 'disconnected'
  const [healthData, setHealthData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const data = await checkBackendHealth();
      setHealthData(data);
      setStatus('connected');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Health check failed:', err);
      setStatus('disconnected');
      setErrorMessage(err.message || 'Unable to reach backend service');
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-8 shadow-2xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Phase 1: Project Initialization Complete
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            PhishGuard
          </h1>
          <p className="mt-3 text-lg text-slate-300 font-medium">
            An Adaptive Multi-Channel Phishing Simulation &amp; Cybersecurity Awareness Platform
            Using Behavioral Analytics and Machine Learning
          </p>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Final Year Engineering Project designed to evaluate human vulnerability, train users adaptively,
            and predict phishing susceptibility using behavioral analytics and machine learning.
          </p>
        </div>
      </div>

      {/* Backend Connection Status Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Backend Health Check</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status ping to <code className="text-blue-400">GET /api/health</code>
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={status === 'loading'}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white disabled:opacity-50 transition"
          >
            {status === 'loading' ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/80 border border-slate-800/80">
          <div className="flex items-center gap-3">
            {/* Status Indicator Icon */}
            {status === 'loading' && (
              <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
            )}
            {status === 'connected' && (
              <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
            )}
            {status === 'disconnected' && (
              <div className="w-4 h-4 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50"></div>
            )}

            <div>
              <div className="text-sm font-semibold text-white capitalize flex items-center gap-2">
                Status:{' '}
                {status === 'loading' && (
                  <span className="text-amber-400 font-bold">Loading</span>
                )}
                {status === 'connected' && (
                  <span className="text-emerald-400 font-bold">Connected</span>
                )}
                {status === 'disconnected' && (
                  <span className="text-rose-400 font-bold">Disconnected</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {status === 'connected' && (healthData?.message || 'API responded with 200 OK')}
                {status === 'disconnected' && (errorMessage || 'Connection failed')}
                {status === 'loading' && 'Testing connection to Express API...'}
              </div>
            </div>
          </div>

          {lastChecked && (
            <div className="text-xs text-slate-500 self-end md:self-center">
              Last checked: <span className="text-slate-400">{lastChecked}</span>
            </div>
          )}
        </div>
      </div>

      {/* Architecture Modules Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Frontend Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Module 1</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Active
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">Frontend Service</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            React 18 + Vite SPA styled with Tailwind CSS. Includes modular routing, layouts, and centralized API services.
          </p>
          <div className="pt-2 text-[11px] text-slate-500 font-mono">
            Port: 5173 &bull; Vite Dev Server
          </div>
        </div>

        {/* Backend Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Module 2</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
              Initialized
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">Backend REST API</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Node.js + Express REST API configured with CORS, MongoDB Mongoose connector, centralized error handling, and health probes.
          </p>
          <div className="pt-2 text-[11px] text-slate-500 font-mono">
            Port: 5000 &bull; Express.js
          </div>
        </div>

        {/* ML Service Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Module 3</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
              Initialized
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">ML Microservice</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            FastAPI Python microservice for behavioral analytics and phishing risk prediction (ML models to be integrated in future phases).
          </p>
          <div className="pt-2 text-[11px] text-slate-500 font-mono">
            Port: 8000 &bull; FastAPI + Uvicorn
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
