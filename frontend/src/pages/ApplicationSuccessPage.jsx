import React from 'react';
import { CheckCircle2, Home, FilePlus2, ShieldCheck, Clock } from 'lucide-react';
import NotificationBanner from '../components/NotificationBanner';

export default function ApplicationSuccessPage({
  application,
  onGoToDashboard,
  onApplyAnother,
}) {
  if (!application) return null;

  return (
    <div style={{ maxWidth: '640px', margin: '2.5rem auto' }}>
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            border: '2px solid var(--success-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)' }}>
          Application Submitted Successfully!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
          Your loan application has been received and forwarded to our loan underwriting team for review.
        </p>

        {/* Highlight Application ID */}
        <div
          style={{
            background: '#eff6ff',
            border: '1.5px dashed var(--primary-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1rem',
            margin: '1.75rem 0',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Unique Application Reference Number
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '2px', marginTop: '0.2rem' }}>
            {application.app_id}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Please save this reference number for all future inquiries.
          </div>
        </div>

        {/* Application Summary Box */}
        <div
          style={{
            textAlign: 'left',
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block' }}>Applicant Name</span>
              <strong style={{ color: 'var(--navy)', fontSize: '0.95rem' }}>{application.name}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block' }}>Mobile Number</span>
              <strong style={{ color: 'var(--navy)', fontSize: '0.95rem' }}>+91 {application.phone}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block' }}>Loan Type</span>
              <strong style={{ color: 'var(--navy)', fontSize: '0.95rem' }}>{application.loan_type}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block' }}>Loan Amount</span>
              <strong style={{ color: 'var(--navy)', fontSize: '0.95rem' }}>
                ₹{Number(application.loan_amount).toLocaleString('en-IN')}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block' }}>Tenure</span>
              <strong style={{ color: 'var(--navy)', fontSize: '0.95rem' }}>{application.tenure_months} Months</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block' }}>Status</span>
              <span className="badge badge-pending">
                <Clock size={12} />
                Submitted – Under Review
              </span>
            </div>
          </div>
        </div>

        {/* Status notification banner */}
        {application.last_notified_status && (
          <NotificationBanner message={application.last_notified_status} />
        )}

        {/* Information box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            textAlign: 'left',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '1.75rem',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '0.25rem' }}>
            What happens next?
          </div>
          Our loan officer will review your application and documents. An SMS update will be dispatched to <strong>+91 {application.phone}</strong> once the underwriting decision is finalized.
        </div>

        {/* Clean action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={onGoToDashboard}
            className="btn btn-primary btn-block btn-lg"
          >
            <Home size={18} />
            <span>Return to Applicant Portal</span>
          </button>

          {onApplyAnother && (
            <button
              onClick={onApplyAnother}
              className="btn btn-secondary btn-block"
            >
              <FilePlus2 size={16} />
              <span>Submit Another Loan Application</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
