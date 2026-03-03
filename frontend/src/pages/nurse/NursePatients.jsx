import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function NursePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/nurse/assigned-patients')
      .then(res => setPatients(res.data.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
        <p className="text-gray-500 mt-1">{patients.length} patients under your care</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {patients.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No patients assigned yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {patients.map(item => (
            <div key={item.patient?._id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-teal-600">
                    {(item.patient?.user_id?.name || 'P')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.patient?.user_id?.name || 'Patient'}</p>
                  <p className="text-sm text-gray-500">
                    {item.current_admission?.ward || 'General'} &middot; {item.pending_tasks} pending tasks
                  </p>
                </div>
              </div>
              {item.current_admission && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                  Admitted
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
