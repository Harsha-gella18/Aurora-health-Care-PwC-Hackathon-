import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function ReadmissionStats() {
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    API.get(`/admin/readmission-stats?days=${days}`)
      .then(res => setStats(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load readmission stats'))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <LoadingSpinner />;

  const chartData = stats?.monthlyStats || stats?.dailyStats || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Readmission Statistics</h1>
          <p className="text-gray-500 mt-1">Track readmission trends over time</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                days === d ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Discharges</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.total_discharged ?? 'N/A'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">High Risk</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{stats?.risk_breakdown?.high ?? 'N/A'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Readmission Rate</p>
          <p className="text-3xl font-bold text-teal-600 mt-2">{stats?.estimated_readmission_rate ?? '0%'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Readmission Trend</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReadmissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="readmissions" stroke="#0d9488" strokeWidth={2}
                fill="url(#colorReadmissions)" name="Readmissions" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats?.risk_breakdown && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries({ High: stats.risk_breakdown.high, Medium: stats.risk_breakdown.medium, Low: stats.risk_breakdown.low }).map(([level, count]) => (
              <div key={level} className={`p-4 rounded-xl text-center ${
                level === 'High' ? 'bg-red-50' : level === 'Medium' ? 'bg-yellow-50' : 'bg-green-50'
              }`}>
                <p className={`text-2xl font-bold ${
                  level === 'High' ? 'text-red-600' : level === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                }`}>{count}</p>
                <p className="text-sm text-gray-600 mt-1">{level} Risk</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
