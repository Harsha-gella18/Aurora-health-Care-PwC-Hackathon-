import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckSquare, AlertTriangle, Clock, TrendingUp, Heart } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

const BURNOUT_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export default function NurseDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/nurse/workload-stats')
      .then(res => setStats(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nurse Dashboard</h1>
        <p className="text-gray-500 mt-1">Your workload overview and wellbeing tracker</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {stats?.burnout_risk === 'high' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">High Workload Alert</p>
            <p className="text-sm text-red-700 mt-1">
              You have {stats.pending_tasks} pending tasks. Consider delegating or requesting backup coverage.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Clock className="h-4 w-4" /> Pending</div>
          <p className="text-2xl font-bold text-gray-900">{stats?.pending_tasks || 0}</p>
          <p className="text-xs text-gray-400 mt-1">tasks to do</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><CheckSquare className="h-4 w-4" /> Done Today</div>
          <p className="text-2xl font-bold text-green-600">{stats?.completed_today || 0}</p>
          <p className="text-xs text-gray-400 mt-1">completed</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Users className="h-4 w-4" /> Patients</div>
          <p className="text-2xl font-bold text-gray-900">{stats?.active_patients || 0}</p>
          <p className="text-xs text-gray-400 mt-1">active admissions</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><TrendingUp className="h-4 w-4" /> Weekly Avg</div>
          <p className="text-2xl font-bold text-gray-900">{stats?.average_per_day || 0}</p>
          <p className="text-xs text-gray-400 mt-1">tasks/day</p>
        </div>
      </div>

      {/* Burnout Risk Indicator */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4" /> Wellbeing Status
        </h3>
        <div className="flex items-center gap-4">
          <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${BURNOUT_COLORS[stats?.burnout_risk || 'low']}`}>
            {stats?.burnout_risk === 'high' ? 'High Workload' : stats?.burnout_risk === 'medium' ? 'Moderate Workload' : 'Normal Workload'}
          </span>
          <span className="text-sm text-gray-500">
            {stats?.tasks_this_week || 0} tasks this week &middot; {stats?.total_tasks || 0} total
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/nurse/tasks" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-teal-200 transition-all">
          <CheckSquare className="h-8 w-8 text-teal-600 mb-3" />
          <h3 className="font-semibold text-gray-900">My Tasks</h3>
          <p className="text-sm text-gray-500 mt-1">View and manage assigned tasks</p>
        </Link>
        <Link to="/nurse/patients" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-teal-200 transition-all">
          <Users className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900">My Patients</h3>
          <p className="text-sm text-gray-500 mt-1">View assigned patients</p>
        </Link>
      </div>
    </div>
  );
}
