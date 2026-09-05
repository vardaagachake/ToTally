import { useState, useEffect } from 'react';
import { getReconciliationResults, overrideMatch, getExceptions, explainException, getSelfAudit, runReconciliation } from '../api';

const CONFIDENCE_BADGES = {
  'Exact Match': 'badge-success',
  'Fuzzy Match': 'badge-info',
  'Probable Duplicate': 'badge-warning',
  'Currency Mismatch': 'badge-error',
  'Unmatched': 'badge-neutral',
};

export default function Reconciliation() {
  const [results, setResults] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [audit, setAudit] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [tab, setTab] = useState('all'); // all, exceptions, audit

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [resResults, resExceptions, resAudit] = await Promise.all([
        getReconciliationResults(filter ? { confidence: filter } : {}),
        getExceptions({}),
        getSelfAudit(),
      ]);
      setResults(resResults.data);
      setExceptions(resExceptions.data);
      setAudit(resAudit.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride(id, action) {
    try {
      await overrideMatch(id, action);
      await fetchAll();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleExplain(id) {
    setExplaining(true);
    setExplanation(null);
    try {
      const res = await explainException(id);
      setExplanation(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  }

  const displayData = tab === 'exceptions' ? exceptions : tab === 'audit' ? (audit?.flaggedItems || []) : results;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Reconciliation</h1>
          <p className="text-gray-500 mt-1">3-way matching: Bank ↔ Ledger ↔ Razorpay Settlement</p>
        </div>
        <button onClick={() => { runReconciliation().then(fetchAll); }} className="btn-primary text-sm">
          🔄 Re-run Matching
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: `All Results (${results.length})` },
          { key: 'exceptions', label: `Exceptions (${exceptions.length})` },
          { key: 'audit', label: `Self-Audit (${audit?.summary?.totalFlagged || 0})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-navy' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Self-Audit Panel */}
      {tab === 'audit' && audit && (
        <div className="card p-5 mb-6 border-l-4 border-rzp-blue">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">🔍</span>
            <h3 className="font-semibold text-navy">Self-Audit Report</h3>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-success">{audit.summary.totalConfirmed}</span> matches confirmed,{' '}
            <span className="font-semibold text-warning">{audit.summary.totalFlagged}</span> flagged for second look
          </p>
        </div>
      )}

      {/* Filter bar */}
      {tab === 'all' && (
        <div className="flex gap-2 mb-4">
          {['', 'Exact Match', 'Fuzzy Match', 'Probable Duplicate', 'Currency Mismatch', 'Unmatched'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f || 'All'}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Bank Ref</th>
                <th className="px-4 py-3 text-left">Ledger Inv</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Confidence</th>
                <th className="px-4 py-3 text-left">Status</th>
                {tab === 'exceptions' && <th className="px-4 py-3 text-left">Category</th>}
                {tab === 'audit' && <th className="px-4 py-3 text-left">Flags</th>}
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'audit' ? displayData : displayData.filter(r => !filter || r.confidence === filter)).map((row, i) => {
                const item = tab === 'audit' ? row : row;
                const bank = tab === 'audit' ? null : row.bankStatementId;
                const ledger = tab === 'audit' ? null : row.ledgerId;
                const isException = ['Unmatched', 'Currency Mismatch', 'Probable Duplicate'].includes(item.confidence);

                return (
                  <tr
                    key={item._id || item.matchId || i}
                    className={`table-row cursor-pointer ${isException ? 'bg-warning/5' : ''}`}
                    onClick={() => setSelectedRow(item)}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {bank?.referenceNo || item.bankRef || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {ledger?.invoiceNo || item.ledgerInv || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {bank?.currency || 'INR'} {(bank?.amount || ledger?.amount || item.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {bank?.date ? new Date(bank.date).toLocaleDateString('en-IN') : ledger?.date ? new Date(ledger.date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${CONFIDENCE_BADGES[item.confidence] || 'badge-neutral'}`}>
                        {item.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${item.status === 'confirmed' ? 'text-success' : item.status === 'rejected' ? 'text-error' : 'text-gray-400'}`}>
                        {item.manualOverride ? '✋ ' : ''}{item.status || 'auto'}
                      </span>
                    </td>
                    {tab === 'exceptions' && (
                      <td className="px-4 py-3">
                        <span className="badge badge-warning">{item.exceptionCategory || 'Unknown'}</span>
                      </td>
                    )}
                    {tab === 'audit' && (
                      <td className="px-4 py-3">
                        {(item.flags || []).map((f, fi) => (
                          <span key={fi} className="badge badge-warning mr-1 mb-1">{f.flag}</span>
                        ))}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {item.status !== 'confirmed' && (
                          <button onClick={() => handleOverride(item._id || item.matchId, 'confirmed')} className="text-xs px-2 py-1 rounded bg-success/10 text-success hover:bg-success/20 transition-colors">
                            ✓
                          </button>
                        )}
                        {item.status !== 'rejected' && (
                          <button onClick={() => handleOverride(item._id || item.matchId, 'rejected')} className="text-xs px-2 py-1 rounded bg-error/10 text-error hover:bg-error/20 transition-colors">
                            ✗
                          </button>
                        )}
                        {isException && (
                          <button onClick={() => handleExplain(item._id)} className="text-xs px-2 py-1 rounded bg-rzp-blue/10 text-rzp-blue hover:bg-rzp-blue/20 transition-colors">
                            💡
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-rzp-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Explanation Modal */}
      {(explanation || explaining) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => { setExplanation(null); setExplaining(false); }}>
          <div className="card p-6 max-w-lg w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
              <span>💡</span> Exception Explanation
            </h3>
            {explaining ? (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="w-5 h-5 border-2 border-rzp-blue border-t-transparent rounded-full animate-spin"></div>
                <span>AI is analyzing...</span>
              </div>
            ) : explanation ? (
              <div>
                <div className="mb-3">
                  <span className={`badge ${CONFIDENCE_BADGES[explanation.confidence]}`}>{explanation.confidence}</span>
                  <span className="badge badge-warning ml-2">{explanation.category}</span>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border">{explanation.explanation}</p>
              </div>
            ) : null}
            <button onClick={() => { setExplanation(null); setExplaining(false); }} className="btn-outline text-sm mt-4 w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
