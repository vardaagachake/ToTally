import { useState, useEffect } from 'react';
import { getVendors, getVendorAnomalies, getOverduePayments } from '../api';
import { QRCodeSVG } from 'qrcode.react';
import Toast from '../components/common/Toast';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [tab, setTab] = useState('overdue');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [vRes, aRes, oRes] = await Promise.all([
        getVendors(),
        getVendorAnomalies(),
        getOverduePayments(),
      ]);
      setVendors(vRes.data || []);
      setAnomalies(aRes.data || []);
      setOverdue(oRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenReminder(item) {
    const vendorName = item.vendor || item.name || 'Vendor';
    const invoiceNo = item.invoiceNo || 'INV-2026-089';
    const amount = item.amount || 0;
    const paymentTerms = item.paymentTerms || 'Net 30';
    const daysOverdue = item.daysOverdue || 14;
    const contactEmail = item.contactEmail || item.email || 'billing@vendor.com';

    // Static formatted Razorpay link for prototype
    const staticLink = `https://rzp.io/i/ToTally_${invoiceNo.replace(/[^a-zA-Z0-9]/g, '')}`;

    setSelectedReminder({
      vendorName,
      invoiceNo,
      amount,
      paymentTerms,
      daysOverdue,
      contactEmail,
      paymentLink: staticLink,
      subject: `Payment Reminder: ${invoiceNo} — ₹${amount.toLocaleString('en-IN')}`,
      message: `Dear ${vendorName} Team,\n\nWe'd like to follow up on invoice ${invoiceNo} for ₹${amount.toLocaleString('en-IN')}. This payment is now ${daysOverdue} days overdue per our agreed terms (${paymentTerms}).\n\nPlease process the payment at your earliest convenience using the secure Razorpay payment link or scannable UPI QR code below.\n\nThank you for your prompt attention.\n\nBest regards,\nToTally Finance Operations`,
    });
  }

  function handleSendReminder() {
    if (!selectedReminder) return;
    const invoiceNo = selectedReminder.invoiceNo;
    setSelectedReminder(null);
    setToastMessage('Reminder sent ✅');

    // Visually update the overdue list
    setOverdue((prev) => prev.filter((o) => o.invoiceNo !== invoiceNo));
  }

  function handleDismiss(invoiceNo) {
    setOverdue((prev) => prev.filter((o) => o.invoiceNo !== invoiceNo));
    setToastMessage(`Invoice ${invoiceNo} reminder dismissed`);
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="page-title">Vendors</h1>
        <p className="text-gray-500 mt-1">Anomaly detection and automated payment reminders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'overdue', label: `Overdue (${overdue.length})` },
          { key: 'anomalies', label: `Anomalies (${anomalies.length})` },
          { key: 'all', label: `All Vendors (${vendors.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white shadow-sm text-navy' : 'text-gray-500 hover:text-navy'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-rzp-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Overdue Payments Tab */}
          {tab === 'overdue' && (
            <div className="space-y-4">
              {overdue.length === 0 && (
                <div className="card p-12 text-center text-gray-400">
                  <span className="text-3xl mb-2 block">🎉</span>
                  <p className="font-medium text-navy">No overdue payments pending</p>
                  <p className="text-xs text-gray-400 mt-1">All vendor invoices are settled within agreed terms.</p>
                </div>
              )}
              {overdue.map((item, i) => (
                <div
                  key={item.invoiceNo || i}
                  className="card p-5 border-l-4 border-error animate-slide-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-navy text-base">{item.vendor}</h3>
                        <span className="badge badge-error">{item.daysOverdue} days overdue</span>
                      </div>
                      <p className="text-sm text-gray-600">{item.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Invoice: <span className="font-mono font-medium">{item.invoiceNo}</span> • Agreed Terms:{' '}
                        <span className="font-medium text-gray-600">{item.paymentTerms}</span> • Contact:{' '}
                        <span className="font-mono text-gray-500">{item.contactEmail}</span>
                      </p>
                    </div>
                    <div className="text-right flex flex-col md:items-end justify-between">
                      <p className="text-2xl font-bold text-navy">
                        ₹{(item.amount || 0).toLocaleString('en-IN')}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleOpenReminder(item)}
                          className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                        >
                          <span>📧</span> Send Reminder
                        </button>
                        <button
                          onClick={() => handleDismiss(item.invoiceNo)}
                          className="btn-outline text-xs px-3 py-1.5"
                        >
                          Not Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Anomaly Cards Tab */}
          {tab === 'anomalies' && (
            <div className="space-y-4">
              {anomalies.length === 0 && (
                <p className="text-gray-400 text-center py-8">No anomalies detected. Run reconciliation first.</p>
              )}
              {anomalies.map((anomaly, i) => (
                <div
                  key={i}
                  className={`card p-5 border-l-4 ${
                    anomaly.severity === 'high' ? 'border-error' : 'border-warning'
                  } animate-slide-in`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`badge ${anomaly.severity === 'high' ? 'badge-error' : 'badge-warning'}`}
                        >
                          {anomaly.severity === 'high' ? '🔴 High' : '🟡 Medium'}
                        </span>
                        <span className="badge badge-neutral">
                          {anomaly.type === 'amount_spike' ? 'Amount Spike' : 'Frequency Spike'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-navy">{anomaly.vendor}</h3>
                      <p className="text-sm text-gray-600 mt-1">{anomaly.message}</p>
                      {anomaly.invoiceNo && (
                        <p className="text-xs text-gray-400 mt-1">
                          Invoice: <span className="font-mono">{anomaly.invoiceNo}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {anomaly.currentAmount && (
                        <p className="text-xl font-bold text-navy">
                          ₹{anomaly.currentAmount.toLocaleString('en-IN')}
                        </p>
                      )}
                      {anomaly.historicalAvg && (
                        <p className="text-xs text-gray-400">
                          avg: ₹{anomaly.historicalAvg.toLocaleString('en-IN')}
                        </p>
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

          {/* All Vendors Table Tab */}
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
                      <td className="px-4 py-3">
                        <span className="badge badge-info">{v.paymentTerms}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{v.contactEmail}</td>
                      <td className="px-4 py-3">{v.invoiceCount}</td>
                      <td className="px-4 py-3 font-semibold">
                        ₹{(v.totalSpend || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Visual / Prototype Reminder Modal */}
      {selectedReminder && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedReminder(null)}
        >
          <div
            className="card p-6 md:p-7 max-w-2xl w-full animate-fade-in shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-rzp-blue/10 flex items-center justify-center text-rzp-blue text-lg">
                  📧
                </span>
                <div>
                  <h3 className="font-bold text-navy text-base">Send Payment Reminder</h3>
                  <p className="text-xs text-gray-500">Autonomous payment notice with Razorpay instant link</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReminder(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Bill Details Summary Card */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 font-medium block">Vendor</span>
                  <span className="font-semibold text-navy text-sm truncate block">
                    {selectedReminder.vendorName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Invoice No</span>
                  <span className="font-mono font-semibold text-gray-800 text-sm block">
                    {selectedReminder.invoiceNo}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Payment Terms</span>
                  <span className="font-medium text-gray-700 block mt-0.5">
                    {selectedReminder.paymentTerms}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Status</span>
                  <span className="badge badge-error mt-0.5">
                    {selectedReminder.daysOverdue} days overdue
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Total Outstanding Balance</span>
                <span className="text-lg font-bold text-navy">
                  ₹{selectedReminder.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Two Column Content: Message & Payment Details */}
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Message Box */}
              <div className="flex-1 space-y-3">
                <div className="text-xs space-y-1">
                  <p className="text-gray-500">
                    <strong className="text-gray-700">To:</strong> {selectedReminder.contactEmail}
                  </p>
                  <p className="text-gray-500">
                    <strong className="text-gray-700">Subject:</strong> {selectedReminder.subject}
                  </p>
                </div>

                <label className="block text-xs font-semibold text-gray-600">Reminder Message Body</label>
                <textarea
                  value={selectedReminder.message}
                  onChange={(e) =>
                    setSelectedReminder({ ...selectedReminder, message: e.target.value })
                  }
                  className="w-full h-36 p-3 text-xs leading-relaxed border border-gray-200 rounded-lg focus:border-rzp-blue outline-none resize-none bg-white shadow-inner"
                />

                {/* Static-looking Payment Link Box */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Razorpay Payment Link
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 text-xs">
                    <span className="text-rzp-blue font-mono truncate flex-1 font-medium">
                      {selectedReminder.paymentLink}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedReminder.paymentLink);
                        setToastMessage('Payment link copied to clipboard');
                      }}
                      className="px-2 py-1 text-xs font-medium text-rzp-blue hover:text-white hover:bg-rzp-blue rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Code Column */}
              <div className="w-full md:w-48 shrink-0 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-5">
                <p className="text-xs font-semibold text-gray-600 mb-2">Instant UPI / QR</p>
                <div className="bg-white p-2.5 rounded-xl shadow-md border border-gray-100 flex items-center justify-center">
                  <QRCodeSVG value={selectedReminder.paymentLink} size={130} level="M" />
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="badge badge-success text-[10px] font-semibold">
                    Razorpay Verified Link
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-1.5 leading-tight">
                  Scannable via GPay, PhonePe, Paytm, and net banking
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setSelectedReminder(null)}
                className="btn-outline text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
              >
                <span>✅</span> Approve & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
