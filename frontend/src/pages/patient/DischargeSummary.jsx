import { useState, useEffect } from 'react';
import { FileText, Sparkles, ClipboardList, CheckCircle, CalendarCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function DischargeSummary() {
  const [discharge, setDischarge] = useState(null);
  const [simplified, setSimplified] = useState('');
  const [loading, setLoading] = useState(true);
  const [simplifying, setSimplifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    API.get('/patient/discharge-summary')
      .then(res => setDischarge(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load discharge summary'))
      .finally(() => setLoading(false));
  }, []);

  const handleSimplify = async () => {
    if (!discharge) return;
    setSimplifying(true);
    setError('');
    try {
      const text = discharge.discharge_summary || discharge.summary;
      const res = await API.post('/ai/simplify-discharge', {
        discharge_text: text,
        admission_id: discharge._id,
      });
      setSimplified(res.data.data?.simple_explanation || res.data.data?.simplified_text || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to simplify discharge summary');
    } finally {
      setSimplifying(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discharge Summary</h1>
        <p className="text-gray-500 mt-1">Your latest discharge information</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {!discharge || (!discharge.discharge_summary && !discharge.summary) ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No discharge summary available</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">Original Discharge Summary</h3>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl prose prose-sm max-w-none prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
              <ReactMarkdown>{discharge.discharge_summary || discharge.summary}</ReactMarkdown>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-3 bg-teal-50 rounded-lg">
                <p className="text-gray-500 text-xs">Ward</p>
                <p className="font-medium text-gray-900">{discharge.ward || 'N/A'}</p>
              </div>
              <div className="p-3 bg-teal-50 rounded-lg">
                <p className="text-gray-500 text-xs">Admitted</p>
                <p className="font-medium text-gray-900">{discharge.admission_date ? new Date(discharge.admission_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-3 bg-teal-50 rounded-lg">
                <p className="text-gray-500 text-xs">Discharged</p>
                <p className="font-medium text-gray-900">{discharge.discharge_date ? new Date(discharge.discharge_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-3 bg-teal-50 rounded-lg">
                <p className="text-gray-500 text-xs">Status</p>
                <p className="font-medium text-gray-900 capitalize">{discharge.status || 'N/A'}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleSimplify}
                disabled={simplifying}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60 shadow-lg shadow-teal-200"
              >
                {simplifying ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                {simplifying ? 'Simplifying...' : 'Simplify with AI'}
              </button>

              {discharge && !discharge.follow_up_confirmed ? (
                <button
                  onClick={async () => {
                    setConfirming(true);
                    setError('');
                    try {
                      await API.post('/patient/confirm-followup', { admission_id: discharge._id });
                      setDischarge({ ...discharge, follow_up_confirmed: true });
                      setSuccess('Follow-up confirmed! Your care team has been notified.');
                    } catch (err) {
                      setError(err.response?.data?.message || 'Failed to confirm follow-up');
                    } finally {
                      setConfirming(false);
                    }
                  }}
                  disabled={confirming}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60 shadow-lg shadow-green-200"
                >
                  {confirming ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <CalendarCheck className="h-5 w-5" />
                  )}
                  {confirming ? 'Confirming...' : 'Confirm Follow-Up'}
                </button>
              ) : discharge?.follow_up_confirmed ? (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium text-sm">
                  <CheckCircle className="h-5 w-5" />
                  Follow-Up Confirmed
                  {discharge.follow_up_date && (
                    <span className="text-green-600 ml-1">
                      — {new Date(discharge.follow_up_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {(simplified || discharge.simplified_discharge) && (
            <div className="bg-gradient-to-br from-teal-50 to-indigo-50 rounded-2xl shadow-sm border border-teal-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-teal-900">AI Simplified Explanation</h3>
              </div>
              <div className="p-4 bg-white/70 rounded-xl prose prose-sm max-w-none prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                <ReactMarkdown>{simplified || discharge.simplified_discharge}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
