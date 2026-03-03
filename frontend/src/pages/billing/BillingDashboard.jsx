import { useState, useEffect } from 'react';
import { Receipt, CheckCircle, Loader2, DollarSign, Sparkles, Pill, FlaskConical, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

const PRESC_STATUS_BADGE = {
  prescribed: 'bg-amber-100 text-amber-700',
  prepared: 'bg-teal-100 text-teal-700',
  dispensed: 'bg-green-100 text-green-700',
};

export default function BillingDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feeInputs, setFeeInputs] = useState({});
  const [aiAudit, setAiAudit] = useState({});
  const [aiLoading, setAiLoading] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});

  const fetchData = async () => {
    try {
      const res = await API.get('/billing/pending');
      setCases(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleDetails = (id) =>
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));

  const auditBilling = async (caseDoc) => {
    setAiLoading(caseDoc._id);
    try {
      const billingInfo = {
        title: caseDoc.title,
        diagnosis: caseDoc.diagnosis,
        lab_tests: caseDoc.lab_tests?.map(t => ({ name: t.name, cost: t.cost })),
        prescriptions: caseDoc.prescriptions?.map(p => ({ name: p.medication_name, cost: p.cost })),
        consultation_fee: parseFloat(feeInputs[caseDoc._id]) || 500,
        billing: caseDoc.billing,
      };
      const res = await API.post('/ai/check-billing', { billing_info: billingInfo });
      setAiAudit(prev => ({ ...prev, [caseDoc._id]: res.data.data?.analysis }));
    } catch { setError('AI billing audit failed'); }
    finally { setAiLoading(null); }
  };

  const generateInvoice = async (caseId) => {
    setActing(`gen-${caseId}`); setError(''); setSuccess('');
    try {
      await API.post(`/billing/case/${caseId}/generate`, { consultation_fee: parseFloat(feeInputs[caseId]) || 500 });
      setSuccess('Invoice generated');
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const markPaid = async (caseId) => {
    setActing(`pay-${caseId}`); setError(''); setSuccess('');
    try {
      await API.post(`/billing/case/${caseId}/mark-paid`);
      setSuccess('Payment received — case closed');
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  if (loading) return <LoadingSpinner />;

  const totalPending = cases.filter(c => (c.billing?.status || 'pending') === 'pending').length;
  const totalGenerated = cases.filter(c => c.billing?.status === 'generated').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
        <p className="text-gray-500 mt-1">Generate invoices and process payments — visible to all billing officers</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Receipt className="h-4 w-4" /> Total Cases</div>
          <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-amber-600 mb-1"><DollarSign className="h-4 w-4" /> Needs Invoice</div>
          <p className="text-2xl font-bold text-amber-600">{totalPending}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-sm text-teal-600 mb-1"><CheckCircle className="h-4 w-4" /> Invoice Ready</div>
          <p className="text-2xl font-bold text-teal-600">{totalGenerated}</p>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">No pending bills.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map(c => {
            const b = c.billing || {};
            const isGenerated = b.status === 'generated';
            const expanded = expandedDetails[c._id];

            const labTotal = c.lab_tests?.reduce((s, t) => s + (t.cost || 0), 0) || 0;
            const medTotal = c.prescriptions?.reduce((s, p) => s + (p.cost || 0), 0) || 0;
            const hasPrescriptions = c.prescriptions?.length > 0;
            const hasLabTests = c.lab_tests?.length > 0;

            return (
              <div key={c._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{c.patient_id?.user_id?.name || 'Patient'}</p>
                    <p className="text-sm text-gray-500">{c.title} &middot; Dr. {c.doctor_id?.user_id?.name || 'N/A'}</p>
                    {c.diagnosis && <p className="text-xs text-teal-600 mt-0.5">Diagnosis: {c.diagnosis}</p>}
                  </div>
                  <div className="text-right">
                    {isGenerated ? (
                      <>
                        <p className="text-2xl font-bold text-gray-900">${b.total?.toFixed(2)}</p>
                        <p className="text-xs text-amber-600 font-semibold">Invoice Ready</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-semibold text-gray-500">
                          Est. ${(labTotal + medTotal + (parseFloat(feeInputs[c._id]) || 500)).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">Estimated Total</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Expandable medicine & lab breakdown */}
                <button
                  onClick={() => toggleDetails(c._id)}
                  className="w-full flex items-center justify-between text-sm text-teal-700 bg-teal-50 rounded-xl px-4 py-2.5 mb-3 hover:bg-teal-100 transition-colors"
                >
                  <span className="flex items-center gap-2 font-medium">
                    {hasPrescriptions && <><Pill className="h-3.5 w-3.5" /> {c.prescriptions.length} Medicine(s)</>}
                    {hasPrescriptions && hasLabTests && <span className="text-gray-300">|</span>}
                    {hasLabTests && <><FlaskConical className="h-3.5 w-3.5" /> {c.lab_tests.length} Lab Test(s)</>}
                    {!hasPrescriptions && !hasLabTests && <><Stethoscope className="h-3.5 w-3.5" /> Consultation Only</>}
                  </span>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expanded && (
                  <div className="space-y-3 mb-4">
                    {hasPrescriptions && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5" /> Prescriptions from Pharmacy
                        </p>
                        <div className="space-y-2">
                          {c.prescriptions.map(p => (
                            <div key={p._id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                              <div>
                                <span className="font-medium text-gray-900">{p.medication_name}</span>
                                <span className="text-gray-400 ml-2 text-xs">{p.dosage} · {p.frequency} · {p.duration}</span>
                                <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRESC_STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {p.status}
                                </span>
                              </div>
                              <span className={`font-semibold ${p.cost > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                ${(p.cost || 0).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-sm">
                            <span className="text-gray-700">Medicine Subtotal</span>
                            <span className="text-gray-900">${medTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {hasLabTests && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <FlaskConical className="h-3.5 w-3.5" /> Lab Tests
                        </p>
                        <div className="space-y-2">
                          {c.lab_tests.map(t => (
                            <div key={t._id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                              <div>
                                <span className="font-medium text-gray-900">{t.name}</span>
                                <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {t.status}
                                </span>
                              </div>
                              <span className={`font-semibold ${t.cost > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                ${(t.cost || 0).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-sm">
                            <span className="text-gray-700">Lab Subtotal</span>
                            <span className="text-gray-900">${labTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isGenerated && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lab charges (auto)</span>
                        <span className="font-medium">${labTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Medicine cost (from pharmacy)</span>
                        <span className="font-medium">${medTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Consultation fee</span>
                        <input type="number" value={feeInputs[c._id] || ''} onChange={e => setFeeInputs({ ...feeInputs, [c._id]: e.target.value })}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-28 text-right outline-none focus:ring-2 focus:ring-teal-500" placeholder="500" />
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                        <span>Estimated Total</span>
                        <span>${(labTotal + medTotal + (parseFloat(feeInputs[c._id]) || 500)).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button disabled={acting === `gen-${c._id}`} onClick={() => generateInvoice(c._id)}
                        className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {acting === `gen-${c._id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Receipt className="h-4 w-4" /> Generate Invoice</>}
                      </button>
                      <button disabled={aiLoading === c._id}
                        onClick={() => auditBilling(c)}
                        className="px-4 py-3 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1.5">
                        {aiLoading === c._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        AI Audit
                      </button>
                    </div>

                    {aiAudit[c._id] && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-800">AI Billing Audit</span>
                        </div>
                        <div className="text-sm text-purple-900 prose prose-sm max-w-none prose-p:text-purple-900 prose-li:text-purple-900 prose-strong:text-purple-800">
                          <ReactMarkdown>{aiAudit[c._id]}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isGenerated && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      {b.items?.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-600">{item.description}</span>
                          <span className="font-medium">${item.amount?.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                        <span>Total</span>
                        <span>${b.total?.toFixed(2)}</span>
                      </div>
                    </div>

                    <button disabled={acting === `pay-${c._id}`} onClick={() => markPaid(c._id)}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {acting === `pay-${c._id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><DollarSign className="h-4 w-4" /> Mark as Paid & Close Case</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
