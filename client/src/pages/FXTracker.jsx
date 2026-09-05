import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Legend } from 'recharts';
import { getFXRates, checkFXDrift } from '../api';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function FXTracker() {
  const [ratesData, setRatesData] = useState(null);
  const [allDriftResults, setAllDriftResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  useEffect(() => { fetchData(selectedCurrency); }, [selectedCurrency]);

  async function fetchData(currency) {
    setLoading(true);
    try {
      const [ratesRes, driftRes] = await Promise.all([getFXRates(currency, 'INR'), checkFXDrift()]);
      setRatesData(ratesRes.data);
      setAllDriftResults(driftRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const driftResults = allDriftResults.filter(r => r.foreignCurrency === selectedCurrency);

  const chartData = (ratesData?.rates || []).map((r) => ({
    date: new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    rate: r.rate,
    fullDate: r.date,
  }));

  const markers = (ratesData?.markers || []).filter(m => m.date);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="page-title">FX Tracker</h1>
          <p className="text-gray-500 mt-1">Exchange rate movement and FX-driven discrepancy analysis</p>
        </div>
        <select 
          value={selectedCurrency} 
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm font-medium shadow-sm"
        >
          {CURRENCIES.map(c => <option key={c} value={c}>{c} → INR</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="card p-5">
          <p className="stat-label">{selectedCurrency} Transactions</p>
          <p className="stat-value text-navy">{driftResults.length}</p>
        </div>
        <div className="card p-5">
          <p className="stat-label">Explained by FX Drift</p>
          <p className="stat-value text-success">{driftResults.filter(r => r.verdict === 'Explained by FX Drift').length}</p>
        </div>
        <div className="card p-5">
          <p className="stat-label">Real Discrepancies</p>
          <p className="stat-value text-error">{driftResults.filter(r => r.verdict === 'Real Discrepancy').length}</p>
        </div>
      </div>

      {/* FX Rate Chart */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">{selectedCurrency} → INR Exchange Rate</h3>
          <span className="text-xs text-gray-400">🔗 Synthetic FX Data</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-rzp-blue border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" interval={Math.floor(chartData.length / 8)} fontSize={11} />
              <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={(v) => `₹${v}`} fontSize={11} />
              <Tooltip formatter={(v) => [`₹${v}`, 'Rate']} />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#3395FF" strokeWidth={2} dot={false} name={`${selectedCurrency}/INR Rate`} />
              {markers.map((m, i) => {
                const dateStr = new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                const matchIdx = chartData.findIndex(c => c.date === dateStr);
                if (matchIdx < 0) return null;
                return (
                  <ReferenceDot
                    key={i}
                    x={dateStr}
                    y={chartData[matchIdx]?.rate}
                    r={6}
                    fill={m.verdict === 'Explained by FX Drift' ? '#00C566' : '#FF5B5B'}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-6 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span>Explained by FX Drift</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error"></div>
            <span>Real Discrepancy</span>
          </div>
        </div>
      </div>

      {/* Drift Analysis Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-navy">FX Drift Analysis ({selectedCurrency})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Bank Ref</th>
                <th className="px-4 py-3 text-left">Foreign Amount</th>
                <th className="px-4 py-3 text-left">Expected INR</th>
                <th className="px-4 py-3 text-left">Actual INR</th>
                <th className="px-4 py-3 text-left">Rate (Bank)</th>
                <th className="px-4 py-3 text-left">Rate (Ledger)</th>
                <th className="px-4 py-3 text-left">Drift %</th>
                <th className="px-4 py-3 text-left">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {driftResults.map((row, i) => (
                <tr key={i} className="table-row">
                  <td className="px-4 py-3 font-mono text-xs">{row.bankRef}</td>
                  <td className="px-4 py-3">{row.foreignCurrency} {row.foreignAmount?.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">₹{row.expectedAmount_bankDate?.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 font-semibold">₹{row.actualAmount?.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">{row.rateOnBankDate}</td>
                  <td className="px-4 py-3">{row.rateOnLedgerDate}</td>
                  <td className="px-4 py-3">{row.rateDrift > 0 ? '+' : ''}{row.rateDrift?.toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${row.verdict === 'Explained by FX Drift' ? 'badge-success' : 'badge-error'}`}>
                      {row.verdict}
                    </span>
                  </td>
                </tr>
              ))}
              {driftResults.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No {selectedCurrency} FX transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
