import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function TutorDashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newJava, setNewJava] = useState(true);
  const [newPython, setNewPython] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const token = await getToken();
      
      // Fetch overview stats
      const overRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analytics/tutor/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (overRes.ok) {
        setOverview(await overRes.json());
      }

      // Fetch assessments
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch assessments');
      const data = await res.json();
      
      const assessmentsWithCounts = await Promise.all(data.map(async (a) => {
        try {
          const countRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${a._id}/submission-count`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (countRes.ok) {
            const countData = await countRes.json();
            return { ...a, submissionCount: countData.count };
          }
        } catch (e) {
          console.error('Count fetch error', e);
        }
        return { ...a, submissionCount: 0 };
      }));
      
      setAssessments(assessmentsWithCounts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getToken]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    const allowed = [];
    if (newJava) allowed.push('java');
    if (newPython) allowed.push('python');
    if (allowed.length === 0) {
      toast.error('Select at least one language');
      return;
    }

    setCreating(true);
    try {
      const token = await getToken();
      const payload = { title: newTitle, description: newDesc, dueDate: newDate, allowedLanguages: allowed };
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create assessment');
      }
      
      toast.success('Assessment created');
      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewDate('');
      setNewJava(true);
      setNewPython(true);
      fetchData();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 bg-[var(--color-surface-hover)] rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-[var(--color-surface-hover)] rounded w-36 animate-pulse"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] flex flex-col h-48 animate-pulse">
              <div className="h-6 bg-[var(--color-surface-hover)] rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-[var(--color-surface-hover)] rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-[var(--color-surface-hover)] rounded w-1/3 mb-6"></div>
              <div className="mt-auto h-10 bg-[var(--color-surface-hover)] rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-[var(--color-danger)] text-center p-4 bg-[var(--color-surface)] border border-[var(--color-danger)] rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  let chartData = [];
  const COLORS = {
    pending: 'var(--color-text-secondary)',
    cleared: '#10b981', // emerald-500
    needs_review: '#f59e0b', // amber-500
    flagged: '#ef4444' // red-500
  };

  if (overview && overview.decisionBreakdown) {
    chartData = Object.entries(overview.decisionBreakdown)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value, fill: COLORS[name] || COLORS.pending }));
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tutor Dashboard</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-md hover:bg-[var(--color-accent-hover)] shadow-sm font-medium transition-colors"
        >
          Create Assessment
        </button>
      </div>

      {overview && (
        <div className="mb-8 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Overview Statistics</h2>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Assessments</p>
                <p className="text-2xl font-bold">{overview.totalAssessments}</p>
              </div>
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Submissions</p>
                <p className="text-2xl font-bold">{overview.totalSubmissions}</p>
              </div>
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Avg Similarity</p>
                <p className="text-2xl font-bold">{overview.averageSimilarityScore}%</p>
              </div>
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Flagged</p>
                <p className="text-2xl font-bold text-red-500">
                  {overview.totalSubmissions ? Math.round((overview.decisionBreakdown.flagged / overview.totalSubmissions) * 100) : 0}%
                </p>
              </div>
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Cleared</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {overview.totalSubmissions ? Math.round((overview.decisionBreakdown.cleared / overview.totalSubmissions) * 100) : 0}%
                </p>
              </div>
            </div>
            
            {chartData.length > 0 && (
              <div className="w-full md:w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ')]}
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      itemStyle={{ color: 'var(--color-text-primary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {assessments.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          <div className="text-[var(--color-text-secondary)] mb-4">
            <svg className="mx-auto h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg text-[var(--color-text-primary)] font-medium">No assessments yet</p>
          <p className="text-[var(--color-text-secondary)] mt-1">Create an assessment to get started and receive submissions.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assessments.map(a => (
            <div key={a._id} className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] flex flex-col h-full hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-2">{a.title}</h2>
              {a.dueDate && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
              )}
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 bg-[var(--color-surface-hover)] border border-[var(--color-border)] inline-block px-2 py-1 rounded w-max">
                {a.submissionCount} Submissions
              </p>
              
              <div className="mt-auto">
                <button 
                  onClick={() => navigate(`/tutor-dashboard/assessment/${a._id}`)}
                  className="w-full bg-transparent border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-surface-hover)] font-medium py-2 px-4 rounded-md transition-colors"
                >
                  View Submissions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-xl shadow-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create Assessment</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Title *</label>
                <input required type="text" className="w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] focus:outline-none focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] rounded-md p-2" value={newTitle} onChange={e=>setNewTitle(e.target.value)} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Description</label>
                <textarea className="w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] focus:outline-none focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] rounded-md p-2 h-24" value={newDesc} onChange={e=>setNewDesc(e.target.value)}></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Due Date</label>
                <input type="date" className="w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] focus:outline-none focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] rounded-md p-2" value={newDate} onChange={e=>setNewDate(e.target.value)} />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Allowed Languages *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="checkbox" checked={newJava} onChange={e=>setNewJava(e.target.checked)} className="mr-2 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]" /> Java
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={newPython} onChange={e=>setNewPython(e.target.checked)} className="mr-2 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]" /> Python
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-md hover:bg-[var(--color-accent-hover)] disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
