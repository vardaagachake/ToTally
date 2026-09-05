import { useState } from 'react';
import { generateReport, downloadPDF } from '../api';

export default function ClosingReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('en');

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await generateReport(lang);
      setReport(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    try {
      const res = await downloadPDF();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ToTally_Closing_Report.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  }

  function handleExportEmail() {
    if (!report?.narrative) return;
    const subject = encodeURIComponent(`ToTally Closing Report — ${new Date().toLocaleDateString('en-IN')}`);
    const body = encodeURIComponent(report.narrative.substring(0, 2000));
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Closing Report</h1>
          <p className="text-gray-500 mt-1">Auto-generated end-of-period finance memo</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2">
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 Hindi</option>
            <option value="hinglish">🇮🇳 Hinglish</option>
          </select>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary text-sm">
            {loading ? '⏳ Generating...' : '📋 Generate Report'}
          </button>
        </div>
      </div>

      {!report && !loading && (
        <div className="card p-12 text-center">
          <span className="text-5xl">📋</span>
          <h3 className="text-lg font-semibold text-navy mt-4">Generate Your Closing Report</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Click "Generate Report" to create a comprehensive end-of-period finance memo with match rates, exceptions, vendor anomalies, tax summary, and cash forecast.
          </p>
        </div>
      )}

      {loading && (
        <div className="card p-12 text-center">
          <div className="w-10 h-10 border-3 border-rzp-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">AI is generating your report...</p>
        </div>
      )}

      {report && (
        <div>
          {/* Export Buttons */}
          <div className="flex gap-3 mb-6">
            <button onClick={handleExportPDF} className="btn-outline text-sm">📄 Export as PDF</button>
            <button onClick={handleExportEmail} className="btn-outline text-sm">📧 Export as Email Draft</button>
          </div>

          {/* Report Document */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto overflow-hidden">
            {/* Header */}
            <div className="bg-navy p-8">
              <h2 className="text-white text-2xl font-bold">ToTally — Closing Report</h2>
              <p className="text-white/60 mt-2 text-sm">
                Generated: {new Date(report.generatedAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            </div>

            <div className="p-8 space-y-8">
              {/* Reconciliation Summary */}
              <section>
                <h3 className="text-lg font-bold text-navy border-b border-gray-200 pb-2 mb-4">Reconciliation Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-success">{report.matchRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">Match Rate</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-navy">{report.matched}/{report.totalTransactions}</p>
                    <p className="text-xs text-gray-500 mt-1">Matched/Total</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-warning">{report.exceptions.total}</p>
                    <p className="text-xs text-gray-500 mt-1">Exceptions</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                  {Object.entries(report.byConfidence).map(([label, count]) => (
                    <div key={label} className="text-xs">
                      <p className="font-semibold">{count}</p>
                      <p className="text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Exceptions */}
              <section>
                <h3 className="text-lg font-bold text-navy border-b border-gray-200 pb-2 mb-4">Exception Breakdown</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Total exception amount: <span className="font-bold text-navy">₹{(report.exceptions.totalAmount || 0).toLocaleString('en-IN')}</span>
                </p>
                <div className="space-y-2">
                  {Object.entries(report.exceptions.byCategory || {}).map(([cat, data]) => (
                    <div key={cat} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-warning"></div>
                        <span className="text-sm">{cat}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{data.count} items</span>
                        <span className="text-xs text-gray-400 ml-2">₹{(data.totalAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Vendor Anomalies */}
              {report.vendorAnomalies?.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-navy border-b border-gray-200 pb-2 mb-4">Top Vendor Anomalies</h3>
                  {report.vendorAnomalies.map((a, i) => (
                    <div key={i} className="py-2 border-b border-gray-100">
                      <p className="text-sm">
                        <span className="font-semibold">{a.vendor}</span>: {a.message}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              {/* Tax Summary */}
              <section>
                <h3 className="text-lg font-bold text-navy border-b border-gray-200 pb-2 mb-4">Tax Summary</h3>
                <p className="text-sm mb-3">
                  Total Tax Liability: <span className="font-bold text-navy">₹{(report.taxSummary.totalLiability || 0).toLocaleString('en-IN')}</span>
                  {report.taxSummary.needsReview > 0 && (
                    <span className="badge badge-warning ml-2">{report.taxSummary.needsReview} needs review</span>
                  )}
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2">GST Slab</th>
                      <th className="pb-2">Transactions</th>
                      <th className="pb-2">Base Amount</th>
                      <th className="pb-2">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.taxSummary.bySlab || []).map((s, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 font-semibold">{s.rate}%</td>
                        <td className="py-2">{s.count}</td>
                        <td className="py-2">₹{(s.baseAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 font-semibold">₹{(s.taxAmount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Forecast */}
              <section>
                <h3 className="text-lg font-bold text-navy border-b border-gray-200 pb-2 mb-4">30-Day Cash Forecast</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xl font-bold text-success">₹{((report.forecast.currentCash || 0) / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">Current Cash</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xl font-bold text-rzp-blue">₹{((report.forecast.day30Cash || 0) / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">Projected (30 days)</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xl font-bold text-error">₹{((report.forecast.unresolvedRisk || 0) / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">Unresolved Risk</p>
                  </div>
                </div>
              </section>

              {/* AI Narrative */}
              {report.narrative && (
                <section>
                  <h3 className="text-lg font-bold text-navy border-b border-gray-200 pb-2 mb-4">Detailed Analysis</h3>
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {report.narrative}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
