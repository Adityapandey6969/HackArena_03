import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, Clock, XCircle, AlertTriangle, Lightbulb, MessageSquare, ArrowRight, FileText } from 'lucide-react';
import Chatbot from './Chatbot';

export default function ApplicantTracker({ defaultAppId = 1 }) {
  const [appIdInput, setAppIdInput] = useState(defaultAppId.toString());
  const [activeAppId, setActiveAppId] = useState(defaultAppId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const fetchTrackerData = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/f5/applications/${id}/tracker`);
      if (!res.ok) throw new Error(`Application #${id} not found.`);
      const json = await res.json();
      setData(json);

      // Fetch applicant notifications
      const notifRes = await fetch(`/api/f5/notifications?app_id=${id}`);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData(activeAppId);
  }, [activeAppId]);

  const handleLookup = (e) => {
    e.preventDefault();
    const idNum = parseInt(appIdInput);
    if (idNum) {
      setActiveAppId(idNum);
    }
  };

  const app = data?.application;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* App ID Lookup Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Applicant Status & Guidance Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Track decision timeline, counterfactual recommendations, and chat with AI policy bot</p>
        </div>

        <form onSubmit={handleLookup} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="number"
              value={appIdInput}
              onChange={e => setAppIdInput(e.target.value)}
              placeholder="Enter Application ID..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition"
          >
            Track Application
          </button>
        </form>
      </div>

      {loading && (
        <div className="p-12 text-center text-slate-400 text-sm">Loading application guidance details...</div>
      )}

      {error && (
        <div className="p-6 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl text-sm flex items-center space-x-3">
          <XCircle className="w-6 h-6 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && app && (
        <div className="space-y-6">
          {/* Section 1: Visual Timeline & Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Application #{app.app_id}</span>
                <h3 className="text-2xl font-extrabold text-white mt-0.5">{app.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {app.loan_type} • ₹{app.loan_amount?.toLocaleString()} ({app.tenure_months}m) • Monthly Income: ₹{app.monthly_income?.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider shadow-md ${
                  app.recommendation === 'Approve' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  app.recommendation === 'Review' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  STATUS: {app.recommendation}
                </span>
              </div>
            </div>

            {/* Visual Timeline */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Application Progress Timeline</h4>
              <div className="relative flex items-center justify-between max-w-3xl mx-auto px-4">
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-800 -z-0" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white mt-2">Submitted</span>
                  <span className="text-[10px] text-slate-400">Initial Form</span>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white mt-2">Screened</span>
                  <span className="text-[10px] text-slate-400">F2/F3 Rules</span>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                    app.recommendation === 'Approve' ? 'bg-emerald-600 text-white' :
                    app.recommendation === 'Review' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {app.recommendation === 'Approve' ? <CheckCircle2 className="w-5 h-5" /> :
                     app.recommendation === 'Review' ? <Clock className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-bold text-white mt-2">{app.recommendation}</span>
                  <span className="text-[10px] text-slate-400">Current Decision</span>
                </div>
              </div>
            </div>

            {/* Explanation text */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <strong className="text-white block mb-1">Decision Summary:</strong>
              {data.explanation_text}
            </div>
          </div>

          {/* Section 2: Gap to Approval Banner */}
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/40 rounded-2xl p-5 shadow-lg flex items-start space-x-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl flex-shrink-0 mt-0.5">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Gap to Approval Engine Finding</span>
              <p className="text-sm font-bold text-white leading-snug">{data.gap_to_approval}</p>
              <p className="text-xs text-slate-400">
                Calculated by automated term optimization grid search. Contact officer or submit what-if update to apply terms.
              </p>
            </div>
          </div>

          {/* Section 3: "How to Improve" Card (2 Columns) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Actionable Guidance & Eligibility Breakdown</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: You can fix this */}
              <div className="bg-slate-950 border border-emerald-900/40 rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>You Can Fix / Adjust This</span>
                </div>

                {data.suggestions?.filter(s => ['yes', 'partly', 'slow'].includes(s.fixable)).length === 0 ? (
                  <p className="text-xs text-slate-400">No actionable term changes required.</p>
                ) : (
                  <div className="space-y-3">
                    {data.suggestions?.filter(s => ['yes', 'partly', 'slow'].includes(s.fixable)).map((s, sidx) => (
                      <div key={sidx} className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{s.issue}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.fixable === 'yes' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            {s.fixable.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-indigo-300 font-medium">{s.action}</p>
                        <p className="text-slate-400 text-[11px]">Impact: {s.impact}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: Can't be changed */}
              <div className="bg-slate-950 border border-rose-900/40 rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <XCircle className="w-4 h-4" />
                  <span>Policy Boundary (Can't Be Changed)</span>
                </div>

                {data.suggestions?.filter(s => s.fixable === 'no').length === 0 ? (
                  <p className="text-xs text-slate-400">No unfixable eligibility constraint violations detected.</p>
                ) : (
                  <div className="space-y-3">
                    {data.suggestions?.filter(s => s.fixable === 'no').map((s, sidx) => (
                      <div key={sidx} className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{s.issue}</span>
                          <span className="px-2 py-0.5 bg-rose-950 text-rose-400 rounded text-[10px] font-bold uppercase">
                            HARD CONSTRAINT
                          </span>
                        </div>
                        <p className="text-slate-300">{s.action}</p>
                        <p className="text-slate-400 text-[11px]">Impact: {s.impact}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4 & 5: RAG Chatbot & Notification Inbox */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RAG Chatbot */}
            <Chatbot appId={app.app_id} />

            {/* Notification Inbox */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col h-[550px]">
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Notifications Inbox</h3>
                  <p className="text-xs text-slate-400">Messages sent to your mobile / WhatsApp</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 text-xs">No notification messages recorded for this application.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-400">Channel: {n.channel.toUpperCase()}</span>
                        <span className="text-slate-400 text-[11px]">{new Date(n.sent_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-200 whitespace-pre-wrap font-mono text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
