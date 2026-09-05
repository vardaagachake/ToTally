import { useState, useEffect } from 'react';
import { getActions } from '../api';

const ACTION_ICONS = {
  reconciliation_run: '🔄',
  match_confirmed: '✅',
  match_rejected: '❌',
  vendor_reminder_sent: '📧',
  tax_override: '🧾',
  report_generated: '📋',
};

const ACTION_COLORS = {
  reconciliation_run: 'bg-rzp-blue/10 text-rzp-blue',
  match_confirmed: 'bg-success/10 text-success',
  match_rejected: 'bg-error/10 text-error',
  vendor_reminder_sent: 'bg-purple-100 text-purple-700',
  tax_override: 'bg-amber-100 text-amber-700',
};

export default function ActionsLog() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchActions(); }, [filter]);

  async function fetchActions() {
    setLoading(true);
    try {
      const res = await getActions(filter ? { entityType: filter } : {});
      setActions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const entityTypes = [...new Set(actions.map(a => a.entityType))];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Actions Log</h1>
        <p className="text-gray-500 mt-1">Complete audit trail of every agent action</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!filter ? 'bg-navy text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
          All
        </button>
        {entityTypes.map((type) => (
          <button key={type} onClick={() => setFilter(type)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === type ? 'bg-navy text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {type}
          </button>
        ))}
      </div>

      {/* Actions Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Entity ID</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action, i) => (
                <tr key={i} className="table-row animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(action.timestamp || action.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{ACTION_ICONS[action.action] || '📌'}</span>
                      <span className="font-medium">{action.action.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ACTION_COLORS[action.action] || 'badge-neutral'}`}>
                      {action.entityType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {action.entityId ? action.entityId.substring(0, 12) + '...' : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {action.details ? (
                      <span title={JSON.stringify(action.details)}>
                        {action.details.vendorName && `Vendor: ${action.details.vendorName}`}
                        {action.details.amount && ` • ₹${action.details.amount.toLocaleString('en-IN')}`}
                        {action.details.action && ` • ${action.details.action}`}
                        {action.details.ruleId && ` • Rule: ${action.details.ruleId}`}
                        {action.details.totalResults != null && `${action.details.totalResults} results`}
                        {action.details.emailSent != null && (action.details.emailSent ? ' • Email sent' : ' • Email logged (mock)')}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {actions.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    No actions recorded yet. Start by running reconciliation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-rzp-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}
