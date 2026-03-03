import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import CaseProgressBar from '../../components/CaseProgressBar';

const statusConfig = {
  active: { label: 'Active', cls: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
};

const STAGE_LABELS = {
  appointment: 'Appointment', doctor_consultation: 'Consultation',
  lab: 'Lab', doctor_review: 'Review',
  pharmacy: 'Pharmacy', billing: 'Billing', closed: 'Closed',
};

export default function MyCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/patient/cases')
      .then(res => setCases(res.data.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load cases'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const activeCases = cases.filter(c => c.status === 'active');
  const closedCases = cases.filter(c => c.status !== 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
        <p className="text-gray-500 mt-1">{activeCases.length} active, {closedCases.length} closed</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {cases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No cases yet. Book an appointment to start a new case.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map(c => {
            const cfg = statusConfig[c.status] || statusConfig.active;
            const sorted = [...(c.stages || [])].sort((a, b) => a.order - b.order);
            const completedCount = sorted.filter(s => s.status === 'completed').length;

            return (
              <Link key={c._id} to={`/patient/case/${c._id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-teal-200 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{c.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {c.doctor_id?.user_id?.name ? `Dr. ${c.doctor_id.user_id.name}` : 'Doctor TBD'}
                      {' · '}
                      {new Date(c.createdAt).toLocaleDateString()}
                      {' · '}
                      Current: <span className="font-medium text-teal-600">{STAGE_LABELS[c.current_stage] || c.current_stage}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-sm font-medium text-gray-700">{completedCount}/{sorted.length}</span>
                      <p className="text-xs text-gray-400">stages done</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <CaseProgressBar stages={c.stages} compact />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
