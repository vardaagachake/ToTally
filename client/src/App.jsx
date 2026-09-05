import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Reconciliation from './pages/Reconciliation';
import TaxMatcher from './pages/TaxMatcher';
import Forecast from './pages/Forecast';
import FXTracker from './pages/FXTracker';
import Vendors from './pages/Vendors';
import AskAI from './pages/AskAI';
import ClosingReport from './pages/ClosingReport';
import ActionsLog from './pages/ActionsLog';

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-8 max-w-[1440px] mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/tax" element={<TaxMatcher />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/fx" element={<FXTracker />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/ask" element={<AskAI />} />
            <Route path="/report" element={<ClosingReport />} />
            <Route path="/actions" element={<ActionsLog />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
