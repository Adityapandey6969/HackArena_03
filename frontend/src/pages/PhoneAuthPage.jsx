import React, { useState } from 'react';
import { Landmark, ArrowRight, ShieldCheck, PhoneCall, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function PhoneAuthPage({ onOtpSent }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePhone = (num) => {
    const cleaned = num.trim().replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    if (error) setError('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!validatePhone(phone)) {
      setError('Mobile number must begin with 6, 7, 8, or 9 and contain 10 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.sendOtp(phone);
      // Callback to parent with phone, generated OTP, and delivery status
      if (onOtpSent) {
        onOtpSent(phone, res.otp_code, res);
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
            }}
          >
            <Landmark size={28} />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            Welcome to LoanEase
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
            Verify your mobile number to continue
          </p>
        </div>

        <form onSubmit={handleSendOtp}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone-input">
              Mobile Number <span className="req">*</span>
            </label>
            <div className="input-with-prefix">
              <span className="input-prefix">+91</span>
              <input
                id="phone-input"
                type="tel"
                className={`form-input ${error ? 'is-invalid' : ''}`}
                placeholder="98765 43210"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                autoFocus
              />
            </div>
            {error ? (
              <div className="form-error">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            ) : (
              <div className="form-help">
                Enter your 10-digit Indian phone number to receive a 6-digit verification code.
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading || phone.length !== 10}
            style={{ marginTop: '1.5rem' }}
          >
            {loading ? (
              'Generating OTP...'
            ) : (
              <>
                <span>Send OTP</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
            <span>Bank-grade 256-bit encryption & privacy compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
