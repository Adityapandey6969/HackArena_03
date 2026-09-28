import React, { useState, useEffect } from 'react';
import { ArrowLeft, FilePlus2, Eye, Calendar, Clock, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';

export default function ApplicantApplicationsPage({
  verifiedPhone,
  onBackToWelcome,
  onStartNewApplication,
}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewReceiptApp, setViewReceiptApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [verifiedPhone]);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getApplicantApplications(verifiedPhone);
      setApplications(data);
    } catch (err) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={onBackToWelcome} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Welcome</span>
        </button>

        <button onClick={onStartNewApplication} className="btn btn-primary btn-sm">
          <FilePlus2 size={16} />
          <span>New Registration</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <h2 className="card-title">Applicant Portal — Submitted Applications</h2>
          <p className="card-subtitle">
            Showing all loan applications registered under mobile number: <strong>+91 {verifiedPhone}</strong>
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading your loan applications...
          </div>
        ) : applications.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#f8fafc',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                border: '1px solid var(--border)',
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)' }}>
              No Existing Applications Found
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '0.5rem auto 1.5rem' }}>
              No loan applications have been submitted for <strong>+91 {verifiedPhone}</strong> yet.
              Click New Registration to submit an application.
            </p>
            <button onClick={onStartNewApplication} className="btn btn-primary">
              <FilePlus2 size={18} />
              <span>Start New Registration</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {applications.map((app) => (
              <div
                key={app.app_id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  backgroundColor: '#ffffff',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>
                      {app.app_id}
                    </span>
                    {app.officer_decision ? (
                      <Badge
                        type={app.officer_decision}
                        label={`Officer Decision: ${app.officer_decision}`}
                      />
                    ) : (
                      <span className="badge badge-pending">
                        <Clock size={12} />
                        Submitted – Under Review
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)' }}>
                    {app.loan_type} — ₹{Number(app.loan_amount).toLocaleString('en-IN')} ({app.tenure_months} months)
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                    <span>Applicant: {app.name}</span>
                    <span>Date: {new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setViewReceiptApp(app)}
                    className="btn btn-outline-primary btn-sm"
                  >
                    <Eye size={16} />
                    <span>View Submission</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applicant Submission Receipt Modal (No internal screening details) */}
      {viewReceiptApp && (
        <div className="modal-overlay" onClick={() => setViewReceiptApp(null)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)' }}>
                Application Submission Details
              </h3>
              <button onClick={() => setViewReceiptApp(null)} className="btn btn-secondary btn-sm">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Application Reference
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>
                  {viewReceiptApp.app_id}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  {viewReceiptApp.officer_decision ? (
                    <Badge type={viewReceiptApp.officer_decision} label={`Decision: ${viewReceiptApp.officer_decision}`} />
                  ) : (
                    <span className="badge badge-pending">
                      <Clock size={12} />
                      Submitted – Under Review
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Applicant Name</span>
                    <strong>{viewReceiptApp.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Registered Mobile</span>
                    <strong>+91 {viewReceiptApp.phone}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Loan Type</span>
                    <strong>{viewReceiptApp.loan_type}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Requested Amount</span>
                    <strong>₹{Number(viewReceiptApp.loan_amount).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Tenure</span>
                    <strong>{viewReceiptApp.tenure_months} Months</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Submitted On</span>
                    <strong>{new Date(viewReceiptApp.created_at).toLocaleDateString()}</strong>
                  </div>
                </div>

                {viewReceiptApp.officer_notes && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Officer Remarks</span>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--navy)' }}>{viewReceiptApp.officer_notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setViewReceiptApp(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
