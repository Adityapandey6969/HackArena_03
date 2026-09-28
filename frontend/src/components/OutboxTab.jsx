import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';

export default function OutboxTab({ appIdFilter = null }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOutbox = async () => {
    setLoading(true);
    try {
      const url = appIdFilter ? `/api/f5/notifications?app_id=${appIdFilter}` : '/api/f5/notifications';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbox();
  }, [appIdFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Outbox: Messages Sent</h3>
            <p className="text-xs text-slate-400">All applicant status updates sent via WhatsApp API or Mock Mode</p>
          </div>
        </div>
        <button
          onClick={fetchOutbox}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm">
          No notifications sent yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div key={notif.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white">App #{notif.app_id} ({notif.applicant_name})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    notif.channel === 'whatsapp' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {notif.channel.toUpperCase()} MODE
                  </span>
                </div>
                <span className="text-slate-400">{new Date(notif.sent_at).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-200 font-mono whitespace-pre-wrap">
                {notif.message}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Delivery Status: <strong className="text-slate-200">{notif.delivery_status}</strong></span>
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Logged to Database</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
