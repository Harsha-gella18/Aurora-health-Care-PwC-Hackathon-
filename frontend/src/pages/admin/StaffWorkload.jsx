import { useState, useEffect } from 'react';
import { Users, Stethoscope, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

const statusConfig = {
  Overloaded: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  Busy: { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  Normal: { bg: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

export default function StaffWorkload() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/admin/staff-overtime')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load workload data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const nurses = data?.nurses || [];
  const doctors = data?.doctors || [];
  const overloadedNurses = nurses.filter((n) => n.workload_status === 'Overloaded').length;
  const overloadedDoctors = doctors.filter((d) => d.workload_status === 'Overloaded').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Workload</h1>
        <p className="text-gray-500 mt-1">Monitor workforce load and identify burnout risks</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Nurses" value={nurses.length} icon={Users} color="teal" />
        <SummaryCard title="Total Doctors" value={doctors.length} icon={Stethoscope} color="green" />
        <SummaryCard
          title="Overloaded Nurses"
          value={overloadedNurses}
          icon={AlertTriangle}
          color={overloadedNurses > 0 ? 'red' : 'green'}
        />
        <SummaryCard
          title="Overloaded Doctors"
          value={overloadedDoctors}
          icon={AlertTriangle}
          color={overloadedDoctors > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Nurse Workload */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600" />
          Nurse Workload
        </h3>
        {nurses.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No nurses registered</p>
        ) : (
          <div className="space-y-3">
            {nurses
              .sort((a, b) => b.pending_tasks - a.pending_tasks)
              .map((n) => {
                const cfg = statusConfig[n.workload_status] || statusConfig.Normal;
                return (
                  <div key={n.nurse.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-teal-600">{n.nurse.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{n.nurse.name}</p>
                        <p className="text-xs text-gray-500">{n.nurse.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium text-gray-900">{n.pending_tasks}</span>
                          <span className="text-gray-500">pending</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm mt-0.5">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          <span className="font-medium text-gray-900">{n.completed_today}</span>
                          <span className="text-gray-500">done today</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg}`}>
                        {n.workload_status}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Doctor Workload */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-green-600" />
          Doctor Workload
        </h3>
        {doctors.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No doctors registered</p>
        ) : (
          <div className="space-y-3">
            {doctors
              .sort((a, b) => b.appointments_today - a.appointments_today)
              .map((d) => {
                const cfg = statusConfig[d.workload_status] || statusConfig.Normal;
                return (
                  <div key={d.doctor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">{d.doctor.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Dr. {d.doctor.name}</p>
                        <p className="text-xs text-gray-500">{d.doctor.specialization || 'General'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <span className="font-medium text-gray-900">{d.appointments_today}</span>
                        <span className="text-gray-500"> appts today</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg}`}>
                        {d.workload_status}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
