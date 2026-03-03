import { useState, useEffect } from 'react';
import { FlaskConical, Clock, CheckCircle, AlertTriangle, Loader2, Sparkles, Upload, Download } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

const BASE_URL = 'http://localhost:5001';

const PRIORITY_COLORS = {
  normal: 'bg-gray-100 text-gray-700',
  urgent: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

export default function LabDashboard() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resultInputs, setResultInputs] = useState({});
  const [costInputs, setCostInputs] = useState({});
  const [fileInputs, setFileInputs] = useState({});
  const [aiPriority, setAiPriority] = useState({});
  const [aiLoading, setAiLoading] = useState(null);

  const fetchData = async () => {
    try {
      const [casesRes, statsRes] = await Promise.all([
        API.get('/lab/pending-tests'),
        API.get('/lab/my-workload'),
      ]);
      setCases(casesRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const assessPriority = async (testId, testName, caseDoc) => {
    setAiLoading(testId);
    try {
      const res = await API.post('/ai/assess-lab-priority', {
        test_name: testName,
        diagnosis: caseDoc.diagnosis || caseDoc.title,
        symptoms: caseDoc.symptoms?.join(', '),
      });
      setAiPriority(prev => ({ ...prev, [testId]: res.data.data?.priority }));
    } catch { /* ignore */ }
    finally { setAiLoading(null); }
  };

  const startTest = async (caseId, testId) => {
    setActing(testId); setError(''); setSuccess('');
    try {
      await API.post(`/lab/case/${caseId}/start-test/${testId}`);
      setSuccess('Test started');
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const completeTest = async (caseId, testId) => {
    const results = resultInputs[testId];
    if (!results) { setError('Please enter results'); return; }
    setActing(testId); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('results', results);
      formData.append('cost', costInputs[testId] || '0');
      if (fileInputs[testId]) {
        formData.append('report_file', fileInputs[testId]);
      }

      await API.post(`/lab/case/${caseId}/complete-test/${testId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Test completed');
      setResultInputs(prev => { const n = { ...prev }; delete n[testId]; return n; });
      setCostInputs(prev => { const n = { ...prev }; delete n[testId]; return n; });
      setFileInputs(prev => { const n = { ...prev }; delete n[testId]; return n; });
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lab Technician Dashboard</h1>
        <p className="text-gray-500 mt-1">Pending lab tests and results</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Clock className="h-4 w-4" /> Pending</div>
          <p className="text-2xl font-bold text-gray-900">{stats.pending || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><FlaskConical className="h-4 w-4" /> In Progress</div>
          <p className="text-2xl font-bold text-gray-900">{stats.in_progress || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><CheckCircle className="h-4 w-4" /> Done Today</div>
          <p className="text-2xl font-bold text-green-600">{stats.completed_today || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><AlertTriangle className="h-4 w-4" /> Urgent</div>
          <p className="text-2xl font-bold text-red-600">{stats.urgent || 0}</p>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">No pending lab tests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map(c => (
            <div key={c._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-900">{c.patient_id?.user_id?.name || 'Patient'}</p>
                  <p className="text-sm text-gray-500">{c.title} &middot; Dr. {c.doctor_id?.user_id?.name || 'N/A'}</p>
                  {c.diagnosis && <p className="text-xs text-teal-600 mt-0.5">Diagnosis: {c.diagnosis}</p>}
                </div>
              </div>

              <div className="space-y-3">
                {c.lab_tests?.map(test => (
                  <div key={test._id} className={`p-4 rounded-xl border ${
                    test.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{test.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[aiPriority[test._id] || test.priority]}`}>
                          {aiPriority[test._id] || test.priority}
                        </span>
                        {aiPriority[test._id] && aiPriority[test._id] !== test.priority && (
                          <span className="text-[10px] text-purple-600 font-medium flex items-center gap-0.5">
                            <Sparkles className="h-3 w-3" /> AI assessed
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-semibold ${
                        test.status === 'completed' ? 'text-green-600' : test.status === 'in_progress' ? 'text-teal-600' : 'text-gray-500'
                      }`}>{test.status}</span>
                    </div>

                    {test.status === 'ordered' && (
                      <div className="flex items-center gap-2 mt-2">
                        <button disabled={acting === test._id} onClick={() => startTest(c._id, test._id)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                          {acting === test._id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Start Test'}
                        </button>
                        <button disabled={aiLoading === test._id}
                          onClick={() => assessPriority(test._id, test.name, c)}
                          className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1.5">
                          {aiLoading === test._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          AI Priority
                        </button>
                      </div>
                    )}

                    {test.status === 'in_progress' && (
                      <div className="space-y-2 mt-2">
                        <textarea
                          value={resultInputs[test._id] || ''} onChange={e => setResultInputs({ ...resultInputs, [test._id]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                          rows={2} placeholder="Enter test results..." />
                        <div className="flex gap-2 items-center flex-wrap">
                          <input type="number" value={costInputs[test._id] || ''} onChange={e => setCostInputs({ ...costInputs, [test._id]: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-28 outline-none focus:ring-2 focus:ring-teal-500" placeholder="Cost" />
                          <label className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                            <Upload className="h-3.5 w-3.5" />
                            {fileInputs[test._id] ? fileInputs[test._id].name.substring(0, 20) : 'Upload Report'}
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={e => setFileInputs({ ...fileInputs, [test._id]: e.target.files[0] })} />
                          </label>
                          <button disabled={acting === test._id} onClick={() => completeTest(c._id, test._id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                            {acting === test._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3" /> Complete</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {test.status === 'completed' && (
                      <div className="mt-1">
                        {test.results && <p className="text-sm text-green-700">{test.results}</p>}
                        {test.report_file && (
                          <a href={`${BASE_URL}${test.report_file}`} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium mt-1">
                            <Download className="h-3.5 w-3.5" /> View Report File
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
