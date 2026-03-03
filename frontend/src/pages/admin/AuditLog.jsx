import { useState, useEffect } from 'react';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

const actionColors = {
  Login: 'bg-teal-100 text-teal-700',
  Register: 'bg-teal-100 text-teal-700',
  'View Patient Details': 'bg-gray-100 text-gray-700',
  'View Patient List': 'bg-gray-100 text-gray-700',
  'View Medical History': 'bg-gray-100 text-gray-700',
  'View Discharge Summary': 'bg-gray-100 text-gray-700',
  'Add Medical Record': 'bg-green-100 text-green-700',
  'Create Prescription': 'bg-green-100 text-green-700',
  'Discharge Patient': 'bg-orange-100 text-orange-700',
  'Admit Patient': 'bg-purple-100 text-purple-700',
  'Book Appointment': 'bg-teal-100 text-teal-700',
  'Confirm Follow-Up': 'bg-green-100 text-green-700',
  'Update Nurse Task': 'bg-amber-100 text-amber-700',
  'Assign Nurse Task': 'bg-amber-100 text-amber-700',
  'View High Risk Patients': 'bg-red-100 text-red-700',
  'AI Request': 'bg-indigo-100 text-indigo-700',
};

const roleColors = {
  patient: 'text-teal-600',
  doctor: 'text-green-600',
  nurse: 'text-amber-600',
  admin: 'text-purple-600',
  unknown: 'text-gray-500',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const limit = 30;

  useEffect(() => {
    fetchLogs();
  }, [page, filterRole]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/admin/audit-logs?page=${page}&limit=${limit}`;
      if (filterRole) url += `&role=${filterRole}`;
      const res = await API.get(url);
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 mt-1">Track all sensitive actions for regulatory compliance</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl">
          <Shield className="h-4 w-4 text-gray-400" />
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
            className="text-sm outline-none bg-transparent"
          >
            <option value="">All Roles</option>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <span className="text-sm text-gray-500">{total} total entries</span>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No audit logs recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Resource</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{log.user_name}</td>
                    <td className="px-5 py-3">
                      <span className={`capitalize font-medium ${roleColors[log.user_role] || 'text-gray-500'}`}>
                        {log.user_role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs max-w-[200px] truncate">
                      {log.resource}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        log.status_code < 300 ? 'bg-green-100 text-green-700' :
                        log.status_code < 400 ? 'bg-teal-100 text-teal-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.status_code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
