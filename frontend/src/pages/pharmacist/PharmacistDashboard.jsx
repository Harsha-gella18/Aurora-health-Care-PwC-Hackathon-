import { useState, useEffect } from 'react';
import { Pill, CheckCircle, Loader2, DollarSign, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

const STATUS_BADGE = {
  prescribed: 'bg-amber-100 text-amber-700',
  prepared: 'bg-teal-100 text-teal-700',
  dispensed: 'bg-green-100 text-green-700',
};

const suggestAlternative = async (medicineName) => {
  const res = await API.post('/ai/suggest-prescription', { diagnosis: `Need generic alternative for ${medicineName}`, symptoms: '' });
  return res.data.data?.suggestion || '';
};

export default function PharmacistDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [costInputs, setCostInputs] = useState({});
  const [aiAlt, setAiAlt] = useState({});
  const [aiLoading, setAiLoading] = useState(null);

  const fetchData = async () => {
    try {
      const res = await API.get('/pharmacist/pending');
      setCases(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getAlternative = async (prescId, medicineName) => {
    setAiLoading(prescId);
    try {
      const text = await suggestAlternative(medicineName);
      setAiAlt(prev => ({ ...prev, [prescId]: text }));
    } catch { setError('AI suggestion failed'); }
    finally { setAiLoading(null); }
  };

  const updateMedicine = async (caseId, prescId, cost) => {
    setActing(prescId); setError(''); setSuccess('');
    try {
      await API.post(`/pharmacist/case/${caseId}/update-medicine/${prescId}`, { cost: parseFloat(cost) || 0, status: 'prepared' });
      setSuccess('Medicine prepared');
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const completePharmacy = async (caseId) => {
    setActing(caseId); setError(''); setSuccess('');
    try {
      await API.post(`/pharmacist/case/${caseId}/complete`);
      setSuccess('All medicines dispatched — sent to billing');
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pharmacist Dashboard</h1>
        <p className="text-gray-500 mt-1">Prepare prescriptions and update costs</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Pill className="h-4 w-4" /> Pending Cases</div>
        <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
      </div>

      {cases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">No pending prescriptions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map(c => {
            const allPrepared = c.prescriptions?.every(p => p.status === 'prepared' || p.status === 'dispensed');
            return (
              <div key={c._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{c.patient_id?.user_id?.name || 'Patient'}</p>
                    <p className="text-sm text-gray-500">{c.title} &middot; Dr. {c.doctor_id?.user_id?.name || 'N/A'}</p>
                    {c.diagnosis && <p className="text-xs text-teal-600 mt-0.5">Diagnosis: {c.diagnosis}</p>}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {c.prescriptions?.map(p => (
                    <div key={p._id} className={`p-4 rounded-xl border ${p.status === 'prepared' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-gray-900">{p.medication_name}</span>
                          <span className="text-sm text-gray-500 ml-2">{p.dosage} &middot; {p.frequency} &middot; {p.duration}</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                      </div>

                      {p.status === 'prescribed' && (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                              <input type="number" value={costInputs[p._id] || ''} onChange={e => setCostInputs({ ...costInputs, [p._id]: e.target.value })}
                                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-28 outline-none focus:ring-2 focus:ring-teal-500" placeholder="Cost" />
                            </div>
                            <button disabled={acting === p._id} onClick={() => updateMedicine(c._id, p._id, costInputs[p._id])}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                              {acting === p._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3" /> Prepare</>}
                            </button>
                            <button disabled={aiLoading === p._id}
                              onClick={() => getAlternative(p._id, p.medication_name)}
                              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1.5">
                              {aiLoading === p._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              AI Alternatives
                            </button>
                          </div>

                          {aiAlt[p._id] && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                <span className="text-[10px] font-semibold text-purple-800">AI Generic Alternatives</span>
                              </div>
                              <div className="text-xs text-purple-900 prose prose-xs max-w-none prose-p:text-purple-900 prose-li:text-purple-900">
                                <ReactMarkdown>{aiAlt[p._id]}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {p.status !== 'prescribed' && p.cost > 0 && (
                        <p className="text-sm text-gray-500 mt-1">Cost: ${p.cost}</p>
                      )}
                    </div>
                  ))}
                </div>

                {allPrepared && c.prescriptions?.length > 0 && (
                  <button disabled={acting === c._id} onClick={() => completePharmacy(c._id)}
                    className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {acting === c._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Dispatch All & Send to Billing <CheckCircle className="h-4 w-4" /></>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
