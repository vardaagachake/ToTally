import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getDashboard, runReconciliation, seedData } from '../api';

const CONFIDENCE_COLORS = {
  'Exact Match': '#00C566',
  'Fuzzy Match': '#3395FF',
  'Probable Duplicate': '#FFAA00',
  'Currency Mismatch': '#FF5B5B',
  'Unmatched': '#94a3b8',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunRecon() {
    setRunning(true);
    try {
      await runReconciliation();
      await fetchData();
    } catch (err) {
      console.error('Reconciliation error:', err);
    } finally {
      setRunning(false);
    }
  }

  async function handleSeed() {
    setRunning(true);
    try {
      await seedData();
      await runReconciliation();
      await fetchData();
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <LoadingState />;

  const donutData = data?.byConfidence
    ? Object.entries(data.byConfidence).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-gray-500 mt-1">Finance reconciliation at a glance</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSeed} disabled={running} className="btn-outline text-sm">
            {running ? '⏳ Working...' : '📦 Seed & Run'}
          </button>
          <button onClick={handleRunRecon} disabled={running} className="btn-primary text-sm">
            {running ? '⏳ Running...' : '🔄 Run Reconciliation'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="Match Rate"
          value={`${data?.matchRate || 0}%`}
          sub={`${data?.matched || 0}/${data?.totalTransactions || 0} matched`}
          color="text-success"
          icon="✅"
          link="/reconciliation"
        />
        <StatCard
          label="Exceptions"
          value={data?.exceptionsTotal || 0}
          sub={`₹${(data?.exceptionsAmount || 0).toLocaleString('en-IN')} total`}
          color="text-warning"
          icon="⚠️"
          link="/reconciliation"
        />
        <StatCard
          label="Vendor Anomalies"
          value={data?.vendorAnomaliesCount || 0}
          sub="flagged this period"
          color="text-error"
          icon="🔍"
          link="/vendors"
        />
        <StatCard
          label="30-Day Forecast"
          value={`₹${((data?.forecastSnapshot?.day30 || 0) / 1000).toFixed(0)}K`}
          sub={`Risk: ₹${((data?.forecastSnapshot?.unresolvedRisk || 0) / 1000).toFixed(0)}K`}
          color="text-rzp-blue"
          icon="📈"
          link="/forecast"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Rate Donut */}
        <div className="card p-6">
          <h3 className="section-title">Match Rate Breakdown</h3>
          <div className="flex items-center gap-8">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={CONFIDENCE_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} records`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {donutData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CONFIDENCE_COLORS[entry.name] }}></div>
                    <span className="text-gray-600">{entry.name}</span>
                  </div>
                  <span className="font-semibold">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="section-title">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'View Exceptions', link: '/reconciliation', icon: '⚠️', desc: 'Review unmatched items' },
              { label: 'FX Analysis', link: '/fx', icon: '💱', desc: 'Check currency drift' },
              { label: 'Tax Classification', link: '/tax', icon: '🧾', desc: 'GST rule matching' },
              { label: 'Ask AI', link: '/ask', icon: '🤖', desc: 'Query in any language' },
              { label: 'Vendor Alerts', link: '/vendors', icon: '🏢', desc: 'Overdue & anomalies' },
              { label: 'Generate Report', link: '/report', icon: '📋', desc: 'Closing memo' },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.link}
                className="p-4 rounded-lg border border-gray-200 hover:border-rzp-blue hover:shadow-md transition-all group"
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="font-medium text-sm group-hover:text-rzp-blue transition-colors">{action.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{action.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon, link }) {
  return (
    <Link to={link} className="card p-5 hover:shadow-card-hover transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className={`stat-value ${color} mt-1`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <span className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>
      </div>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-rzp-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 mt-4 text-sm">Loading dashboard...</p>
      </div>
    </div>
  );
}
