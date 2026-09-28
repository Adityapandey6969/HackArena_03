import React, { useState } from 'react';
import { UserPlus, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function SubmitForm({ onAppCreated }) {
  const [formData, setFormData] = useState({
    name: 'Rohan Sharma',
    age: 32,
    employment_type: 'Salaried',
    monthly_income: 65000,
    loan_type: 'Personal Loan',
    loan_amount: 500000,
    tenure_months: 36,
    existing_emi: 6000,
    credit_score: 720
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/f1/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to submit application');
      const data = await res.json();
      setResult(data);
      if (onAppCreated) onAppCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Submit New Loan Application (F1 Stub)</h2>
            <p className="text-sm text-slate-400">Creates applicant record and triggers immediate F5 decision engine execution</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Age (Years)</label>
              <input
                type="number"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Employment Type</label>
              <select
                value={formData.employment_type}
                onChange={e => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Salaried">Salaried</option>
                <option value="Self-Employed">Self-Employed</option>
                <option value="Business">Business</option>
                <option value="Freelancer">Freelancer (Non-eligible)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Monthly Income (₹)</label>
              <input
                type="number"
                value={formData.monthly_income}
                onChange={e => setFormData({ ...formData, monthly_income: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Loan Product</label>
              <select
                value={formData.loan_type}
                onChange={e => setFormData({ ...formData, loan_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Personal Loan">Personal Loan (12.0%)</option>
                <option value="Home Loan">Home Loan (8.5%)</option>
                <option value="Auto Loan">Auto Loan (9.5%)</option>
                <option value="Education Loan">Education Loan (10.0%)</option>
                <option value="Business Loan">Business Loan (14.0%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Requested Amount (₹)</label>
              <input
                type="number"
                value={formData.loan_amount}
                onChange={e => setFormData({ ...formData, loan_amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tenure (Months)</label>
              <input
                type="number"
                value={formData.tenure_months}
                onChange={e => setFormData({ ...formData, tenure_months: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Existing Monthly EMI (₹)</label>
              <input
                type="number"
                value={formData.existing_emi}
                onChange={e => setFormData({ ...formData, existing_emi: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Credit Score (300-850)</label>
              <input
                type="number"
                value={formData.credit_score}
                onChange={e => setFormData({ ...formData, credit_score: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            <span>{loading ? 'Processing Decision Engine...' : 'Submit & Compute Recommendation'}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-rose-900/30 border border-rose-800 text-rose-300 rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-6 p-5 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Application Submitted Successfully (App #{result.app_id})</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                result.recommendation === 'Approve' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                result.recommendation === 'Review' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {result.recommendation?.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-400 block">Monthly EMI</span>
                <span className="text-white font-semibold">₹{result.emi_amount?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">EMI Ratio</span>
                <span className="text-white font-semibold">{(result.emi_ratio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Priority Rank</span>
                <span className="text-indigo-400 font-semibold">#{result.priority_rank}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Recoverable</span>
                <span className={result.is_recoverable ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {result.is_recoverable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 italic">{result.explanation_text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
