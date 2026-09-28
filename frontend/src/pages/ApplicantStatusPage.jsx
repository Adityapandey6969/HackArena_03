import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, IndianRupee, RefreshCw, MessageSquare } from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import NotificationBanner from '../components/NotificationBanner';

export default function ApplicantStatusPage({ appId, onBack }) {
  const [app, setApp] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [appId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getApplication(appId);
      setApp(data);
      const notifs = await api.getNotifications(appId);
      setNotifications(notifs || []);
    } catch (err) {
      setError(err.message || 'Failed to load application status.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading application status...
      </div>
    );
  }

  if (error || !app) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error || 'Application not found'}</p>
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '2rem auto 4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Applications</span>
        </button>

        <button onClick={loadData} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} />
          <span>Refresh Status</span>
        </button>
      </div>

      <div className="card">
        {/* Header with App ID and Recommendation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              APPLICATION STATUS & PRE-SCREENING REPORT
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)' }}>
              {app.app_id}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Automated Screening
              </div>
              <Badge type={app.recommendation} />
            </div>

            {app.officer_decision && (
              <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Officer Final Decision
                </div>
                <Badge type={app.officer_decision} />
              </div>
            )}
          </div>
        </div>

        {/* Plain Language Explanation Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            margin: '1.5rem 0',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Pre-Screening Explanation
          </div>
          <p style={{ color: 'var(--text-main)', fontSize: '0.925rem', lineHeight: 1.5 }}>
            {app.explanation_text}
          </p>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
            * Automated preliminary screening recommendation. Final lending decision is subject to underwriter review.
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid-3" style={{ marginBottom: '1.75rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
              MONTHLY REDUCING EMI
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
              ₹{Math.round(app.emi_amount).toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tenure: {app.tenure_months} months
            </span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
              TOTAL DEBT RATIO (EMI RATIO)
            </span>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: app.emi_ratio < 0.4 ? 'var(--success)' : app.emi_ratio > 0.6 ? 'var(--danger)' : 'var(--warning)',
                marginTop: '0.2rem',
              }}
            >
              {(app.emi_ratio * 100).toFixed(1)}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Safe threshold: &lt; 40%
            </span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
              CREDIT SCORE
            </span>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: app.credit_score > 700 ? 'var(--success)' : 'var(--warning)',
                marginTop: '0.2rem',
              }}
            >
              {app.credit_score}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Benchmark: &gt; 700
            </span>
          </div>
        </div>

        {/* 4 Eligibility Rules Breakdown */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.75rem' }}>
            Eligibility Rules Evaluation
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.isArray(app.eligibility_reasons) && app.eligibility_reasons.map((rule, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: rule.passed ? '#f0fdf4' : '#fef2f2',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  {rule.passed ? (
                    <CheckCircle2 size={18} style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} />
                  ) : (
                    <XCircle size={18} style={{ color: 'var(--danger)', marginTop: '2px', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>
                      {rule.rule_name}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {rule.reason}
                    </div>
                  </div>
                </div>

                <Badge type={rule.passed ? 'PASS' : 'FAIL'} />
              </div>
            ))}
          </div>
        </div>

        {/* Officer Decision Box if present */}
        {app.officer_decision && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                Loan Officer Final Decision
              </span>
              <Badge type={app.officer_decision} />
            </div>
            {app.officer_notes && (
              <p style={{ fontSize: '0.875rem', color: 'var(--navy)' }}>
                <strong>Officer Notes:</strong> {app.officer_notes}
              </p>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Updated on: {app.officer_decision_at ? new Date(app.officer_decision_at).toLocaleString() : 'Recently'}
            </div>
          </div>
        )}

        {/* Notification Feed */}
        {notifications.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.6rem' }}>
              Status Notifications History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {notifications.map((notif) => (
                <NotificationBanner
                  key={notif.id}
                  message={notif.message}
                  time={new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
