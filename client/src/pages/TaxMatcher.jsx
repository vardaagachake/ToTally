import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getTaxSummary, getTaxRules, overrideTax } from '../api';

const SLAB_COLORS = ['#00C566', '#3395FF', '#FFAA00', '#FF5B5B', '#8b5cf6', '#06b6d4'];

export default function TaxMatcher() {
  const [summary, setSummary] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmbiguous, setSelectedAmbiguous] = useState(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [resSummary, resRules] = await Promise.all([getTaxSummary(), getTaxRules()]);
      setSummary(resSummary.data);
      setRules(resRules.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride(ledgerId, ruleId) {
    try {
      await overrideTax(ledgerId, ruleId);
      setSelectedAmbiguous(null);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-rzp-blue border-t-transparent rounded-full animate-spin"></div></div>;

  const pieData = (summary?.bySlab || []).map((s) => ({
    name: `GST ${s.rate}%`,
    value: s.taxAmount,
    count: s.count,
  }));

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Tax Matcher</h1>
        <p className="text-gray-500 mt-1">Rule-based GST classification with audit trail</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="card p-5">
          <p className="stat-label">Total Tax Liability</p>
          <p className="stat-value text-navy">₹{(summary?.totalTaxLiability || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="card p-5">
          <p className="stat-label">Transactions Classified</p>
          <p className="stat-value text-success">{summary?.totalTransactions || 0}</p>
        </div>
        <div className="card p-5">
          <p className="stat-label">Needs Review</p>
          <p className="stat-value text-warning">{summary?.needsReview || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Ambiguous classifications</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="section-title">Tax by GST Slab</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {pieData.map((_, i) => <Cell key={i} fill={SLAB_COLORS[i % SLAB_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="section-title">Base Amount by Slab</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summary?.bySlab || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="rate" tickFormatter={(v) => `${v}%`} />
              <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              <Bar dataKey="baseAmount" fill="#3395FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Slab Summary Table */}
      <div className="card p-6 mb-8">
        <h3 className="section-title">GST Slab Summary</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">GST Rate</th>
              <th className="px-4 py-3 text-left">Transactions</th>
              <th className="px-4 py-3 text-left">Base Amount</th>
              <th className="px-4 py-3 text-left">Tax Amount</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.bySlab || []).map((slab, i) => (
              <tr key={i} className="table-row">
                <td className="px-4 py-3 font-semibold">{slab.rate}%</td>
                <td className="px-4 py-3">{slab.count}</td>
                <td className="px-4 py-3">₹{slab.baseAmount.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 font-semibold text-navy">₹{slab.taxAmount.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Classification Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-navy">Transaction Classifications</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">GST Rate</th>
                <th className="px-4 py-3 text-left">Rule Applied</th>
                <th className="px-4 py-3 text-left">Tax</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.details || []).map((row, i) => (
                <tr key={i} className={`table-row ${row.isAmbiguous ? 'bg-warning/5' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs">{row.invoiceNo}</td>
                  <td className="px-4 py-3">{row.vendorName || '—'}</td>
                  <td className="px-4 py-3 font-semibold">₹{row.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500">{row.category}</td>
                  <td className="px-4 py-3">
                    {row.isAmbiguous ? (
                      <span className="badge badge-warning">Needs Review</span>
                    ) : (
                      <span className="badge badge-success">{row.gstRate}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={row.ruleDescription}>
                    <span className="font-mono text-rzp-blue">{row.ruleId}</span>: {row.ruleDescription}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {row.taxAmount != null ? `₹${row.taxAmount.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.isAmbiguous && (
                      <button onClick={() => setSelectedAmbiguous(row)} className="text-xs px-2 py-1 rounded bg-rzp-blue/10 text-rzp-blue hover:bg-rzp-blue/20">
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ambiguous Resolution Modal */}
      {selectedAmbiguous && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAmbiguous(null)}>
          <div className="card p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-navy mb-2">Resolve Ambiguous Classification</h3>
            <p className="text-sm text-gray-500 mb-4">
              Invoice <span className="font-mono font-semibold">{selectedAmbiguous.invoiceNo}</span> — ₹{selectedAmbiguous.amount.toLocaleString('en-IN')}
            </p>
            <p className="text-sm font-medium mb-3">Candidate Rules:</p>
            <div className="space-y-2">
              {(selectedAmbiguous.candidateRules || []).map((rule) => (
                <button
                  key={rule.ruleId}
                  onClick={() => handleOverride(selectedAmbiguous.ledgerId, rule.ruleId)}
                  className="w-full p-3 rounded-lg border border-gray-200 hover:border-rzp-blue hover:bg-rzp-blue/5 transition-all text-left"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm text-rzp-blue font-semibold">{rule.ruleId}</span>
                    <span className="badge badge-info">GST {rule.gstRate}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setSelectedAmbiguous(null)} className="btn-outline text-sm w-full mt-4">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
