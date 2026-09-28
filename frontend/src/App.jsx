import React, { useState } from 'react';
import { ShieldCheck, UserCheck, FilePlus, Sparkles, Database } from 'lucide-react';
import OfficerCenter from './components/OfficerCenter';
import ApplicantTracker from './components/ApplicantTracker';
import SubmitForm from './components/SubmitForm';

export default function App() {
  const [activeTab, setActiveTab] = useState('officer'); // 'officer' | 'applicant' | 'submit'
  const [selectedAppIdForTrack, setSelectedAppIdForTrack] = useState(1);

  const handleSelectAppForTrack = (appId) => {
    setSelectedAppIdForTrack(appId);
    setActiveTab('applicant');
  };

  const handleAppCreated = (appResult) => {
    setSelectedAppIdForTrack(appResult.app_id);
    setActiveTab('officer');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Main Navigation Header */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-xl shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>Loan Pre-Screening Tool</span>
                <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
                  F5 Engine Ready
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Loan Decision & Guidance Engine • Hackathon F5 Owner</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 space-x-1">
            <button
              onClick={() => setActiveTab('officer')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'officer'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Officer Center (Module B)</span>
              <span className="sm:hidden">Officer</span>
            </button>

            <button
              onClick={() => setActiveTab('applicant')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'applicant'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Applicant Portal (Module A)</span>
              <span className="sm:hidden">Applicant</span>
            </button>

            <button
              onClick={() => setActiveTab('submit')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'submit'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FilePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Submit App (F1 Stub)</span>
              <span className="sm:hidden">Submit</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'officer' && (
          <OfficerCenter onSelectAppForTrack={handleSelectAppForTrack} />
        )}

        {activeTab === 'applicant' && (
          <ApplicantTracker defaultAppId={selectedAppIdForTrack} />
        )}

        {activeTab === 'submit' && (
          <SubmitForm onAppCreated={handleAppCreated} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center space-x-2">
          <Database className="w-3.5 h-3.5 text-slate-600" />
          <span>Single DB Source of Truth: SQLite (`loans.db`) • FastAPI Engine Layer</span>
        </div>
      </footer>
    </div>
  );
}
