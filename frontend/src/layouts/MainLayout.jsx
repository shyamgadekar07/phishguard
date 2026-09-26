import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import authService from '../services/authService.js';

const MainLayout = () => {
  const navigate = useNavigate();
  const token = authService.getToken();
  const user = authService.getStoredUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
                PG
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white">PhishGuard</span>
                <span className="hidden sm:inline-block ml-2 text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
                  Phase 2: Auth Active
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex items-center space-x-3 text-sm font-medium">
            <Link
              to="/"
              className="text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
            >
              Overview
            </Link>

            {token ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-xs text-slate-500 hidden md:inline">
                  ({user?.name || 'User'})
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-400">
            PhishGuard &bull; Final Year Engineering Project
          </p>
          <p className="mt-1">
            An Adaptive Multi-Channel Phishing Simulation &amp; Cybersecurity Awareness Platform
          </p>
          <p className="mt-2 text-slate-600">
            Authorized Educational Simulation Platform &bull; Strictly Zero Sensitive Credential Harvesting
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
