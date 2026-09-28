import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, ShieldCheck, UserCheck } from 'lucide-react';

export default function Navbar({ verifiedPhone, onLogout }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <div className="brand-icon">
            <Landmark size={22} />
          </div>
          <div className="brand-text">
            <h1>LoanEase</h1>
            <div className="brand-tag">Loan Application Portal</div>
          </div>
        </Link>

        <nav className="nav-links">
          {verifiedPhone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-approve" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                <ShieldCheck size={14} />
                +91 {verifiedPhone}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  Exit Session
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <UserCheck size={16} />
              <span>Applicant Portal</span>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
