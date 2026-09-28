// API Client for LoanEase Pre-Screening System
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.detail || data?.message || `HTTP error ${res.status}`;
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  sendOtp: (phone) => request('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  }),

  verifyOtp: (phone, otp_code) => request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp_code }),
  }),

  getApplicantApplications: (phone) => request(`/api/auth/applicant/${phone}/applications`),

  // Products
  getLoanProducts: () => request('/api/applications/products'),

  // Applications
  submitApplication: (data) => request('/api/applications', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getApplications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.recommendation && params.recommendation !== 'ALL') query.append('recommendation', params.recommendation);
    if (params.loan_type && params.loan_type !== 'All') query.append('loan_type', params.loan_type);
    if (params.sort_by_priority !== undefined) query.append('sort_by_priority', params.sort_by_priority);
    return request(`/api/applications?${query.toString()}`);
  },

  getApplication: (appId) => request(`/api/applications/${appId}`),

  reScreenApplication: (appId) => request(`/api/applications/${appId}/screen`, {
    method: 'POST',
  }),

  overrideApplication: (appId, decision, notes) => request(`/api/applications/${appId}/override`, {
    method: 'POST',
    body: JSON.stringify({ decision, notes }),
  }),

  getGapAnalysis: (appId) => request(`/api/applications/${appId}/gap-analysis`),

  getNotifications: (appId) => request(`/api/applications/${appId}/notifications`),

  // Dashboard Stats
  getDashboardStats: () => request('/api/dashboard/stats'),
};
