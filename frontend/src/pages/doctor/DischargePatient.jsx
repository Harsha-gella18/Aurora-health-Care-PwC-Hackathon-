import { useState, useEffect } from 'react';
import { ClipboardList, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function DischargePatient() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [simplifying, setSimplifying] = useState(false);
  const [form, setForm] = useState({ admission_id: '', discharge_summary: '' });
  const [simplified, setSimplified] = useState('');
  const [admissions, setAdmissions] = useState([]);

  useEffect(() => {
    API.get('/doctor/patients')
      .then(res => {
        const pts = res.data.data || [];
        setPatients(pts);
        const allAdmissions = [];
        pts.forEach(p => {
          (p.admissions || []).forEach(a => {
            if (a.status === 'admitted') {
              allAdmissions.push({ ...a, patientName: p.user_id?.name || 'Patient' });
            }
          });
        });
        setAdmissions(allAdmissions);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load patients'))
      .finally(() => setLoading(false));
  }, []);

  const handleDischarge = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await API.post('/doctor/discharge', {
        admission_id: form.admission_id,
        discharge_summary: form.discharge_summary,
      });
      setSuccess('Patient discharged successfully!');
      setForm({ admission_id: '', discharge_summary: '' });
      setSimplified('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to discharge patient');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimplify = async () => {
    if (!form.discharge_summary) return;
    setSimplifying(true);
    setError('');
    try {
      const res = await API.post('/ai/simplify-discharge', { discharge_text: form.discharge_summary });
      setSimplified(res.data.data?.simple_explanation || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to simplify');
    } finally {
      setSimplifying(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discharge Patient</h1>
        <p className="text-gray-500 mt-1">Create discharge summary and release patient</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <form onSubmit={handleDischarge} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admission</label>
            <select required value={form.admission_id}
              onChange={e => setForm({ ...form, admission_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">Select admitted patient</option>
              {admissions.map(a => (
                <option key={a._id} value={a._id}>
                  {a.patientName} - {a.reason_for_admission || 'Admission'} ({new Date(a.admission_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Discharge Summary</label>
            <textarea required value={form.discharge_summary}
              onChange={e => setForm({ ...form, discharge_summary: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 min-h-[150px]"
              placeholder="Enter detailed discharge summary including diagnosis, treatment, medications, follow-up instructions..."
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60 shadow-lg shadow-teal-200"
            >
              {submitting ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ClipboardList className="h-5 w-5" />}
              {submitting ? 'Discharging...' : 'Discharge Patient'}
            </button>
            <button type="button" onClick={handleSimplify} disabled={simplifying || !form.discharge_summary}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60"
            >
              {simplifying ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Sparkles className="h-5 w-5" />}
              {simplifying ? 'Simplifying...' : 'Generate Simple Version'}
            </button>
          </div>
        </form>
      </div>

      {simplified && (
        <div className="bg-gradient-to-br from-teal-50 to-indigo-50 rounded-2xl shadow-sm border border-teal-100 p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-teal-900">Simplified Version (for Patient)</h3>
          </div>
          <div className="p-4 bg-white/70 rounded-xl prose prose-sm max-w-none prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
            <ReactMarkdown>{simplified}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
