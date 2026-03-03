import { useState, useEffect } from 'react';
import { FilePlus } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function AddRecord() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    patient_id: '', diagnosis: '', notes: '', symptoms: '',
    blood_pressure: '', heart_rate: '', temperature: '', oxygen_saturation: '', weight: '',
  });

  useEffect(() => {
    API.get('/doctor/patients')
      .then(res => setPatients(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        patient_id: form.patient_id,
        diagnosis: form.diagnosis,
        notes: form.notes,
        symptoms: form.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        vitals: {
          blood_pressure: form.blood_pressure || undefined,
          heart_rate: form.heart_rate ? Number(form.heart_rate) : undefined,
          temperature: form.temperature ? Number(form.temperature) : undefined,
          oxygen_saturation: form.oxygen_saturation ? Number(form.oxygen_saturation) : undefined,
          weight: form.weight ? Number(form.weight) : undefined,
        },
      };
      await API.post('/doctor/add-record', payload);
      setSuccess('Medical record added successfully!');
      setForm({ patient_id: '', diagnosis: '', notes: '', symptoms: '', blood_pressure: '', heart_rate: '', temperature: '', oxygen_saturation: '', weight: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add record');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Medical Record</h1>
        <p className="text-gray-500 mt-1">Create a new medical record for a patient</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
            <select required value={form.patient_id}
              onChange={e => setForm({ ...form, patient_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">Select patient</option>
              {patients.map(p => (
                <option key={p._id} value={p._id}>{p.user_id?.name || 'Patient'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
            <input type="text" required value={form.diagnosis}
              onChange={e => setForm({ ...form, diagnosis: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g., Type 2 Diabetes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px]"
              placeholder="Clinical notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms (comma-separated)</label>
            <input type="text" value={form.symptoms}
              onChange={e => setForm({ ...form, symptoms: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g., Headache, Fever, Fatigue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Vitals</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <input type="text" value={form.blood_pressure}
                onChange={e => setForm({ ...form, blood_pressure: e.target.value })}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="BP (e.g., 120/80)"
              />
              <input type="number" value={form.heart_rate}
                onChange={e => setForm({ ...form, heart_rate: e.target.value })}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Heart Rate"
              />
              <input type="number" step="0.1" value={form.temperature}
                onChange={e => setForm({ ...form, temperature: e.target.value })}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Temp (°F)"
              />
              <input type="number" step="0.1" value={form.oxygen_saturation}
                onChange={e => setForm({ ...form, oxygen_saturation: e.target.value })}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="O2 Sat (%)"
              />
              <input type="number" step="0.1" value={form.weight}
                onChange={e => setForm({ ...form, weight: e.target.value })}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Weight (kg)"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="flex items-center justify-center gap-2 w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-60 shadow-lg shadow-teal-200"
          >
            {submitting ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FilePlus className="h-5 w-5" />}
            {submitting ? 'Adding...' : 'Add Medical Record'}
          </button>
        </form>
      </div>
    </div>
  );
}
