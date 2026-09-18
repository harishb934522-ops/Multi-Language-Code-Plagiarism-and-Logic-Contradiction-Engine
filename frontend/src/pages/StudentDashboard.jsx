import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentDashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        
        // Fetch overview stats
        const overRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analytics/student/overview`, {
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
        setAssessments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [getToken]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="h-10 bg-[var(--color-surface-hover)] rounded w-64 mb-8 animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] flex flex-col h-40 animate-pulse">
              <div className="h-6 bg-[var(--color-surface-hover)] rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-[var(--color-surface-hover)] rounded w-1/2 mb-6"></div>
              <div className="mt-auto h-8 bg-[var(--color-surface-hover)] rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-[var(--color-danger)] text-center p-4 bg-[var(--color-surface)] border border-[var(--color-danger)] rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case null:
      case undefined:
        return <span className="px-3 py-1 bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-full text-sm font-medium border border-[var(--color-border)]">Not submitted</span>;
      case 'submitted':
      case 'analyzing':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">Submitted — analyzing</span>;
      case 'reviewed':
        return <span className="px-3 py-1 bg-[var(--color-success)] bg-opacity-20 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium border border-[var(--color-success)]">Reviewed</span>;
      case 'resubmission_requested':
        return <span className="px-3 py-1 bg-[var(--color-warning)] text-amber-900 dark:text-amber-300 bg-opacity-20 rounded-full text-sm font-medium border border-[var(--color-warning)]">Needs your resubmission</span>;
      default:
        return <span className="px-3 py-1 bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-full text-sm font-medium">{status}</span>;
    }
  };

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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Student Dashboard</h1>

      {overview && (
        <div className="mb-8 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Total Submitted</p>
                <p className="text-2xl font-bold">{overview.totalSubmitted}</p>
              </div>
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Avg Similarity</p>
                <p className="text-2xl font-bold">{overview.averageSimilarityScore}%</p>
              </div>
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Cleared</p>
                <p className="text-2xl font-bold text-emerald-500">{overview.decisionBreakdown?.cleared || 0}</p>
              </div>
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] uppercase">Flagged / Needs Review</p>
                <p className="text-2xl font-bold text-amber-500">{(overview.decisionBreakdown?.flagged || 0) + (overview.decisionBreakdown?.needs_review || 0)}</p>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="w-full md:w-32 h-32 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg text-[var(--color-text-primary)] font-medium">No assessments available yet</p>
          <p className="text-[var(--color-text-secondary)] mt-1">Check back later when your tutor assigns a task.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {assessments.map(assessment => (
            <div 
              key={assessment._id} 
              onClick={() => navigate(`/student-dashboard/assessment/${assessment._id}`)}
              className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-[var(--color-accent)] transition-all duration-200"
            >
              <h2 className="text-xl font-semibold mb-2">{assessment.title}</h2>
              {assessment.dueDate && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-4 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Due: {new Date(assessment.dueDate).toLocaleDateString()}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                {getStatusBadge(assessment.submissionStatus)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
