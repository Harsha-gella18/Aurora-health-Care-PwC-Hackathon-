import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import RiskBadge from '../../components/RiskBadge';
import Alert from '../../components/Alert';

export default function AssignedPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/nurse/assigned-patients')
      .then(res => {
        const items = res.data.data || [];
        setPatients(items.map(i => ({
          ...i.current_admission,
          _id: i.patient?._id || i.current_admission?._id,
          user_id: i.patient?.user_id,
          patient_id: i.patient,
        })));
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load assigned patients'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assigned Patients</h1>
        <p className="text-gray-500 mt-1">{patients.length} patients under your care</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {patients.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No patients assigned yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {patients.map((patient) => (
              <div key={patient._id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-teal-600">
                      {(patient.user_id?.name || patient.patient_id?.user_id?.name || 'P')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {patient.user_id?.name || patient.patient_id?.user_id?.name || 'Patient'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {patient.reason_for_admission || patient.ward || 'General Care'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Admitted: {patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge level={patient.risk_level || 'Low'} />
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    patient.status === 'admitted' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {patient.status || 'admitted'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
