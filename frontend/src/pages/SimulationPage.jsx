import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import simulationService from '../services/simulationService.js';

const SimulationPage = () => {
  const { trackingId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const recordAndFetch = async () => {
      if (!trackingId) {
        setError('Missing simulation tracking identifier');
        setLoading(false);
        return;
      }

      try {
        const res = await simulationService.trackSimulation(trackingId);
        setData(res.data);
      } catch (err) {
        console.error('Simulation tracking error:', err);
        setError(err.response?.data?.message || 'Invalid or expired simulation link');
      } finally {
        setLoading(false);
      }
    };

    recordAndFetch();
  }, [trackingId]);

  const handleReport = async () => {
    if (reporting || reported) return;
    setReporting(true);
    try {
      await simulationService.reportSimulation(trackingId);
      setReported(true);
    } catch (err) {
      console.error('Failed to report simulation:', err);
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold text-white">Loading Security Awareness Simulation...</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying simulation tracking link safely</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl border border-slate-800 bg-slate-950 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-white">Simulation Link Invalid</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Link
          to="/"
          className="inline-block mt-3 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
        >
          Return to Platform
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8 space-y-6">
      {/* Awareness Hero Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20 p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          Cybersecurity Training Exercise
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          PhishGuard Security Awareness Simulation
        </h1>

        <p className="mt-3 text-sm text-slate-300 leading-relaxed font-medium">
          {data?.message || 'This was an authorized simulated phishing test used for awareness training.'}
        </p>

        {reported ? (
          <div className="mt-5 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <span>✓</span> Thank you! You reported this simulated phishing probe. Your proactive vigilance protects the organization!
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleReport}
              disabled={reporting}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
            >
              {reporting ? 'Submitting Report...' : 'Report This Simulation'}
            </button>
            <span className="text-[11px] text-slate-400">
              Simulates reporting suspicious communications to IT Security
            </span>
          </div>
        )}
      </div>

      {/* Red Flags & Educational Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-lg space-y-5">
        <div>
          <h2 className="text-base font-bold text-blue-400 uppercase tracking-wider text-xs">
            Simulation Anatomy
          </h2>
          <h3 className="text-lg font-bold text-white mt-1">Recognizing Critical Red Flags</h3>
        </div>

        <div className="space-y-2.5">
          {data?.redFlags?.map((flag, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-3"
            >
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                !
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{flag}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Recommended Cybersecurity Best Practices:
          </h4>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 leading-relaxed">
            {data?.securityGuidance?.map((guidance, idx) => (
              <li key={idx}>{guidance}</li>
            ))}
          </ul>
        </div>

        {/* Ethical Safety Guarantee */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Safety &amp; Privacy Notice:</span> PhishGuard
          is strictly an educational and awareness evaluation tool. No passwords, credentials,
          banking information, or private personal data were collected or logged during this simulation.
        </div>
      </div>
    </div>
  );
};

export default SimulationPage;
