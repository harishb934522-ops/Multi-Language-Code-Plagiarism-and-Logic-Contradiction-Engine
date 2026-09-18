import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function TutorAssessment() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sortField, setSortField] = useState('similarityScore');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        
        // Fetch assessment details
        const aRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!aRes.ok) throw new Error('Failed to fetch assessment');
        setAssessment(await aRes.json());

        // Fetch overview
        const oRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${id}/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (oRes.ok) {
          setOverview(await oRes.json());
        }

        // Fetch submissions
        const sRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${id}/submissions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (sRes.ok) {
          let subs = await sRes.json();
          setSubmissions(subs);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, getToken]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedSubmissions = useMemo(() => {
    let result = submissions;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(sub => sub.studentId?.toLowerCase().includes(q));
    }

    result = [...result].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'submittedAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      return sortDirection === 'asc' ? 1 : -1;
    });

    return result;
  }, [submissions, sortField, sortDirection, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="h-8 bg-[var(--color-surface-hover)] rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-[var(--color-surface-hover)] rounded w-32 animate-pulse"></div>
          </div>
          <div className="h-10 bg-[var(--color-surface-hover)] rounded w-48 animate-pulse"></div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)]">
              <thead className="bg-[var(--color-surface-hover)]">
                <tr>
                  {[...Array(7)].map((_, i) => (
                    <th key={i} className="px-6 py-3"><div className="h-4 bg-[var(--color-border)] rounded w-3/4 animate-pulse"></div></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-[var(--color-surface-hover)] rounded w-full animate-pulse"></div></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-[var(--color-surface-hover)] rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-[var(--color-danger)] text-center p-4 bg-[var(--color-surface)] border border-[var(--color-danger)] rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  const getRowClass = (decision) => {
    switch (decision) {
      case 'flagged': return 'bg-red-50 dark:bg-red-900/10';
      case 'needs_review': return 'bg-yellow-50 dark:bg-yellow-900/10';
      case 'cleared': return 'bg-green-50 dark:bg-green-900/10';
      case 'pending': return 'bg-[var(--color-surface-hover)]';
      default: return 'bg-[var(--color-surface)]';
    }
  };

  const getStatusBadge = (decision, status) => {
    const val = decision || status;
    switch (val) {
      case 'flagged': return <span className="px-2 py-1 bg-[var(--color-danger)] bg-opacity-20 text-red-800 dark:text-red-300 rounded-full text-xs font-medium border border-[var(--color-danger)] capitalize">{val}</span>;
      case 'needs_review': return <span className="px-2 py-1 bg-[var(--color-warning)] bg-opacity-20 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium border border-[var(--color-warning)] capitalize">{val.replace('_', ' ')}</span>;
      case 'cleared': return <span className="px-2 py-1 bg-[var(--color-success)] bg-opacity-20 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-medium border border-[var(--color-success)] capitalize">{val}</span>;
      case 'pending': return <span className="px-2 py-1 bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-full text-xs font-medium border border-[var(--color-border)] capitalize">{val}</span>;
      default: return <span className="px-2 py-1 bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-full text-xs font-medium border border-[var(--color-border)] capitalize">{val}</span>;
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="inline ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} className="inline ml-1 text-[var(--color-accent)]" /> : <ArrowDown size={14} className="inline ml-1 text-[var(--color-accent)]" />;
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
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">{assessment?.title}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Submissions Overview</p>
        </div>
        <button 
          onClick={() => navigate(`/tutor-dashboard/assessment/${id}/graph`)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 shadow-sm font-medium w-full md:w-auto transition-colors"
        >
          View Similarity Graph
        </button>
      </div>

      {overview && (
        <div className="mb-8 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
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
              <div className="w-full md:w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
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

      <div className="mb-4">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-[var(--color-text-secondary)]" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-[var(--color-border)] rounded-md leading-5 bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] sm:text-sm"
            placeholder="Search by student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead className="bg-[var(--color-surface-hover)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)] transition-colors" onClick={() => handleSort('studentId')}>
                  Student {renderSortIcon('studentId')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)] transition-colors" onClick={() => handleSort('submittedAt')}>
                  Submitted At {renderSortIcon('submittedAt')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)] transition-colors" onClick={() => handleSort('similarityScore')}>
                  Similarity % {renderSortIcon('similarityScore')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)] transition-colors" onClick={() => handleSort('contradictionsCount')}>
                  Contradictions {renderSortIcon('contradictionsCount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Decision
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredAndSortedSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
                    <div className="flex flex-col items-center">
                      <Search size={48} className="opacity-20 mb-4" />
                      <p className="text-lg font-medium">No submissions found.</p>
                      <p className="text-sm">Try adjusting your search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedSubmissions.map(sub => (
                  <tr key={sub._id} className={`${getRowClass(sub.decision)} hover:opacity-90 transition-opacity`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{sub.studentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">{sub.language}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">{new Date(sub.submittedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{sub.similarityScore ?? '-'}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">{sub.contradictionsCount ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(sub.decision, sub.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => navigate(`/tutor-dashboard/assessment/${id}/submission/${sub._id}`)}
                        className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium px-3 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards */}
        <div className="md:hidden divide-y divide-[var(--color-border)]">
          {filteredAndSortedSubmissions.length === 0 ? (
            <div className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
              <Search size={48} className="opacity-20 mb-4 mx-auto" />
              <p className="text-lg font-medium">No submissions found.</p>
            </div>
          ) : (
            filteredAndSortedSubmissions.map(sub => (
              <div key={sub._id} className={`p-4 ${getRowClass(sub.decision)} space-y-3`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{sub.studentId}</h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">{new Date(sub.submittedAt).toLocaleString()}</p>
                  </div>
                  {getStatusBadge(sub.decision, sub.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[var(--color-text-secondary)] block text-xs uppercase">Similarity</span>
                    <span className="font-semibold">{sub.similarityScore ?? '-'}%</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] block text-xs uppercase">Contradictions</span>
                    <span>{sub.contradictionsCount ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] block text-xs uppercase">Language</span>
                    <span>{sub.language}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => navigate(`/tutor-dashboard/assessment/${id}/submission/${sub._id}`)}
                  className="w-full mt-2 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium px-4 py-2 bg-[var(--color-surface)] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-center"
                >
                  View Report
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
