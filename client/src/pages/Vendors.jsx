import { useState, useEffect } from 'react';
import { getVendors, getVendorAnomalies, getOverduePayments, sendReminder, previewReminder, dismissReminder } from '../api';
import { QRCodeSVG } from 'qrcode.react';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [sentResult, setSentResult] = useState(null);
  const [tab, setTab] = useState('anomalies');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [vRes, aRes, oRes] = await Promise.all([getVendors(), getVendorAnomalies(), getOverduePayments()]);
      setVendors(vRes.data);
      setAnomalies(aRes.data);
      setOverdue(oRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview(item) {
    setSelectedReminder(item);
    setSentResult(null);
    try {
      const res = await previewReminder({
        vendorName: item.vendor,
        amount: item.amount,
        invoiceNo: item.invoiceNo,
        contactEmail: item.contactEmail,
      });
      setPreview(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSend() {
    if (!selectedReminder) return;
    setSending(true);
    try {
      const res = await sendReminder({
        vendorName: selectedReminder.vendor,
        contactEmail: selectedReminder.contactEmail,
        amount: selectedReminder.amount,
        invoiceNo: selectedReminder.invoiceNo,
      });
      setSentResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function handleDismiss(invoiceNo) {
    await dismissReminder(invoiceNo);
    setOverdue(overdue.filter(o => o.invoiceNo !== invoiceNo));
    setSelectedReminder(null);
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Vendors</h1>
        <p className="text-gray-500 mt-1">Anomaly detection and payment reminders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'anomalies', label: `Anomalies (${anomalies.length})` },
          { key: 'overdue', label: `Overdue (${overdue.length})` },
          { key: 'all', label: `All Vendors (${vendors.length})` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Anomaly Cards */}
      {tab === 'anomalies' && (
        <div className="space-y-4">
          {anomalies.length === 0 && <p className="text-gray-400 text-center py-8">No anomalies detected. Run reconciliation first.</p>}
          {anomalies.map((anomaly, i) => (
            <div key={i} className={`card p-5 border-l-4 ${anomaly.severity === 'high' ? 'border-error' : 'border-warning'} animate-slide-in`} style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${anomaly.severity === 'high' ? 'badge-error' : 'badge-warning'}`}>
                      {anomaly.severity === 'high' ? '🔴 High' : '🟡 Medium'}
                    </span>
                    <span className="badge badge-neutral">{anomaly.type === 'amount_spike' ? 'Amount Spike' : 'Frequency Spike'}</span>
                  </div>
                  <h3 className="font-semibold text-navy">{anomaly.vendor}</h3>
                  <p className="text-sm text-gray-600 mt-1">{anomaly.message}</p>
                  {anomaly.invoiceNo && (
                    <p className="text-xs text-gray-400 mt-1">Invoice: <span className="font-mono">{anomaly.invoiceNo}</span></p>
                  )}
                </div>
                <div className="text-right">
                  {anomaly.currentAmount && (
                    <p className="text-xl font-bold text-navy">₹{anomaly.currentAmount.toLocaleString('en-IN')}</p>
                  )}
                  {anomaly.historicalAvg && (
                    <p className="text-xs text-gray-400">avg: ₹{anomaly.historicalAvg.toLocaleString('en-IN')}</p>
                  )}
                  {anomaly.ratio && (
                    <p className="text-sm font-semibold text-error mt-1">{anomaly.ratio}x average</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overdue Payments */}
      {tab === 'overdue' && (
        <div className="space-y-4">
          {overdue.length === 0 && <p className="text-gray-400 text-center py-8">No overdue payments found.</p>}
          {overdue.map((item, i) => (
            <div key={i} className="card p-5 border-l-4 border-error animate-slide-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-navy">{item.vendor}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Invoice: <span className="font-mono">{item.invoiceNo}</span> • Terms: {item.paymentTerms}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-navy">₹{item.amount.toLocaleString('en-IN')}</p>
                  <p className="text-sm font-semibold text-error">{item.daysOverdue} days overdue</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handlePreview(item)} className="btn-primary text-xs px-3 py-1.5">
                      📧 Send Reminder
                    </button>
                    <button onClick={() => handleDismiss(item.invoiceNo)} className="btn-outline text-xs px-3 py-1.5">
                      Not Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Vendors Table */}
      {tab === 'all' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Payment Terms</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Invoices</th>
                <th className="px-4 py-3 text-left">Total Spend</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v, i) => (
                <tr key={i} className="table-row">
                  <td className="px-4 py-3 font-semibold">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500">{v.category}</td>
                  <td className="px-4 py-3"><span className="badge badge-info">{v.paymentTerms}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{v.contactEmail}</td>
                  <td className="px-4 py-3">{v.invoiceCount}</td>
                  <td className="px-4 py-3 font-semibold">₹{(v.totalSpend || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reminder Preview Modal */}
      {selectedReminder && preview && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedReminder(null); setPreview(null); setSentResult(null); }}>
          <div className="card p-6 max-w-2xl w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {sentResult ? (
              <div>
                <div className="text-center mb-4">
                  <span className="text-4xl">✅</span>
                  <h3 className="font-semibold text-navy mt-2">{sentResult.message}</h3>
                </div>
                {sentResult.paymentLink && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 text-center">
                    <p className="text-xs font-medium text-gray-500 mb-1">Payment Link:</p>
                    <a href={sentResult.paymentLink.short_url || '#'} target="_blank" rel="noopener noreferrer" className="text-rzp-blue text-sm font-mono break-all">
                      {sentResult.paymentLink.short_url || sentResult.paymentLink.id}
                    </a>
                    {sentResult.paymentLink.isMock && (
                      <span className="badge badge-warning ml-2">Mock</span>
                    )}
                  </div>
                )}
                <button onClick={() => { setSelectedReminder(null); setPreview(null); setSentResult(null); fetchData(); }} className="btn-primary text-sm w-full mt-4">
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <h3 className="font-semibold text-navy mb-4 flex items-center gap-2">
                    <span>📧</span> Edit Reminder Email
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3 mb-4">
                    <p className="text-xs"><span className="font-medium text-gray-500">To:</span> {preview.to}</p>
                    <p className="text-xs"><span className="font-medium text-gray-500">Subject:</span> {preview.subject}</p>
                    <textarea 
                      value={preview.body}
                      onChange={(e) => setPreview({ ...preview, body: e.target.value })}
                      className="w-full h-40 p-2 text-sm border border-gray-200 rounded focus:border-rzp-blue outline-none resize-none"
                    />
                    {preview.paymentLinkUrl && (
                      <p className="text-xs text-rzp-blue font-medium">🔗 {preview.paymentLinkUrl}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleSend} disabled={sending} className="btn-primary text-sm flex-1">
                      {sending ? '⏳ Sending...' : '✅ Approve & Send'}
                    </button>
                    <button onClick={() => { setSelectedReminder(null); setPreview(null); }} className="btn-outline text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="w-full md:w-48 shrink-0 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                  <p className="text-xs font-semibold text-gray-500 mb-4 text-center">Scan to Pay (Razorpay)</p>
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 mb-2">
                    {preview.paymentLinkUrl && preview.paymentLinkUrl !== '#' ? (
                      <QRCodeSVG value={preview.paymentLinkUrl} size={140} level="M" />
                    ) : (
                      <div className="w-[140px] h-[140px] bg-gray-50 flex items-center justify-center text-xs text-gray-400 text-center">
                        Generating...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {preview.paymentLink?.isMock ? (
                      <span className="badge badge-warning text-[10px]">Mock API</span>
                    ) : (
                      <span className="badge badge-success text-[10px]">🔗 Live API</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
