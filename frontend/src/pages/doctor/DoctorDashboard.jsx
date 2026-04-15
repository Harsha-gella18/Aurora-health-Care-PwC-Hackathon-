import { useState, useEffect } from 'react';
import {
  Stethoscope, FlaskConical, FolderOpen, ChevronRight, CheckCircle,
  Pill, CreditCard, Activity, Clock, Users, Scissors,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import CaseProgressBar from '../../components/CaseProgressBar';

const STAGE_CONFIG = {
  doctor_consultation: { label: 'Consultation', color: 'bg-teal-100 text-teal-700', icon: Stethoscope },
  doctor_review: { label: 'Review', color: 'bg-amber-100 text-amber-700', icon: FlaskConical },
  surgery: { label: 'In Surgery', color: 'bg-rose-100 text-rose-700', icon: Scissors },
  lab: { label: 'In Lab', color: 'bg-purple-100 text-purple-700', icon: FlaskConical },
  pharmacy: { label: 'In Pharmacy', color: 'bg-green-100 text-green-700', icon: Pill },
  billing: { label: 'In Billing', color: 'bg-cyan-100 text-cyan-700', icon: CreditCard },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
};

export default function DoctorDashboard() {
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('active');

  useEffect(() => {
    API.get('/doctor/all-cases')
      .then(res => setAllCases(res.data.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const activeCases = allCases.filter(c => c.status === 'active');
  const completedCases = allCases.filter(c => c.status === 'completed');

  const consultations = activeCases.filter(c => c.current_stage === 'doctor_consultation');
  const reviews = activeCases.filter(c => c.current_stage === 'doctor_review');
  const inSurgery = activeCases.filter(c => c.current_stage === 'surgery');
  const inLab = activeCases.filter(c => c.current_stage === 'lab');
  const inPharmacy = activeCases.filter(c => c.current_stage === 'pharmacy');
  const inBilling = activeCases.filter(c => c.current_stage === 'billing');

  const needsAction = [...consultations, ...reviews];
  const inProgress = [...inSurgery, ...inLab, ...inPharmacy, ...inBilling];

  const displayCases = tab === 'active' ? activeCases
    : tab === 'action' ? needsAction
    : tab === 'surgery' ? inSurgery
    : tab === 'progress' ? inProgress
    : completedCases;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-500 mt-1">Your cases and pending actions</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">Consultations</h3>
            <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-teal-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{consultations.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">Reviews</h3>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">In Surgery</h3>
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
              <Scissors className="h-4 w-4 text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inSurgery.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">In Lab</h3>
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inLab.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">In Pharmacy</h3>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <Pill className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inPharmacy.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">Completed</h3>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedCases.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {[
          { key: 'active', label: 'All Active', count: activeCases.length },
          { key: 'action', label: 'Needs My Action', count: needsAction.length },
          { key: 'surgery', label: 'Surgery', count: inSurgery.length },
          { key: 'progress', label: 'In Progress', count: inProgress.length },
          { key: 'completed', label: 'Completed', count: completedCases.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Case List */}
      {displayCases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {tab === 'action' ? 'No cases need your action right now.' : 'No cases found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayCases.map(c => {
            const config = STAGE_CONFIG[c.current_stage] || STAGE_CONFIG.closed;
            const StageIcon = config.icon;
            const isActionable = ['doctor_consultation', 'doctor_review'].includes(c.current_stage);

            return (
              <Link key={c._id} to={`/doctor/case/${c._id}`}
                className={`block bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all ${
                  isActionable ? 'border-teal-200 hover:border-teal-300' : 'border-gray-100 hover:border-gray-200'
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isActionable ? 'bg-teal-100' : 'bg-gray-100'
                    }`}>
                      <StageIcon className={`h-5 w-5 ${isActionable ? 'text-teal-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{c.patient_id?.user_id?.name || 'Patient'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color}`}>
                          {config.label}
                        </span>
                        {isActionable && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold animate-pulse">
                            Action Required
                          </span>
                        )}
                        {c.status === 'completed' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {c.title}
                        {c.pathway_label && (
                          <span className="text-indigo-600 font-medium"> · {c.pathway_label}</span>
                        )}
                        {c.diagnosis && <> &middot; <span className="font-medium text-gray-600">{c.diagnosis}</span></>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
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
