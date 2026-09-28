import React, { useState } from 'react';
import { ShieldCheck, UserCheck, FilePlus2, LogIn, ArrowRight, Clock, ChevronRight, FileText } from 'lucide-react';
import Badge from '../components/Badge';

export default function WelcomePage({
  verifiedPhone,
  onChooseLogin,
  onChooseNewRegistration,
}) {
  return (
    <div style={{ maxWidth: '680px', margin: '2.5rem auto' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #bbf7d0',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={16} />
            <span>Mobile Number Verified (+91 {verifiedPhone})</span>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            Welcome to LoanEase!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem', maxWidth: '520px', margin: '0.5rem auto 0' }}>
            Automated loan pre-screening and affordability evaluation. Please select an option below to proceed.
          </p>
        </div>

        {/* Exactly two main action cards: Login & New Registration */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* Action 1: Login */}
          <div
            onClick={onChooseLogin}
            style={{
              background: '#ffffff',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: 'var(--navy)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <LogIn size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)' }}>
                1. Login
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                Access and track your existing loan applications submitted using this mobile number (+91 {verifiedPhone}).
              </p>
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              <span>View Saved Applications</span>
              <ChevronRight size={16} />
            </div>
          </div>

          {/* Action 2: New Registration */}
          <div
            onClick={onChooseNewRegistration}
            style={{
              background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
              border: '1.5px solid var(--primary-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary-border)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <FilePlus2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)' }}>
                2. New Registration
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                Apply for a new Personal, Home, Vehicle, or Education loan with instant automated pre-screening.
              </p>
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              <span>Start Loan Application</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
