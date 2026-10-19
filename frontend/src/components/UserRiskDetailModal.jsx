import React, { useState, useEffect } from 'react';
import analyticsService from '../services/analyticsService.js';
import MLRiskPredictionCard from './MLRiskPredictionCard.jsx';

const UserRiskDetailModal = ({ userId, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const fetchRiskDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsService.getUserRiskAnalytics(userId);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load risk detail:', err);
      setError(err.response?.data?.message || 'Failed to load risk detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRiskDetails();
    }
  }, [userId]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await analyticsService.recalculateUserRisk(userId);
      await fetchRiskDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to recalculate risk:', err);
      setError(err.response?.data?.message || 'Failed to recalculate risk.');
    } finally {
      setRecalculating(false);
    }
  };

  const getRiskBadgeColor = (level) => {
    switch (level) {
      case 'HIGH':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">User Behavioral Risk Analysis</h3>
            <p className="text-xs text-slate-400">
              Explainable prototype risk assessment derived from simulation interactions
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Loading behavioral analytics...
          </div>
        ) : data ? (
          <div className="mt-4 space-y-6">
            {/* User Details & Risk Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <h4 className="text-base font-semibold text-white">{data.user.name}</h4>
                <div className="text-xs text-slate-400">{data.user.email}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Department: <span className="text-slate-300">{data.user.department || 'General'}</span> &bull; Role: <span className="text-slate-300">{data.user.role}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black text-white">{data.riskScore}<span className="text-xs font-normal text-slate-400"> / 100</span></div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getRiskBadgeColor(
                      data.riskLevel
                    )}`}
                  >
                    {data.riskLevel} RISK
                  </span>
                </div>
              </div>
            </div>

            {/* Behavior Metrics Grid */}
            <div>
              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Safe Simulation Metrics
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Simulations</div>
                  <div className="text-base font-bold text-white mt-1">
                    {data.metrics?.totalSimulations ?? 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Click Rate</div>
                  <div className="text-base font-bold text-rose-400 mt-1">
                    {data.metrics?.clickRate ?? 0}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Report Rate</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">
                    {data.metrics?.reportRate ?? 0}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Reported Count</div>
                  <div className="text-base font-bold text-blue-400 mt-1">
                    {data.metrics?.reportedCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 5 Experimental ML Advisory Card */}
            <MLRiskPredictionCard prediction={data.mlPrediction} />

            {/* Behavioral Factors */}
            <div>
              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Score Explanations &amp; Risk Factors
              </h5>
              <div className="space-y-2">
                {data.factors && data.factors.length > 0 ? (
                  data.factors.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
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
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No behavioral factors calculated yet.</p>
                )}
              </div>
            </div>

            {/* Risk History */}
            {data.history && data.history.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Risk Calculation History
                </h5>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {data.history.map((h, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] flex items-center justify-between text-slate-300"
                    >
                      <div>
                        <span className="font-medium">
                          Score: {h.riskScore} ({h.riskLevel})
                        </span>
                        <span className="text-slate-500 ml-2">
                          (Previous: {h.previousScore} / {h.previousLevel})
                        </span>
                      </div>
                      <span className="text-slate-500">
                        {new Date(h.calculatedAt || h.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Academic Notice */}
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300 leading-relaxed">
              <strong>Educational Risk Indicator:</strong> This score represents an academic simulation metric designed to identify cybersecurity awareness training needs. Scores do not imply malicious intent and strictly exclude sensitive personal credentials.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={handleRecalculate}
                disabled={recalculating}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition flex items-center gap-2"
              >
                {recalculating ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full"></span>
                    Recalculating...
                  </>
                ) : (
                  'Recalculate Risk'
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UserRiskDetailModal;
