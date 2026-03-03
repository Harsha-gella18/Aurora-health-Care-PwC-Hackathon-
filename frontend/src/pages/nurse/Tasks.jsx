import { useState, useEffect } from 'react';
import { CheckSquare, Clock, Sparkles, CheckCircle } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({ diagnosis: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    API.get('/nurse/tasks')
      .then(res => setTasks(res.data.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load tasks'))
      .finally(() => setLoading(false));
  };

  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await API.post('/nurse/update-task', { task_id: taskId, status: newStatus });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      setSuccess(`Task marked as ${newStatus}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task');
    }
  };

  const generateTasks = async () => {
    if (!generateForm.diagnosis) return;
    setGenerating(true);
    setError('');
    try {
      await API.post('/ai/generate-nurse-tasks', {
        diagnosis: generateForm.diagnosis,
      });
      setSuccess('Tasks generated successfully!');
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate tasks');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">{pendingTasks.length} pending, {completedTasks.length} completed</p>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          Generate Tasks with AI
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <input type="text" value={generateForm.diagnosis}
              onChange={e => setGenerateForm({ ...generateForm, diagnosis: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter patient diagnosis (e.g., Post-cardiac surgery)"
            />
          </div>
          <button onClick={generateTasks} disabled={generating || !generateForm.diagnosis}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60 shadow-lg shadow-teal-200 whitespace-nowrap"
          >
            {generating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generating...' : 'Generate Tasks'}
          </button>
        </div>
      </div>

      {pendingTasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Pending Tasks ({pendingTasks.length})
          </h3>
          <div className="space-y-3">
            {pendingTasks.map(task => (
              <div key={task._id} className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <button onClick={() => toggleTask(task._id, task.status)}
                  className="w-6 h-6 rounded-full border-2 border-orange-300 hover:border-green-500 hover:bg-green-50 flex-shrink-0 transition-colors"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{task.task_description}</p>
                  <p className="text-sm text-gray-500">
                    {task.frequency && `${task.frequency} · `}
                    {task.patient_id?.user_id?.name || 'Unknown Patient'}
                    {task.due_date && ` · Due: ${new Date(task.due_date).toLocaleDateString()}`}
                  </p>
                  {task.warning_signs?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.warning_signs.map((w, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">{w}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  task.status === 'in_progress' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Completed Tasks ({completedTasks.length})
          </h3>
          <div className="space-y-3">
            {completedTasks.map(task => (
              <div key={task._id} className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100 opacity-80">
                <button onClick={() => toggleTask(task._id, task.status)}
                  className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
                >
                  <CheckCircle className="h-4 w-4 text-white" />
                </button>
                <div className="flex-1">
                  <p className="font-medium text-gray-600 line-through">{task.task_description}</p>
                  <p className="text-sm text-gray-400">
                    {task.patient_id?.user_id?.name || 'Unknown Patient'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  completed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tasks assigned yet. Use AI to generate tasks based on patient diagnosis.</p>
        </div>
      )}
    </div>
  );
}
