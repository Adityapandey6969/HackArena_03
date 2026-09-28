import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, RotateCw, AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';

export default function OTPVerifyPage({ phone, devOtp, smsInfo, onVerified, onChangePhone }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [activeDevOtp, setActiveDevOtp] = useState(devOtp || '');
  const [activeSmsInfo, setActiveSmsInfo] = useState(smsInfo || null);

  // Mask phone number e.g. +91 98*** **321
  const maskedPhone = phone && phone.length === 10
    ? `+91 ${phone.slice(0, 2)}*** **${phone.slice(7)}`
    : `+91 ${phone}`;

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.verifyOtp(phone, otp);
      if (res.is_verified) {
        if (onVerified) {
          onVerified(res);
        }
      } else {
        setError('Verification failed. Please check the code.');
      }
    } catch (err) {
      setError(err.message || 'Incorrect OTP. Please enter the valid 6-digit code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    try {
      const res = await api.sendOtp(phone);
      setActiveDevOtp(res.otp_code);
      setActiveSmsInfo(res);
      setCooldown(30);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <button
          onClick={onChangePhone}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '1.25rem' }}
        >
          <ArrowLeft size={14} />
          <span>Change Phone Number</span>
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#eff6ff',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <KeyRound size={26} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)' }}>
            Enter Verification Code
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Verification code dispatched to{' '}
            <strong style={{ color: 'var(--navy)' }}>{maskedPhone}</strong>
          </p>
        </div>

        {/* SMS Status & Code Display */}
        {activeSmsInfo?.sms_delivered ? (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
              <span>Real SMS Dispatched via Twilio</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#15803d', margin: 0, lineHeight: 1.4 }}>
              A 6-digit verification code has been sent to your mobile phone{' '}
              <strong>{maskedPhone}</strong>. Check your text messages.
            </p>
            <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: '#15803d' }}>
              Carrier delivery typically arrives within seconds.
            </div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#64748b' }}>
              (Master test code <code>123456</code> is also accepted)
            </div>
          </div>
        ) : (
          activeDevOtp && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px dashed #3b82f6',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                  Dev Mode Simulation
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '6px', color: '#1e40af', margin: '0.25rem 0' }}>
                {activeDevOtp}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginBottom: '0.5rem' }}>
                Enter code above or master code <strong>123456</strong>
              </div>
              <button
                type="button"
                onClick={() => setOtp(activeDevOtp)}
                className="btn btn-sm btn-outline-primary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
              >
                Auto-Fill OTP
              </button>
            </div>
          )
        )}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label" style={{ textAlign: 'center' }}>
              6-Digit OTP Code <span className="req">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className={`form-input ${error ? 'is-invalid' : ''}`}
              style={{
                textAlign: 'center',
                fontSize: '1.5rem',
                letterSpacing: '8px',
                fontWeight: 700,
                padding: '0.75rem',
              }}
              placeholder="••••••"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (error) setError('');
              }}
              autoFocus
            />

            {error ? (
              <div className="form-error" style={{ justifyContent: 'center' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            ) : (
              <div className="form-help" style={{ textAlign: 'center' }}>
                Enter the 6-digit code or fallback master code (123456)
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading || otp.length !== 6}
            style={{ marginTop: '1.5rem' }}
          >
            {loading ? (
              'Verifying...'
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Verify OTP & Continue</span>
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Didn't receive code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="btn btn-secondary btn-sm"
            style={{ color: cooldown > 0 ? 'var(--text-light)' : 'var(--primary)' }}
          >
            <RotateCw size={14} />
            <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
