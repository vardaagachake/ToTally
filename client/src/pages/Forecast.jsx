import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Legend } from 'recharts';
import { getForecast, applyScenario } from '../api';

const PRESET_SCENARIOS = [
  { key: 'late_payment', label: '⏰ Customer Pays 30 Days Late', icon: '⏰', params: { delayDays: 30 } },
  { key: 'early_vendor_payment', label: '⚡ Vendor Payment Pulled Forward', icon: '⚡', params: { forwardDays: 14 } },
  { key: 'one_time_expense', label: '💸 One-Time Expense', icon: '💸', params: { day: 15, amount: 100000 } },
];

export default function Forecast() {
  const [forecast, setForecast] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [activeScenario, setActiveScenario] = useState(null);
  const [customScenario, setCustomScenario] = useState({ amount: 50000, delayDays: 15, direction: 'out' });
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => { fetchForecast(); }, [days]);

  async function fetchForecast() {
    setLoading(true);
    try {
      const res = await getForecast(days);
      setForecast(res.data);
      setScenario(null);
      setActiveScenario(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScenario(key, params) {
    try {
      const res = await applyScenario(key, { ...params, days });
      setScenario(res.data);
      setActiveScenario(key);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCustomScenario() {
    handleScenario('custom', customScenario);
    setShowCustom(false);
  }

  // Merge baseline and scenario data for the chart
  const chartData = (forecast?.baseline || []).map((point, i) => ({
    ...point,
    scenarioCash: scenario?.scenario?.[i]?.scenarioCash || scenario?.scenario?.[i]?.cash,
  }));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Cash Forecast</h1>
          <p className="text-gray-500 mt-1">Forward-looking cash position with uncertainty band</p>
        </div>
        <div className="flex gap-2">
          {[30, 60, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${days === d ? 'bg-navy text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="card p-5">
          <p className="stat-label">Current Cash</p>
          <p className="stat-value text-success">₹{((forecast?.currentCash || 0) / 1000).toFixed(0)}K</p>
        </div>
        <div className="card p-5">
          <p className="stat-label">Avg Daily In</p>
          <p className="stat-value text-rzp-blue">₹{((forecast?.avgDailyReceivable || 0) / 1000).toFixed(1)}K</p>
        </div>
        <div className="card p-5">
          <p className="stat-label">Avg Daily Out</p>
          <p className="stat-value text-warning">₹{((forecast?.avgDailyPayable || 0) / 1000).toFixed(1)}K</p>
        </div>
        <div className="card p-5 border-l-4 border-warning">
          <p className="stat-label">Uncertainty Band</p>
          <p className="stat-value text-error">₹{((forecast?.unresolvedExceptionAmount || 0) / 1000).toFixed(0)}K</p>
          <p className="text-xs text-gray-400 mt-1">From unresolved exceptions</p>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Cash Position Forecast</h3>
          {forecast?.unresolvedExceptionAmount > 0 && (
            <span className="badge badge-warning">
              Band widened by ₹{(forecast.unresolvedExceptionAmount).toLocaleString('en-IN')} in unresolved exceptions
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-rzp-blue border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} interval={Math.floor(days / 8)} fontSize={11} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} fontSize={11} />
              <Tooltip formatter={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`} labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })} />
              <Legend />
              {/* Uncertainty band */}
              <Area type="monotone" dataKey="upper" stroke="none" fill="#3395FF" fillOpacity={0.1} name="Upper Band" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#3395FF" fillOpacity={0.1} name="Lower Band" />
              {/* Baseline */}
              <Line type="monotone" dataKey="cash" stroke="#0C2451" strokeWidth={2} dot={false} name="Baseline" />
              {/* Scenario overlay */}
              {scenario && (
                <Line type="monotone" dataKey="scenarioCash" stroke="#FF5B5B" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Scenario" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Scenario Controls */}
      <div className="card p-6">
        <h3 className="section-title">What-If Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {PRESET_SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => handleScenario(s.key, s.params)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${activeScenario === s.key ? 'border-rzp-blue bg-rzp-blue/5' : 'border-gray-200 hover:border-rzp-blue/50'}`}
            >
              <span className="text-xl">{s.icon}</span>
              <p className="font-medium text-sm mt-2">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Custom scenario */}
        <button onClick={() => setShowCustom(!showCustom)} className="btn-outline text-sm">
          🎛️ Custom Scenario
        </button>

        {showCustom && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border animate-fade-in">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Amount (₹)</label>
                <input type="number" value={customScenario.amount} onChange={(e) => setCustomScenario({ ...customScenario, amount: Number(e.target.value) })} className="input-field" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Delay Days</label>
                <input type="number" value={customScenario.delayDays} onChange={(e) => setCustomScenario({ ...customScenario, delayDays: Number(e.target.value) })} className="input-field" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Direction</label>
                <select value={customScenario.direction} onChange={(e) => setCustomScenario({ ...customScenario, direction: e.target.value })} className="input-field">
                  <option value="out">Cash Out</option>
                  <option value="in">Cash In</option>
                </select>
              </div>
            </div>
            <button onClick={handleCustomScenario} className="btn-primary text-sm mt-4">Apply Scenario</button>
          </div>
        )}

        {activeScenario && (
          <button onClick={() => { setScenario(null); setActiveScenario(null); }} className="btn-outline text-sm ml-3 mt-3">
            Clear Scenario
          </button>
        )}
      </div>
    </div>
  );
}
