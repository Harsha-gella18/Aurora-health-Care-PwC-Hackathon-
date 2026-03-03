import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Eye, Activity, FolderOpen, Clock, AlertCircle } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function MyPatients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/doctor/patients')
      .then(res => setPatients(res.data.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load patients'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const filtered = patients.filter(p => {
    const nameMatch = (p.user_id?.name || '').toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;
    if (filter === 'active') return p.activeCases > 0;
    if (filter === 'past') return p.activeCases === 0 && p.totalCases > 0;
    return true;
  });

  const activeCount = patients.filter(p => p.activeCases > 0).length;

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'No visits';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
          <p className="text-gray-500 mt-1">{patients.length} patients in your care &middot; {activeCount} with active cases</p>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All', count: patients.length },
            { key: 'active', label: 'Active', count: activeCount },
            { key: 'past', label: 'Past Only', count: patients.length - activeCount },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{search ? 'No matching patients' : 'No patients found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((patient) => (
            <Link key={patient._id} to={`/doctor/patient/${patient._id}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-teal-200 transition-all group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  patient.activeCases > 0 ? 'bg-teal-100' : 'bg-gray-100'
                }`}>
                  <span className={`text-lg font-bold ${
                    patient.activeCases > 0 ? 'text-teal-600' : 'text-gray-500'
                  }`}>
                    {(patient.user_id?.name || 'P')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{patient.user_id?.name || 'Patient'}</p>
                    {patient.activeCases > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] font-bold flex-shrink-0">
                        <Activity className="h-2.5 w-2.5" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {patient.gender || 'N/A'} &middot; {patient.blood_group || 'N/A'} &middot; {patient.phone || 'No phone'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-gray-900">{patient.totalCases}</p>
                  <p className="text-[10px] text-gray-500 font-medium">Total Cases</p>
                </div>
                <div className={`rounded-lg px-3 py-2 text-center ${
                  patient.activeCases > 0 ? 'bg-teal-50' : 'bg-gray-50'
                }`}>
                  <p className={`text-lg font-bold ${patient.activeCases > 0 ? 'text-teal-700' : 'text-gray-400'}`}>
                    {patient.activeCases}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">Active</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-gray-900">{patient.totalCases - patient.activeCases}</p>
                  <p className="text-[10px] text-gray-500 font-medium">Completed</p>
                </div>
              </div>

              {patient.lastCaseDate && (
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Last visit: <span className="font-medium text-gray-700">{timeAgo(patient.lastCaseDate)}</span></span>
                  </div>
                  {patient.lastDiagnosis && (
                    <span className="truncate ml-2 max-w-[140px] text-gray-400" title={patient.lastDiagnosis}>
                      {patient.lastDiagnosis}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-end">
                <span className="flex items-center gap-1 text-teal-600 group-hover:text-teal-700 text-xs font-medium">
                  <Eye className="h-3.5 w-3.5" /> View Full History
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
