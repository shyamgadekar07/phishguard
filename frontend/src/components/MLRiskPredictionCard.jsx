import React from 'react';

/**
 * MLRiskPredictionCard Component
 * ==============================
 * Renders advisory Phase 5 Machine Learning susceptibility predictions.
 *
 * Requirements:
 * - Visually and semantically separated from Phase 4 deterministic scoring.
 * - Handles 'success', 'insufficient_data', and 'unavailable' states.
 * - Explicitly marks probabilities as uncalibrated statistical model outputs.
 * - Prominently discloses synthetic prototype status without definitive claims.
 * - Contains zero personal identifiers or sensitive credentials.
 */
const MLRiskPredictionCard = ({ prediction }) => {
  if (!prediction) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          Machine Learning Advisory Unavailable
        </div>
        <p className="text-slate-400">
          Advisory ML susceptibility prediction data has not been calculated for this profile.
        </p>
      </div>
    );
  }

  const {
    status,
    risk_category: riskCategory,
    model_probabilities: modelProbabilities,
    message,
    disclaimer,
  } = prediction;

  const getAdvisoryBadge = (category) => {
    switch (category) {
      case 'HIGH':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
            Advisory: HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
            Advisory: MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
            Advisory: LOW
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
            Advisory: N/A
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-indigo-900/50 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
              Phase 5 Prototype
            </span>
            <h4 className="text-sm font-bold text-white tracking-tight">
              ML Susceptibility Risk Advisory
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Statistical behavioral classifier estimate &bull; Separate from authoritative deterministic score
          </p>
        </div>

        <div>
          {status === 'success' && getAdvisoryBadge(riskCategory)}
          {status === 'insufficient_data' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
              Cold Start (0 Drills)
            </span>
          )}
          {status === 'unavailable' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
              Service Offline
            </span>
          )}
        </div>
      </div>

      {/* State-specific Body */}
      {status === 'success' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <p>{message || 'Advisory prediction generated from behavioral simulation metrics.'}</p>
          </div>

          {modelProbabilities && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Model Probability Distribution
                </span>
                <span className="text-[10px] italic text-slate-500">
                  Uncalibrated statistical model output
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['LOW', 'MEDIUM', 'HIGH'].map((cat) => {
                  const prob = modelProbabilities[cat] ?? 0;
                  const pct = (prob * 100).toFixed(1);
                  const isSelected = riskCategory === cat;

                  return (
                    <div
                      key={cat}
                      className={`p-3 rounded-lg border text-center transition ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/40 shadow-inner'
                          : 'bg-slate-900/50 border-slate-800/80'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-slate-400">{cat}</div>
                      <div className="text-lg font-black text-white mt-0.5">{pct}%</div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cat === 'HIGH'
                              ? 'bg-rose-500'
                              : cat === 'MEDIUM'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, prob * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'insufficient_data' && (
        <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/40 text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-blue-300 flex items-center gap-2">
            <span>ℹ️</span> Insufficient Simulation History
          </div>
          <p className="text-slate-400">
            {message ||
              'At least 1 simulation interaction is required to generate behavioral machine learning estimates.'}
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Predictive modeling is withheld until interaction telemetry is established through safe authorized simulation drills.
          </p>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center gap-2">
            <span>⚠️</span> Advisory Prediction Service Unavailable
          </div>
          <p>
            {message ||
              'The machine learning risk microservice is currently unreachable or timed out.'}
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Authoritative Phase 4 deterministic security scoring and explainable factors remain completely functional and unaffected.
          </p>
        </div>
      )}

      {/* Mandatory Academic Disclaimer Banner */}
      <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-300/90 leading-relaxed">
        <strong>Academic Prototype Notice:</strong>{' '}
        {disclaimer ||
          'This experimental model was trained strictly on synthetic behavioral heuristics and does not establish real-world predictive validity.'}{' '}
        This advisory output is provided solely for educational research and pipeline exploration. It must never be used for disciplinary actions or definitive security judgments.
      </div>
    </div>
  );
};

export default MLRiskPredictionCard;
