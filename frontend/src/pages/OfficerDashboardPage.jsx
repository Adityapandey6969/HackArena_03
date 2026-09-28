import React, { useState, useEffect } from 'react';
import {
  Search, Filter, RefreshCw, Eye, Edit3, CheckCircle2,
  AlertTriangle, XCircle, Clock, Sparkles, TrendingUp,
  FileText, ShieldCheck, ChevronRight, X
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import NotificationBanner from '../components/NotificationBanner';

export default function OfficerDashboardPage() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState('ALL');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');
  const [sortByPriority, setSortByPriority] = useState(true);

  // Selected application for detail modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [loadingGap, setLoadingGap] = useState(false);

  // Override modal / form state
  const [overrideAppId, setOverrideAppId] = useState(null);
  const [overrideDecision, setOverrideDecision] = useState('APPROVE');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [recommendationFilter, loanTypeFilter, sortByPriority]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [appsData, statsData] = await Promise.all([
        api.getApplications({
          search,
          recommendation: recommendationFilter,
          loan_type: loanTypeFilter,
          sort_by_priority: sortByPriority,
        }),
        api.getDashboardStats(),
      ]);
      setApplications(appsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load officer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadDashboardData();
  };

  const handleOpenDetail = async (app) => {
    setSelectedApp(app);
    setLoadingGap(true);
    try {
      const gap = await api.getGapAnalysis(app.app_id);
      setGapAnalysis(gap);
    } catch (err) {
      console.error('Failed to load gap analysis:', err);
      setGapAnalysis(null);
    } finally {
      setLoadingGap(false);
    }
  };

  const handleOpenOverride = (app, e) => {
    if (e) e.stopPropagation();
    setOverrideAppId(app.app_id);
    setOverrideDecision(app.officer_decision || (app.recommendation === 'APPROVE' ? 'APPROVE' : 'REVIEW'));
    setOverrideNotes(app.officer_notes || '');
    setOverrideSuccessMsg('');
  };

  const handleSubmitOverride = async (e) => {
    e.preventDefault();
    if (!overrideAppId) return;

    setSubmittingOverride(true);
    try {
      const updated = await api.overrideApplication(overrideAppId, overrideDecision, overrideNotes);
      setOverrideSuccessMsg(`Decision successfully updated to ${overrideDecision}!`);

      // Update in local state
      setApplications((prev) =>
        prev.map((a) => (a.app_id === overrideAppId ? updated : a))
      );

      if (selectedApp && selectedApp.app_id === overrideAppId) {
        setSelectedApp(updated);
      }

      // Refresh stats
      const newStats = await api.getDashboardStats();
      setStats(newStats);

      setTimeout(() => {
        setOverrideAppId(null);
        setOverrideSuccessMsg('');
      }, 1200);
    } catch (err) {
      alert(`Error saving override: ${err.message}`);
    } finally {
      setSubmittingOverride(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Title & Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <Sparkles size={14} />
            <span>Smart Officer Command Center</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy)' }}>
            Loan Officer Dashboard
          </h1>
        </div>

        <button onClick={loadDashboardData} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          {/* Total */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Applications
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy)', marginTop: '0.25rem' }}>
              {stats.total_applications}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
              All submissions
            </div>
          </div>

          {/* Pending Officer Decision */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #64748b' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending Decision
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#334155', marginTop: '0.25rem' }}>
              {stats.pending_applications}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
              Awaiting officer sign-off
            </div>
          </div>

          {/* Awaiting Review */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d97706' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase' }}>
              Priority: In Review
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.25rem' }}>
              {stats.awaiting_review}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Highest queue priority
            </div>
          </div>

          {/* Approve Rec */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>
              Approve Recs
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
              {stats.approve_recommendations}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Low risk criteria met
            </div>
          </div>

          {/* Reject Rec */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #dc2626' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>
              Reject Recs
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>
              {stats.reject_recommendations}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Rules/EMI breached
            </div>
          </div>

          {/* Average Decision Time */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Avg Decision Time
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {stats.avg_decision_time_minutes}m
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
              Submission to decision
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: '260px' }}>
          <div className="input-with-prefix" style={{ width: '100%' }}>
            <span className="input-prefix" style={{ left: '0.75rem' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by Applicant Name or Application ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Recommendation:
            </label>
            <select
              className="form-select"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
              value={recommendationFilter}
              onChange={(e) => setRecommendationFilter(e.target.value)}
            >
              <option value="ALL">All Recommendations</option>
              <option value="APPROVE">Approve</option>
              <option value="REVIEW">Review</option>
              <option value="REJECT">Reject</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Loan Type:
            </label>
            <select
              className="form-select"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
              value={loanTypeFilter}
              onChange={(e) => setLoanTypeFilter(e.target.value)}
            >
              <option value="All">All Loan Types</option>
              <option value="Personal Loan">Personal Loan</option>
              <option value="Home Loan">Home Loan</option>
              <option value="Education Loan">Education Loan</option>
              <option value="Vehicle Loan">Vehicle Loan</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setSortByPriority(!sortByPriority)}
            className={`btn btn-sm ${sortByPriority ? 'btn-outline-primary' : 'btn-secondary'}`}
            title="Sort order: 1. Review -> 2. Reject -> 3. Approve"
          >
            <TrendingUp size={14} />
            <span>{sortByPriority ? 'Priority Sorted (Review First)' : 'Sort: Date Only'}</span>
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>App ID</th>
              <th>Applicant Name</th>
              <th>Age</th>
              <th>Employment</th>
              <th>Income</th>
              <th>Loan Type</th>
              <th>Amount</th>
              <th>Tenure</th>
              <th>Exist. EMI</th>
              <th>Credit</th>
              <th>Calc. EMI</th>
              <th>EMI Ratio</th>
              <th>Eligibility</th>
              <th>Auto Rec</th>
              <th>Officer Decision</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="17" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading loan applications...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan="17" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No applications match the current search and filter criteria.
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.app_id}>
                  {/* Priority */}
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        background:
                          app.priority_rank === 1 ? '#fef3c7' : app.priority_rank === 2 ? '#fee2e2' : '#dcfce7',
                        color:
                          app.priority_rank === 1 ? '#92400e' : app.priority_rank === 2 ? '#991b1b' : '#166534',
                      }}
                      title={
                        app.priority_rank === 1
                          ? 'Priority 1: Review queue'
                          : app.priority_rank === 2
                          ? 'Priority 2: Rejection queue'
                          : 'Priority 3: Fast-track approval'
                      }
                    >
                      P{app.priority_rank}
                    </span>
                  </td>

                  {/* App ID */}
                  <td>
                    <strong style={{ color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                      {app.app_id}
                    </strong>
                  </td>

                  {/* Applicant Name */}
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {app.name}
                  </td>

                  {/* Age */}
                  <td>{app.age}</td>

                  {/* Employment */}
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {app.employment_type}
                    </span>
                  </td>

                  {/* Income */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    ₹{Math.round(app.monthly_income).toLocaleString('en-IN')}
                  </td>

                  {/* Loan Type */}
                  <td style={{ whiteSpace: 'nowrap' }}>{app.loan_type}</td>

                  {/* Amount */}
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    ₹{Math.round(app.loan_amount).toLocaleString('en-IN')}
                  </td>

                  {/* Tenure */}
                  <td>{app.tenure_months}m</td>

                  {/* Existing EMI */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    ₹{Math.round(app.existing_emi).toLocaleString('en-IN')}
                  </td>

                  {/* Credit Score */}
                  <td>
                    <strong
                      style={{
                        color: app.credit_score > 700 ? 'var(--success)' : app.credit_score >= 600 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    >
                      {app.credit_score}
                    </strong>
                  </td>

                  {/* EMI */}
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--navy)' }}>
                    ₹{Math.round(app.emi_amount).toLocaleString('en-IN')}
                  </td>

                  {/* EMI Ratio */}
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: app.emi_ratio < 0.4 ? 'var(--success)' : app.emi_ratio > 0.6 ? 'var(--danger)' : 'var(--warning)',
                      }}
                    >
                      {(app.emi_ratio * 100).toFixed(1)}%
                    </span>
                  </td>

                  {/* Eligibility */}
                  <td>
                    <Badge type={app.eligibility_status} />
                  </td>

                  {/* Recommendation */}
                  <td>
                    <Badge type={app.recommendation} />
                  </td>

                  {/* Officer Decision */}
                  <td>
                    {app.officer_decision ? (
                      <Badge type={app.officer_decision} label={`Officer: ${app.officer_decision}`} />
                    ) : (
                      <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenDetail(app)}
                        className="btn btn-secondary btn-sm"
                        title="View Full Detail & Smart Insights"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>

                      <button
                        onClick={(e) => handleOpenOverride(app, e)}
                        className="btn btn-outline-primary btn-sm"
                        title="Officer Manual Override"
                      >
                        <Edit3 size={14} />
                        <span>Override</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Application Dossier
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)' }}>
                  {selectedApp.app_id} — {selectedApp.name}
                </h3>
              </div>
              <button onClick={() => setSelectedApp(null)} className="btn btn-secondary btn-sm">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Top Decision Summary */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                    AUTOMATED PRE-SCREENING RECOMMENDATION
                  </span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <Badge type={selectedApp.recommendation} />
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                    OFFICER FINAL DECISION
                  </span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {selectedApp.officer_decision ? (
                      <Badge type={selectedApp.officer_decision} label={selectedApp.officer_decision} />
                    ) : (
                      <span className="badge badge-pending">Pending Officer Sign-off</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handleOpenOverride(selectedApp, e)}
                  className="btn btn-primary btn-sm"
                >
                  <Edit3 size={14} />
                  <span>Update Decision</span>
                </button>
              </div>

              {/* Smart Command Center Plain-Language Explanation */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                  border: '1px solid #bfdbfe',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <Sparkles size={16} />
                  <span>Automated Underwriting Explanation</span>
                </div>
                <p style={{ color: 'var(--navy)', fontSize: '0.925rem', lineHeight: 1.5 }}>
                  {selectedApp.explanation_text}
                </p>
              </div>

              {/* Applicant & Financial Data Grid */}
              <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                    Applicant & Loan Profile
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <div><strong>Mobile:</strong> +91 {selectedApp.phone}</div>
                    <div><strong>Age:</strong> {selectedApp.age} years</div>
                    <div><strong>Employment:</strong> {selectedApp.employment_type}</div>
                    <div><strong>Loan Product:</strong> {selectedApp.loan_type}</div>
                    <div><strong>Requested Amount:</strong> ₹{Math.round(selectedApp.loan_amount).toLocaleString('en-IN')}</div>
                    <div><strong>Requested Tenure:</strong> {selectedApp.tenure_months} months</div>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                    Financial & Risk Metrics
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <div><strong>Monthly Income:</strong> ₹{Math.round(selectedApp.monthly_income).toLocaleString('en-IN')}</div>
                    <div><strong>Existing EMI:</strong> ₹{Math.round(selectedApp.existing_emi).toLocaleString('en-IN')}</div>
                    <div><strong>Credit Score:</strong> {selectedApp.credit_score} / 900</div>
                    <div><strong>Reducing-balance EMI:</strong> ₹{Math.round(selectedApp.emi_amount).toLocaleString('en-IN')}</div>
                    <div><strong>Total EMI Ratio:</strong> {(selectedApp.emi_ratio * 100).toFixed(1)}% (Threshold: &lt;40%)</div>
                    <div><strong>Queue Priority:</strong> Rank {selectedApp.priority_rank}</div>
                  </div>
                </div>
              </div>

              {/* 4 Eligibility Rules Breakdown */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.75rem' }}>
                  Eligibility Rule Verification Outcomes
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Array.isArray(selectedApp.eligibility_reasons) && selectedApp.eligibility_reasons.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: r.passed ? '#f0fdf4' : '#fef2f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.rule_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.reason}</div>
                      </div>
                      <Badge type={r.passed ? 'PASS' : 'FAIL'} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Gap to Approval Calculator Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--navy)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <TrendingUp size={16} color="var(--primary)" />
                  <span>Gap-to-Approval Calculator (Feature 5.1)</span>
                </div>

                {loadingGap ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating tested scenarios...</div>
                ) : gapAnalysis ? (
                  <div>
                    {gapAnalysis.found_solution && gapAnalysis.best_adjustment ? (
                      <div
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          <CheckCircle2 size={16} />
                          <span>Identified Smallest Adjustment for Approval:</span>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.95rem' }}>
                          {gapAnalysis.best_adjustment.tested_type}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--navy)', marginTop: '0.35rem' }}>
                          {gapAnalysis.best_adjustment.explanation}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Revised Loan: <strong>₹{Math.round(gapAnalysis.best_adjustment.revised_loan_amount).toLocaleString('en-IN')}</strong></span>
                          <span>Revised Tenure: <strong>{gapAnalysis.best_adjustment.revised_tenure_months}m</strong></span>
                          <span>Revised EMI: <strong>₹{Math.round(gapAnalysis.best_adjustment.revised_emi).toLocaleString('en-IN')}</strong></span>
                          <span>Revised Ratio: <strong>{(gapAnalysis.best_adjustment.revised_emi_ratio * 100).toFixed(1)}%</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.85rem 1rem',
                          fontSize: '0.85rem',
                          color: '#92400e',
                        }}
                      >
                        {gapAnalysis.message}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    No adjustment required or available.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedApp(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL OVERRIDE MODAL */}
      {overrideAppId && (
        <div className="modal-overlay" onClick={() => setOverrideAppId(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)' }}>
                Loan Officer Manual Override
              </h3>
              <button onClick={() => setOverrideAppId(null)} className="btn btn-secondary btn-sm">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitOverride}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Update underwriting decision for application <strong>{overrideAppId}</strong>.
                  The original automated recommendation is preserved separately.
                </p>

                {overrideSuccessMsg && (
                  <div style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {overrideSuccessMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Officer Decision <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={overrideDecision}
                    onChange={(e) => setOverrideDecision(e.target.value)}
                    required
                  >
                    <option value="APPROVE">APPROVE</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Underwriting Notes / Rationale
                  </label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Enter reason for decision or additional verification notes..."
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setOverrideAppId(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingOverride}>
                  {submittingOverride ? 'Saving...' : 'Save Decision & Notify Applicant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
