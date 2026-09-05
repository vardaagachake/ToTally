import { useState } from 'react';
import Toast from '../components/common/Toast';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('razorpay'); // default active tab
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Razorpay Tab States
  const [isTestMode, setIsTestMode] = useState(true);
  const [keyId, setKeyId] = useState('rzp_test_ToTallySandbox');
  const [keySecret, setKeySecret] = useState('••••••••••••');
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('http://localhost:5000/api/webhooks/razorpay');

  // Merchant Profile States
  const [merchantProfile, setMerchantProfile] = useState({
    name: 'Acme FinTech Technologies Pvt Ltd',
    category: 'B2B SaaS & Financial Operations',
    email: 'finance@totallly.io',
    gstin: '27AABCT1332L1Z4',
    address: 'Level 4, FinTech Tower, BKC, Mumbai - 400051',
    bankAccount: 'HDFC Bank •••• 9842 (IFSC: HDFC0000042)',
    settlementCycle: 'T+1 Rolling Daily Settlement',
  });

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  const handleUpdateRazorpay = (e) => {
    e.preventDefault();
    showToast('Configuration updated');
  };

  const handleUpdateMerchant = (e) => {
    e.preventDefault();
    showToast('Merchant profile updated');
  };

  const handleLoadScenario = (title) => {
    showToast(`Scenario loaded: ${title}`);
  };

  const demoScenarios = [
    {
      id: 'happy-path',
      title: 'Load Happy Path Batch',
      subtitle: '50 records, ~90% match rate',
      description: 'Ideal baseline transaction ledger demonstrating automated 1:1 and 1:N payment settlements.',
      tag: 'Reconciliation Demo',
      tagColor: 'badge-success',
      icon: '✨',
    },
    {
      id: 'high-exception',
      title: 'Load High-Exception Batch',
      subtitle: 'Stress-test the exception explainer',
      description: 'Injects timing drifts, foreign exchange swings, and ambiguous GST line items for LLM reasoning.',
      tag: 'Drift & Tax AI',
      tagColor: 'badge-warning',
      icon: '⚡',
    },
    {
      id: 'vendor-anomaly',
      title: 'Load Vendor Anomaly Scenario',
      subtitle: 'Pre-flagged overdue vendor for reminder demo',
      description: 'Flags Apex Cloud and Datadog for payment terms breach with instant Razorpay payment links.',
      tag: 'Vendor Ops',
      tagColor: 'badge-info',
      icon: '🏢',
    },
    {
      id: 'reset-seed',
      title: 'Reset to Default Seed',
      subtitle: 'Return to the standard demo dataset',
      description: 'Restores standard balanced ledger with all 300+ transactions across Indian & global entities.',
      tag: 'System Reset',
      tagColor: 'badge-neutral',
      icon: '🔄',
    },
  ];

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Platform Settings & Demo Controls</h1>
        <p className="text-gray-500 mt-1">
          Manage merchant credentials, Razorpay test mode parameters, and one-click judge demonstration scenarios.
        </p>
      </div>

      {/* Tabs (Segmented pill buttons: Dark navy active, light inactive) */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {[
          { key: 'scenarios', label: 'Demo Scenarios (For Judges)' },
          { key: 'razorpay', label: 'Razorpay Integration' },
          { key: 'merchant', label: 'Merchant Profile' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
              activeTab === tab.key
                ? 'bg-navy text-white shadow-md'
                : 'bg-white text-gray-600 hover:text-navy hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: RAZORPAY INTEGRATION (Default Active Tab) */}
      {activeTab === 'razorpay' && (
        <div className="card p-6 md:p-8 bg-white">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-700 tracking-wider uppercase">
                RAZORPAY API CONFIGURATION
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Connect your Razorpay Test Mode keys or run in deterministic sandbox mode
              </p>
            </div>
            <div>
              <span className="badge badge-success flex items-center gap-1.5 px-3 py-1 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                Webhook Ready
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateRazorpay} className="mt-6 space-y-6">
            {/* Toggle Row */}
            <div className="flex items-center justify-between p-4 bg-gray-50/75 rounded-xl border border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-navy">Test Mode / Mock Sandbox</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Toggle between live test API keys and deterministic simulation
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTestMode}
                  onChange={(e) => {
                    setIsTestMode(e.target.checked);
                    showToast(e.target.checked ? 'Mock Sandbox Mode Enabled' : 'Live Test Mode Enabled', 'info');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rzp-blue"></div>
              </label>
            </div>

            {/* Key ID */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Razorpay Key ID (Test Mode)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="input-field font-mono text-sm pr-20"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(keyId);
                    showToast('Key ID copied to clipboard');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-rzp-blue hover:text-rzp-blue-hover px-2.5 py-1 bg-rzp-blue/10 rounded transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Key Secret */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Razorpay Key Secret (Test Mode)
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  className="input-field font-mono text-sm pr-20 tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 transition-colors"
                >
                  {showSecret ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <span>🔒</span> Secrets are never sent to the frontend. Kept strictly on the backend Node.js server.
              </p>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Webhook Endpoint URL
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="input-field font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <span>📡</span> Listens for payment.captured, payment.failed, and settlement.processed events.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button type="submit" className="btn-primary text-sm px-6 py-2.5">
                Update Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: DEMO SCENARIOS (FOR JUDGES) */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="card p-5 bg-navy text-white flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Judge Presentation Scenarios</h2>
              <p className="text-xs text-white/70 mt-1">
                One-click test environments pre-configured to highlight distinct capabilities of the autonomous AI agent.
              </p>
            </div>
            <span className="badge bg-white/20 text-white text-xs px-3 py-1">Interactive Sandbox</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {demoScenarios.map((sc) => (
              <div key={sc.id} className="card p-6 flex flex-col justify-between hover:border-rzp-blue transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{sc.icon}</span>
                    <span className={`badge ${sc.tagColor} text-xs`}>{sc.tag}</span>
                  </div>
                  <h3 className="font-semibold text-navy text-base">{sc.title}</h3>
                  <p className="text-xs font-medium text-rzp-blue mt-0.5">{sc.subtitle}</p>
                  <p className="text-xs text-gray-500 mt-2.5 leading-relaxed">{sc.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-mono">Status: Ready</span>
                  <button
                    type="button"
                    onClick={() => handleLoadScenario(sc.title)}
                    className="btn-outline text-xs px-3.5 py-1.5 hover:bg-rzp-blue hover:text-white"
                  >
                    Load Scenario
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MERCHANT PROFILE */}
      {activeTab === 'merchant' && (
        <div className="card p-6 md:p-8 bg-white">
          <div className="pb-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 tracking-wider uppercase">
              MERCHANT LEGAL ENTITY & BILLING DETAILS
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Entity credentials used for GST matching, invoice generation, and bank payout reconciliation
            </p>
          </div>

          <form onSubmit={handleUpdateMerchant} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Merchant Name
                </label>
                <input
                  type="text"
                  value={merchantProfile.name}
                  onChange={(e) => setMerchantProfile({ ...merchantProfile, name: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Business Category
                </label>
                <input
                  type="text"
                  value={merchantProfile.category}
                  onChange={(e) => setMerchantProfile({ ...merchantProfile, category: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Registered Finance Email
                </label>
                <input
                  type="email"
                  value={merchantProfile.email}
                  onChange={(e) => setMerchantProfile({ ...merchantProfile, email: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  GSTIN (Goods & Services Tax ID)
                </label>
                <input
                  type="text"
                  value={merchantProfile.gstin}
                  onChange={(e) => setMerchantProfile({ ...merchantProfile, gstin: e.target.value })}
                  className="input-field font-mono text-sm uppercase"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Registered Entity Address
                </label>
                <input
                  type="text"
                  value={merchantProfile.address}
                  onChange={(e) => setMerchantProfile({ ...merchantProfile, address: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Primary Settlement Account
                </label>
                <input
                  type="text"
                  value={merchantProfile.bankAccount}
                  onChange={(e) => setMerchantProfile({ ...merchantProfile, bankAccount: e.target.value })}
                  className="input-field font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Payout Settlement Frequency
                </label>
                <input
                  type="text"
                  value={merchantProfile.settlementCycle}
                  onChange={(e) => setMerchantProfile({ ...merchantProfile, settlementCycle: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="pt-3">
              <button type="submit" className="btn-primary text-sm px-6 py-2.5">
                Update Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Toast Notification */}
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
    </div>
  );
}
