import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, AlertCircle, TrendingUp, DollarSign, Filter, RefreshCw, 
  Sliders, Send, CheckCircle2, XCircle, ArrowRight, Sparkles, MessageSquare, Clock
} from 'lucide-react';
import OutboxTab from './OutboxTab';

export default function OfficerCenter({ onSelectAppForTrack }) {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'outbox'
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // What-if state for Case Panel
  const [whatifParams, setWhatifParams] = useState({
    loan_amount: 0,
    tenure_months: 0,
    loan_type: 'Personal Loan'
  });
  const [whatifResult, setWhatifResult] = useState(null);
  const [whatifLoading, setWhatifLoading] = useState(false);

  // Message draft state
  const [draftMessage, setDraftMessage] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);

  const debounceTimer = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        fetch('/api/f5/queue'),
        fetch('/api/f5/stats')
      ]);
      if (queueRes.ok && statsRes.ok) {
        const queueData = await queueRes.json();
        const statsData = await statsRes.json();
        setQueue(queueData);
        setStats(statsData);
        
        // Refresh selectedApp if open
        if (selectedApp) {
          const updated = queueData.find(a => a.app_id === selectedApp.app_id);
          if (updated) setSelectedApp(updated);
        }
      }
    } catch (e) {
      console.error("Error fetching queue data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When a row is clicked, initialize What-If parameters
  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setWhatifParams({
      loan_amount: app.loan_amount,
      tenure_months: app.tenure_months,
      loan_type: app.loan_type
    });
    setWhatifResult(null);
    setDraftMessage('');
  };

  // Debounced What-If simulation call (~300ms)
  useEffect(() => {
    if (!selectedApp) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setWhatifLoading(true);
      try {
        const res = await fetch(`/api/f5/applications/${selectedApp.app_id}/whatif`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(whatifParams)
        });
        if (res.ok) {
          const data = await res.json();
          setWhatifResult(data);
        }
      } catch (e) {
        console.error("Whatif error:", e);
      } finally {
        setWhatifLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [whatifParams, selectedApp]);

  // Apply terms handler
  const handleApplyTerms = async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/f5/applications/${selectedApp.app_id}/apply-terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatifParams)
      });
      if (res.ok) {
        await fetchData(); // Refreshes table, priority rank, stats, history
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Generate Draft Message handler
  const handleGenerateDraft = async () => {
    if (!selectedApp) return;
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/f5/applications/${selectedApp.app_id}/draft-message`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setDraftMessage(data.draft_message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDraftLoading(false);
    }
  };

  // Send Message handler
  const handleSendMessage = async () => {
    if (!selectedApp || !draftMessage) return;
    try {
      const res = await fetch(`/api/f5/applications/${selectedApp.app_id}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draftMessage })
      });
      if (res.ok) {
        setSendSuccessToast(true);
        setTimeout(() => setSendSuccessToast(false), 3000);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Queue
  const filteredQueue = queue.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          app.app_id.toString().includes(searchFilter);
    const matchesStatus = statusFilter === 'ALL' || app.recommendation === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <span>Officer Command Center (Feature 5 Queue)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Priority ranked queue with automated counterfactual guidance and what-if term explorer</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex space-x-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'queue' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Priority Queue
            </button>
            <button
              onClick={() => setActiveTab('outbox')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'outbox' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Outbox & Notifications
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-lg">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Applications</span>
              <span className="text-2xl font-black text-white">
                {Object.values(stats.count_by_status || {}).reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-lg">
            <div className="p-3 bg-amber-600/20 text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Review Priority Count</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-amber-300">{stats.count_by_status?.Review || 0}</span>
                <span className="text-xs text-slate-400">(₹{(stats.total_value_review / 100000).toFixed(1)}L total)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-lg">
            <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Recoverable Rejects</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-300">₹{(stats.total_value_recoverable_rejects / 100000).toFixed(1)}L</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-lg">
            <div className="p-3 bg-violet-600/20 text-violet-400 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Decision Speed</span>
              <span className="text-base font-bold text-violet-300">{stats.avg_time_to_decision}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'outbox' ? (
        <OutboxTab />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Priority Queue Table (8 cols on large screen, 12 if no app selected) */}
          <div className={`space-y-4 transition-all duration-300 ${selectedApp ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
            {/* Search & Status Filters */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filter by applicant name or ID..."
                className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {['ALL', 'Review', 'Reject', 'Approve'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      statusFilter === st ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Applicant</th>
                      <th className="py-3 px-3">Product</th>
                      <th className="py-3 px-3">EMI / Ratio</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Gap to Approval</th>
                      <th className="py-3 px-3">Recoverable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs">
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-slate-500">No applications match criteria.</td>
                      </tr>
                    ) : (
                      filteredQueue.map(app => {
                        const isSelected = selectedApp?.app_id === app.app_id;
                        return (
                          <tr
                            key={app.app_id}
                            onClick={() => handleSelectApp(app)}
                            className={`cursor-pointer transition hover:bg-slate-800/80 ${
                              isSelected ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                              #{app.priority_rank}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-white">{app.name}</div>
                              <div className="text-[10px] text-slate-400">App #{app.app_id} • Age {app.age}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-slate-200">{app.loan_type}</div>
                              <div className="text-[10px] text-slate-400">₹{app.loan_amount?.toLocaleString()} ({app.tenure_months}m)</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-mono text-slate-200">₹{app.emi_amount?.toLocaleString()}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{(app.emi_ratio * 100).toFixed(1)}% ratio</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                app.recommendation === 'Approve' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                app.recommendation === 'Review' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                                'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}>
                                {app.recommendation}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-300 max-w-[200px] truncate" title={app.gap_to_approval}>
                              {app.gap_to_approval}
                            </td>
                            <td className="py-3 px-3">
                              {app.is_recoverable ? (
                                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
                                  YES
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">NO</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Case Panel (5 cols on large screen) */}
          {selectedApp && (
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 sticky top-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Case Panel • Rank #{selectedApp.priority_rank}</span>
                  <h3 className="text-lg font-bold text-white">{selectedApp.name} (App #{selectedApp.app_id})</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onSelectAppForTrack && onSelectAppForTrack(selectedApp.app_id)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 rounded-lg border border-slate-700"
                  >
                    View Tracker
                  </button>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* 1. Decision Summary */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Current Recommendation</span>
                  <span className={`px-2.5 py-1 rounded text-xs uppercase font-extrabold ${
                    selectedApp.recommendation === 'Approve' ? 'bg-emerald-950 text-emerald-400' :
                    selectedApp.recommendation === 'Review' ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'
                  }`}>
                    {selectedApp.recommendation}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-850 font-mono text-[11px]">
                  <div><span className="text-slate-400 block">EMI</span>₹{selectedApp.emi_amount?.toLocaleString()}</div>
                  <div><span className="text-slate-400 block">EMI Ratio</span>{(selectedApp.emi_ratio * 100).toFixed(1)}%</div>
                  <div><span className="text-slate-400 block">Credit Score</span>{selectedApp.credit_score}</div>
                </div>
                <p className="text-slate-300 text-[11px]">{selectedApp.explanation_text}</p>
              </div>

              {/* 2. Eligibility Checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eligibility Rules Checklist</h4>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                  {/* Age */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Age Check ({selectedApp.age} yrs)</span>
                    <span className={selectedApp.age >= 21 && selectedApp.age <= 60 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {selectedApp.age >= 21 && selectedApp.age <= 60 ? '✅ PASS' : '❌ FAIL'}
                    </span>
                  </div>

                  {/* Income */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Monthly Income (₹{selectedApp.monthly_income?.toLocaleString()})</span>
                    <span className="text-emerald-400 font-bold">✅ PASS</span>
                  </div>

                  {/* Employment */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Employment ({selectedApp.employment_type})</span>
                    <span className={['Salaried', 'Self-Employed', 'Business'].includes(selectedApp.employment_type) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {['Salaried', 'Self-Employed', 'Business'].includes(selectedApp.employment_type) ? '✅ PASS' : '❌ FAIL'}
                    </span>
                  </div>

                  {/* EMI Ratio */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">EMI Ratio ({(selectedApp.emi_ratio * 100).toFixed(1)}%)</span>
                    <span className={selectedApp.emi_ratio <= 0.6 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {selectedApp.emi_ratio <= 0.6 ? '✅ PASS' : '❌ FAIL (>60%)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Interactive What-If Term Explorer */}
              <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs">
                    <Sliders className="w-4 h-4" />
                    <span>Loan Terms Explorer (What-If Simulator)</span>
                  </div>
                  {whatifLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                </div>

                <div className="space-y-3 text-xs">
                  {/* Amount Slider */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Loan Amount:</span>
                      <span className="font-mono font-bold text-white">₹{whatifParams.loan_amount?.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="100000"
                      max="5000000"
                      step="50000"
                      value={whatifParams.loan_amount}
                      onChange={e => setWhatifParams({ ...whatifParams, loan_amount: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Tenure Slider */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Tenure:</span>
                      <span className="font-mono font-bold text-white">{whatifParams.tenure_months} Months</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="360"
                      step="12"
                      value={whatifParams.tenure_months}
                      onChange={e => setWhatifParams({ ...whatifParams, tenure_months: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Loan Product Dropdown */}
                  <div>
                    <label className="block text-slate-400 mb-1">Loan Product:</label>
                    <select
                      value={whatifParams.loan_type}
                      onChange={e => setWhatifParams({ ...whatifParams, loan_type: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="Personal Loan">Personal Loan (12.0%)</option>
                      <option value="Home Loan">Home Loan (8.5%)</option>
                      <option value="Auto Loan">Auto Loan (9.5%)</option>
                      <option value="Education Loan">Education Loan (10.0%)</option>
                      <option value="Business Loan">Business Loan (14.0%)</option>
                    </select>
                  </div>
                </div>

                {/* Live Simulation Outcome Box */}
                {whatifResult && (
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-300">Simulated Result:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        whatifResult.recommendation === 'Approve' ? 'bg-emerald-950 text-emerald-400 font-bold' :
                        whatifResult.recommendation === 'Review' ? 'bg-amber-950 text-amber-400 font-bold' : 'bg-rose-950 text-rose-400 font-bold'
                      }`}>
                        {whatifResult.recommendation}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                      <div>Simulated EMI: ₹{whatifResult.emi_amount?.toLocaleString()}</div>
                      <div>EMI Ratio: {(whatifResult.emi_ratio * 100).toFixed(1)}%</div>
                    </div>
                    <p className="text-[10px] text-slate-400">{whatifResult.gap_to_approval}</p>
                  </div>
                )}

                <button
                  onClick={handleApplyTerms}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition text-xs shadow flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply These Terms (Officer Override)</span>
                </button>
              </div>

              {/* 4. Draft & Send Notification */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span>Send Applicant Message</span>
                  </span>
                  <button
                    onClick={handleGenerateDraft}
                    disabled={draftLoading}
                    className="text-[11px] text-indigo-400 hover:underline font-semibold"
                  >
                    {draftLoading ? 'Drafting...' : 'Generate Auto Draft'}
                  </button>
                </div>

                <textarea
                  rows="4"
                  value={draftMessage}
                  onChange={e => setDraftMessage(e.target.value)}
                  placeholder="Click 'Generate Auto Draft' or write custom message..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />

                {sendSuccessToast && (
                  <div className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded text-xs flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Message sent & recorded in outbox!</span>
                  </div>
                )}

                <button
                  onClick={handleSendMessage}
                  disabled={!draftMessage}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg transition text-xs flex items-center justify-center space-x-2 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message via Notifier</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
