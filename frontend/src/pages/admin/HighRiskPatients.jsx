import { useState, useEffect } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import RiskBadge from '../../components/RiskBadge';
import Alert from '../../components/Alert';

export default function HighRiskPatients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/admin/high-risk-patients')
      .then(res => setPatients(res.data.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load high risk patients'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const filtered = patients.filter(p =>
    (p.patient_id?.user_id?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">High Risk Patients</h1>
        <p className="text-gray-500 mt-1">Patients requiring close monitoring</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No high risk patients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Patient</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Admission Reason</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Ward</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Risk Level</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Risk Score</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-red-600">
                            {(p.patient_id?.user_id?.name || 'P')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.patient_id?.user_id?.name || 'Patient'}</p>
                          <p className="text-xs text-gray-500">{p.patient_id?.user_id?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.reason_for_admission || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.ward || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <RiskBadge level={p.risk_level || 'High'} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.readmission_risk_score ?? 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.follow_up_confirmed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {p.follow_up_confirmed ? 'Confirmed' : 'Not Confirmed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
