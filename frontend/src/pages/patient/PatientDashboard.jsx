import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Pill, Activity, Clock, FolderOpen, ChevronRight } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import RiskBadge from '../../components/RiskBadge';
import Alert from '../../components/Alert';
import CaseProgressBar from '../../components/CaseProgressBar';

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [risk, setRisk] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, histRes, casesRes] = await Promise.all([
          API.get('/patient/appointments'),
          API.get('/patient/medical-history'),
          API.get('/patient/cases'),
        ]);
        setAppointments(apptRes.data.data || []);
        setMedicalHistory(histRes.data.data);
        setCases(casesRes.data.data || []);

        try {
          const riskRes = await API.post('/ai/predict-risk', {});
          setRisk(riskRes.data.data);
        } catch { /* risk prediction optional */ }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;

  const upcomingAppts = appointments.filter(a => a.status === 'scheduled')
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
  const activeMeds = medicalHistory?.active_prescriptions?.filter(p => p.is_active) || medicalHistory?.active_prescriptions || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's your health overview.</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Upcoming Appointments</h3>
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-teal-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{upcomingAppts.length}</p>
          {upcomingAppts[0] && (
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Next: {new Date(upcomingAppts[0].appointment_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Active Medications</h3>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Pill className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{activeMeds.length}</p>
          {activeMeds[0] && (
            <p className="text-sm text-gray-500 mt-2">{activeMeds[0].medication_name}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Risk Status</h3>
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          {risk ? (
            <div className="mt-1">
              <RiskBadge level={risk.risk_level || risk.riskLevel || 'Low'} />
              <p className="text-sm text-gray-500 mt-3">Score: {risk.risk_score ?? risk.riskScore ?? 'N/A'}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Not assessed yet</p>
          )}
        </div>
      </div>

      {/* Active Cases */}
      {cases.filter(c => c.status === 'active').length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-teal-600" />
              Active Cases
            </h3>
            <Link to="/patient/cases" className="text-sm text-teal-600 hover:text-teal-700 font-medium">View All</Link>
          </div>
          <div className="space-y-4">
            {cases.filter(c => c.status === 'active').slice(0, 3).map(c => (
              <Link key={c._id} to={`/patient/case/${c._id}`}
                className="block p-4 bg-gray-50 rounded-xl hover:bg-teal-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.doctor_id?.user_id?.name ? `Dr. ${c.doctor_id.user_id.name}` : ''} · {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <CaseProgressBar stages={c.stages} compact />
              </Link>
            ))}
          </div>
        </div>
      )}

      {upcomingAppts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h3>
          <div className="space-y-3">
            {upcomingAppts.slice(0, 5).map((appt) => (
              <div key={appt._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{appt.reason || 'General Checkup'}</p>
                  <p className="text-sm text-gray-500">
                    Dr. {appt.doctor_id?.user_id?.name || 'TBD'} &middot;{' '}
                    {new Date(appt.appointment_date).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeMeds.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Medications</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeMeds.map((med) => (
              <div key={med._id} className="p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="font-medium text-gray-900">{med.medication_name}</p>
                <p className="text-sm text-gray-600">{med.dosage} &middot; {med.frequency}</p>
                <p className="text-xs text-gray-500 mt-1">{med.instructions}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
