import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function TutorAssessment() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        const aRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!aRes.ok) throw new Error('Failed to fetch assessment');
        setAssessment(await aRes.json());

        const sRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${id}/submissions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (sRes.ok) {
          let subs = await sRes.json();
          subs.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center p-4 bg-red-100 rounded-lg mt-8 mx-auto max-w-2xl">Error: {error} (Submissions endpoint may not be built yet)</div>;
  }

  const getRowClass = (decision) => {
    switch (decision) {
      case 'flagged': return 'bg-red-50';
      case 'needs_review': return 'bg-yellow-50';
      case 'cleared': return 'bg-green-50';
      case 'pending': return 'bg-gray-50';
      default: return 'bg-white';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{assessment?.title}</h1>
          <p className="text-sm text-gray-500">Submissions Overview</p>
        </div>
        <button 
          onClick={() => navigate(`/tutor-dashboard/assessment/${id}/graph`)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 shadow-sm font-medium"
        >
          View Similarity Graph
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Similarity %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contradictions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Decision</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No submissions yet (or endpoint 404s until built).</td>
              </tr>
            ) : (
              submissions.map(sub => (
                <tr key={sub._id} className={getRowClass(sub.decision)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.studentId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.language}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.submittedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{sub.similarityScore ?? '-'}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.contradictionsCount ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{sub.decision || sub.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => navigate(`/tutor-dashboard/assessment/${id}/submission/${sub._id}`)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
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
    </div>
  );
}
