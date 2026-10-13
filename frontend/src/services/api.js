import axios from 'axios';

// API client configured with baseURL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token into all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spendsense_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle authentication errors (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (localStorage.getItem('spendsense_token')) {
        localStorage.removeItem('spendsense_token');
        localStorage.removeItem('spendsense_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API methods
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  getAuditLogs: () => api.get('/auth/audit-logs'),
};

export const transactionService = {
  uploadCsv: (formData) => api.post('/transactions/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/transactions', { params }),
  getSummary: () => api.get('/transactions/summary'),
  getAnomalies: () => api.get('/transactions/anomalies'),
  getDuplicates: () => api.get('/transactions/duplicates'),
  detectAnomalies: (data) => api.post('/transactions/detect-anomalies', data),
  getSampleCsvUrl: () => `${API_BASE_URL}/transactions/sample-csv`,
  clearAll: () => api.delete('/transactions/clear'),
};

export const analyticsService = {
  getMonthly: () => api.get('/analytics/monthly'),
  getCategories: () => api.get('/analytics/categories'),
  getPaymentMethods: () => api.get('/analytics/payment-methods'),
  getTopTransactions: (limit = 5) => api.get('/analytics/top-transactions', { params: { limit } }),
};

export const reportService = {
  getDownloadUrl: (format) => {
    const token = localStorage.getItem('spendsense_token') || '';
    return `${API_BASE_URL}/reports/download?format=${format}&token=${encodeURIComponent(token)}`;
  },
  downloadReportBlob: (format) => api.get(`/reports/download?format=${format}`, { responseType: 'blob' }),
  getPreviewUrl: () => {
    const token = localStorage.getItem('spendsense_token') || '';
    return `${API_BASE_URL}/reports/preview-html?token=${encodeURIComponent(token)}`;
  },
  uploadToS3: (format) => api.post(`/reports/upload-to-s3?format=${format}`),
  getS3Status: () => api.get('/reports/s3-status'),
  getHistory: () => api.get('/reports/history'),
};

export const healthService = {
  check: () => api.get('/health'),
};

export default api;
