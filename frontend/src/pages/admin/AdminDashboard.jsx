import { useState, useEffect } from 'react';
import {
  Users, Activity, UserCheck, BedDouble, AlertTriangle, AlertCircle, Info,
  Stethoscope, FlaskConical, Pill, Receipt, HeartPulse,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [bedData, setBedData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      API.get('/admin/dashboard'),
      API.get('/admin/bed-occupancy'),
      API.get('/admin/alerts'),
    ])
      .then(([dashRes, bedRes, alertRes]) => {
        setStats(dashRes.data.data);
        setBedData(bedRes.data.data || []);
        setAlerts(alertRes.data.data || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const alertIcons = {
    critical: { icon: AlertTriangle, bg: 'bg-red-50 border-red-200 text-red-800' },
    warning: { icon: AlertCircle, bg: 'bg-amber-50 border-amber-200 text-amber-800' },
    info: { icon: Info, bg: 'bg-teal-50 border-teal-200 text-teal-800' },
  };

  const s = stats?.stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500 mt-1">Hospital management dashboard</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => {
            const cfg = alertIcons[a.type] || alertIcons.info;
            const Icon = cfg.icon;
            return (
              <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border ${cfg.bg}`}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{a.message}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Patients" value={s.total_patients ?? 0} icon={Users} color="teal" />
        <StatCard title="High Risk Patients" value={s.high_risk_patients ?? 0} icon={Activity} color="orange" />
        <StatCard title="All Staff" value={s.total_staff ?? 0} icon={UserCheck} color="green" />
        <StatCard title="Active Admissions" value={s.active_admissions ?? 0} icon={BedDouble} color="purple" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MiniStatCard title="Doctors" value={s.total_doctors ?? 0} icon={Stethoscope} color="teal" />
        <MiniStatCard title="Nurses" value={s.total_nurses ?? 0} icon={HeartPulse} color="purple" />
        <MiniStatCard title="Lab Techs" value={s.total_lab_techs ?? 0} icon={FlaskConical} color="amber" />
        <MiniStatCard title="Pharmacists" value={s.total_pharmacists ?? 0} icon={Pill} color="green" />
        <MiniStatCard title="Billers" value={s.total_billers ?? 0} icon={Receipt} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bed Occupancy (Live)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="occupied" fill="#0d9488" radius={[6, 6, 0, 0]} name="Occupied" />
                <Bar dataKey="total" fill="#ccfbf1" radius={[6, 6, 0, 0]} name="Capacity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {bedData.length > 0 && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {bedData.map((w) => {
                const pct = w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0;
                return (
                  <div key={w.name} className="text-center">
                    <div className={`text-xs font-bold ${pct >= 85 ? 'text-red-600' : pct >= 60 ? 'text-amber-600' : 'text-green-600'}`}>
                      {pct}%
                    </div>
                    <div className="text-xs text-gray-500">{w.name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Admissions</h3>
          {(stats?.recent_admissions || []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No recent admissions</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(stats?.recent_admissions || []).map((adm) => (
                <div key={adm._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {adm.patient_id?.user_id?.name || 'Patient'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {adm.reason_for_admission || 'N/A'} &middot; {new Date(adm.admission_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    adm.status === 'admitted' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {adm.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MiniStatCard({ title, value, icon: Icon, color }) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium opacity-80">{title}</p>
      </div>
    </div>
  );
}
