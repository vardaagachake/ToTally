import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Reconciliation
export const runReconciliation = () => api.post('/reconciliation/run');
export const getReconciliationResults = (params) => api.get('/reconciliation/results', { params });
export const overrideMatch = (id, action) => api.put(`/reconciliation/override/${id}`, { action });

// Exceptions
export const getExceptions = (params) => api.get('/exceptions', { params });
export const getExceptionSummary = () => api.get('/exceptions/summary');
export const explainException = (id, lang) => api.get(`/exceptions/explain/${id}`, { params: { lang } });

// FX
export const checkFXDrift = () => api.get('/fx/check');
export const getFXRates = (from, to) => api.get('/fx/rates', { params: { from, to } });

// Self-Audit
export const getSelfAudit = () => api.get('/self-audit');

// Vendors
export const getVendors = () => api.get('/vendors');
export const getVendorAnomalies = () => api.get('/vendors/anomalies');
export const getOverduePayments = () => api.get('/vendors/overdue');
export const sendReminder = (data) => api.post('/vendors/reminder', data);
export const previewReminder = (data) => api.post('/vendors/reminder/preview', data);
export const dismissReminder = (invoiceNo) => api.post('/vendors/reminder/dismiss', { invoiceNo });

// Tax
export const classifyTax = () => api.get('/tax/classify');
export const getTaxSummary = () => api.get('/tax/summary');
export const getTaxRules = () => api.get('/tax/rules');
export const overrideTax = (ledgerId, ruleId) => api.put(`/tax/override/${ledgerId}`, { ruleId });

// Forecast
export const getForecast = (days) => api.get('/forecast', { params: { days } });
export const applyScenario = (scenarioType, params) => api.post('/forecast/scenario', { scenarioType, params });

// Chat
export const askQuestion = (question, language) => api.post('/chat', { question, language });

// Report
export const generateReport = (lang) => api.get('/report/generate', { params: { lang } });
export const downloadPDF = () => api.get('/report/pdf', { responseType: 'blob' });

// Actions
export const getActions = (params) => api.get('/actions', { params });

// Seed
export const seedData = () => api.post('/seed');

// Health
export const getHealth = () => api.get('/health');

export default api;
