import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, CheckSquare, AlertCircle, Info, Calculator, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';

export default function LoanApplicationPage({
  verifiedPhone,
  onBack,
  onSubmitSuccess,
}) {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: verifiedPhone || '',
    age: '',
    employment_type: 'Salaried',
    monthly_income: '',
    existing_emi: '0',
    credit_score: '750',
    loan_type: 'Personal Loan',
    loan_amount: '',
    tenure_months: '36',
    confirmed: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    // Load configurable loan products from DB
    api.getLoanProducts()
      .then((data) => {
        if (data && data.length > 0) {
          setProducts(data);
        }
      })
      .catch((err) => console.error('Error loading loan products:', err));
  }, []);

  // Update phone if prop changes
  useEffect(() => {
    if (verifiedPhone) {
      setFormData((prev) => ({ ...prev, phone: verifiedPhone }));
    }
  }, [verifiedPhone]);

  // Selected product details
  const selectedProduct = products.find((p) => p.loan_type === formData.loan_type) || {
    interest_rate: 11.5,
    min_income: 25000,
    max_tenure_months: 60,
  };

  // Calculate live estimated EMI for instant applicant feedback
  const calculateLiveEmi = () => {
    const P = parseFloat(formData.loan_amount);
    const n = parseInt(formData.tenure_months, 10);
    const rate = selectedProduct.interest_rate || 10.0;
    if (!P || P <= 0 || !n || n <= 0) return 0;
    if (rate <= 0) return Math.round(P / n);
    const r = rate / 12 / 100;
    const factor = Math.pow(1 + r, n);
    return Math.round((P * r * factor) / (factor - 1));
  };

  const liveEmi = calculateLiveEmi();

  // Validate form fields
  const validate = () => {
    const errs = {};

    // Section 1: Applicant info
    if (!formData.name || formData.name.trim().length < 2) {
      errs.name = 'Full name is required and must be at least 2 characters.';
    }

    const ageNum = parseInt(formData.age, 10);
    if (!formData.age || isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      errs.age = 'Age is required and must be between 18 and 100 years.';
    }

    if (!formData.employment_type) {
      errs.employment_type = 'Please select your employment type.';
    }

    // Section 2: Financial info
    const incomeNum = parseFloat(formData.monthly_income);
    if (!formData.monthly_income || isNaN(incomeNum) || incomeNum <= 0) {
      errs.monthly_income = 'Monthly income is required and must be greater than zero.';
    }

    const emiNum = parseFloat(formData.existing_emi);
    if (formData.existing_emi === '' || isNaN(emiNum) || emiNum < 0) {
      errs.existing_emi = 'Existing monthly EMI cannot be negative (enter 0 if none).';
    }

    const creditNum = parseInt(formData.credit_score, 10);
    if (!formData.credit_score || isNaN(creditNum) || creditNum < 300 || creditNum > 900) {
      errs.credit_score = 'Credit score is required and must be between 300 and 900.';
    }

    // Section 3: Loan requirements
    if (!formData.loan_type) {
      errs.loan_type = 'Please select a loan type.';
    }

    const amountNum = parseFloat(formData.loan_amount);
    if (!formData.loan_amount || isNaN(amountNum) || amountNum <= 0) {
      errs.loan_amount = 'Loan amount is required and must be greater than zero.';
    }

    const tenureNum = parseInt(formData.tenure_months, 10);
    if (!formData.tenure_months || isNaN(tenureNum) || tenureNum <= 0) {
      errs.tenure_months = 'Tenure must be a positive integer.';
    } else if (tenureNum > 360) {
      errs.tenure_months = 'Tenure cannot exceed 360 months.';
    }

    // Section 4: Confirmation
    if (!formData.confirmed) {
      errs.confirmed = 'You must confirm that the information provided is accurate and complete.';
    }

    return errs;
  };

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        age: parseInt(formData.age, 10),
        employment_type: formData.employment_type,
        monthly_income: parseFloat(formData.monthly_income),
        existing_emi: parseFloat(formData.existing_emi),
        credit_score: parseInt(formData.credit_score, 10),
        loan_type: formData.loan_type,
        loan_amount: parseFloat(formData.loan_amount),
        tenure_months: parseInt(formData.tenure_months, 10),
        confirmed: Boolean(formData.confirmed),
      };

      const result = await api.submitApplication(payload);
      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }
    } catch (err) {
      setServerError(err.message || 'Submission failed. Please check the details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if submit button can be clicked
  const isFormValid =
    formData.name.trim().length >= 2 &&
    formData.age >= 18 &&
    formData.age <= 100 &&
    parseFloat(formData.monthly_income) > 0 &&
    parseFloat(formData.existing_emi) >= 0 &&
    parseInt(formData.credit_score, 10) >= 300 &&
    parseInt(formData.credit_score, 10) <= 900 &&
    parseFloat(formData.loan_amount) > 0 &&
    parseInt(formData.tenure_months, 10) > 0 &&
    formData.confirmed;

  return (
    <div style={{ maxWidth: '840px', margin: '1.5rem auto 3rem' }}>
      <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.25rem' }}>
        <ArrowLeft size={16} />
        <span>Back to Portal Home</span>
      </button>

      <div className="card">
        {/* Title & Subtitle */}
        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
          <h2 className="card-title">Loan Application Form</h2>
          <p className="card-subtitle">
            Please provide your personal, financial, and loan details to begin the pre-screening process.
          </p>
        </div>

        {serverError && (
          <div className="notification-banner" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Submission Error:</strong> {serverError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: APPLICANT INFORMATION */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                }}
              >
                SECTION 1
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)' }}>
                Applicant Information
              </h3>
            </div>

            <div className="grid-2">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">
                  Full Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'is-invalid' : ''}`}
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
                {errors.name && (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>

              {/* Mobile Number (Read-only) */}
              <div className="form-group">
                <label className="form-label">
                  Mobile Number <span className="req">*</span>
                </label>
                <div className="input-with-prefix">
                  <span className="input-prefix">+91</span>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    readOnly
                    style={{ backgroundColor: '#f8fafc', color: 'var(--navy)', fontWeight: 600, cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-help" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ShieldCheck size={12} />
                  <span>Verified via OTP</span>
                </div>
              </div>

              {/* Age */}
              <div className="form-group">
                <label className="form-label">
                  Age (Years) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  className={`form-input ${errors.age ? 'is-invalid' : ''}`}
                  placeholder="e.g. 30"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                />
                {errors.age ? (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.age}</span>
                  </div>
                ) : (
                  <div className="form-help">Must be between 18 and 100 (Eligibility requires 21–60)</div>
                )}
              </div>

              {/* Employment Type */}
              <div className="form-group">
                <label className="form-label">
                  Employment Type <span className="req">*</span>
                </label>
                <select
                  className={`form-select ${errors.employment_type ? 'is-invalid' : ''}`}
                  value={formData.employment_type}
                  onChange={(e) => handleChange('employment_type', e.target.value)}
                >
                  <option value="Salaried">Salaried</option>
                  <option value="Self-employed">Self-employed</option>
                </select>
                {errors.employment_type && (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.employment_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.75rem 0' }} />

          {/* SECTION 2: FINANCIAL INFORMATION */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                }}
              >
                SECTION 2
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)' }}>
                Financial Information
              </h3>
            </div>

            <div className="grid-3">
              {/* Monthly Income */}
              <div className="form-group">
                <label className="form-label">
                  Monthly Income <span className="req">*</span>
                </label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    min="1"
                    className={`form-input ${errors.monthly_income ? 'is-invalid' : ''}`}
                    placeholder="e.g. 75000"
                    value={formData.monthly_income}
                    onChange={(e) => handleChange('monthly_income', e.target.value)}
                  />
                </div>
                {errors.monthly_income ? (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.monthly_income}</span>
                  </div>
                ) : (
                  <div className="form-help">Gross monthly salary or net business income</div>
                )}
              </div>

              {/* Existing Monthly EMI */}
              <div className="form-group">
                <label className="form-label">
                  Existing Monthly EMI <span className="req">*</span>
                </label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    className={`form-input ${errors.existing_emi ? 'is-invalid' : ''}`}
                    placeholder="0"
                    value={formData.existing_emi}
                    onChange={(e) => handleChange('existing_emi', e.target.value)}
                  />
                </div>
                {errors.existing_emi ? (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.existing_emi}</span>
                  </div>
                ) : (
                  <div className="form-help">Enter 0 if you currently have no EMI obligations</div>
                )}
              </div>

              {/* Credit Score */}
              <div className="form-group">
                <label className="form-label">
                  Credit Score <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="300"
                  max="900"
                  className={`form-input ${errors.credit_score ? 'is-invalid' : ''}`}
                  placeholder="e.g. 750"
                  value={formData.credit_score}
                  onChange={(e) => handleChange('credit_score', e.target.value)}
                />
                {errors.credit_score ? (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.credit_score}</span>
                  </div>
                ) : (
                  <div className="form-help">CIBIL/Experian score range: 300 to 900 (&gt;700 preferred)</div>
                )}
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.75rem 0' }} />

          {/* SECTION 3: LOAN REQUIREMENTS */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                }}
              >
                SECTION 3
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)' }}>
                Loan Requirements
              </h3>
            </div>

            <div className="grid-3">
              {/* Loan Type */}
              <div className="form-group">
                <label className="form-label">
                  Loan Type <span className="req">*</span>
                </label>
                <select
                  className={`form-select ${errors.loan_type ? 'is-invalid' : ''}`}
                  value={formData.loan_type}
                  onChange={(e) => handleChange('loan_type', e.target.value)}
                >
                  <option value="Personal Loan">Personal Loan (11.5% p.a.)</option>
                  <option value="Home Loan">Home Loan (8.5% p.a.)</option>
                  <option value="Education Loan">Education Loan (9.0% p.a.)</option>
                  <option value="Vehicle Loan">Vehicle Loan (9.5% p.a.)</option>
                </select>
                {errors.loan_type ? (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.loan_type}</span>
                  </div>
                ) : (
                  <div className="form-help">
                    Min Income: ₹{selectedProduct.min_income?.toLocaleString('en-IN')} | Max Tenure: {selectedProduct.max_tenure_months}m
                  </div>
                )}
              </div>

              {/* Loan Amount */}
              <div className="form-group">
                <label className="form-label">
                  Loan Amount <span className="req">*</span>
                </label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    className={`form-input ${errors.loan_amount ? 'is-invalid' : ''}`}
                    placeholder="Enter any loan amount (e.g. 50000, 250000, 1000000)"
                    value={formData.loan_amount}
                    onChange={(e) => handleChange('loan_amount', e.target.value)}
                  />
                </div>
                {errors.loan_amount ? (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.loan_amount}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    {['50000', '100000', '250000', '500000', '1000000', '2500000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleChange('loan_amount', amt)}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px' }}
                      >
                        ₹{Number(amt).toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Loan Tenure */}
              <div className="form-group">
                <label className="form-label">
                  Loan Tenure (Months) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="360"
                  className={`form-input ${errors.tenure_months ? 'is-invalid' : ''}`}
                  placeholder="e.g. 36"
                  value={formData.tenure_months}
                  onChange={(e) => handleChange('tenure_months', e.target.value)}
                />
                {errors.tenure_months ? (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    <span>{errors.tenure_months}</span>
                  </div>
                ) : (
                  <div className="form-help">Enter positive tenure up to 360 months</div>
                )}
              </div>
            </div>

            {/* Dynamic Reducing Balance EMI Box */}
            {liveEmi > 0 && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)',
                  border: '1px solid #bae6fd',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Calculator size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)' }}>
                      Estimated Monthly EMI ({selectedProduct.interest_rate}% p.a. reducing balance)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Calculated automatically based on your requested loan amount and tenure
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{liveEmi.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> / month</span>
                </div>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.75rem 0' }} />

          {/* SECTION 4: CONFIRMATION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                }}
              >
                SECTION 4
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)' }}>
                Confirmation
              </h3>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Please review your information carefully before submitting your loan application.
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <input
                id="confirm-check"
                type="checkbox"
                checked={formData.confirmed}
                onChange={(e) => handleChange('confirmed', e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <label
                htmlFor="confirm-check"
                style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--navy)', cursor: 'pointer', lineHeight: 1.4 }}
              >
                I confirm that the information provided above is accurate and complete.
              </label>
            </div>
            {errors.confirmed && (
              <div className="form-error" style={{ marginTop: '0.5rem' }}>
                <AlertCircle size={14} />
                <span>{errors.confirmed}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onBack} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                'Submitting & Running Pre-Screening...'
              ) : (
                <>
                  <Send size={18} />
                  <span>Submit Loan Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
