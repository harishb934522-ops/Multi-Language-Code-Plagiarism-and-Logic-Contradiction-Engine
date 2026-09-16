import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAssessments() {
      try {
        const token = await getToken();
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
    fetchAssessments();
  }, [getToken]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center p-4 bg-red-100 rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case null:
      case undefined:
        return <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">Not submitted</span>;
      case 'submitted':
      case 'analyzing':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Submitted — analyzing</span>;
      case 'reviewed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Reviewed</span>;
      case 'resubmission_requested':
        return <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">Needs your resubmission</span>;
      default:
        return <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Student Dashboard</h1>
      {assessments.length === 0 ? (
        <p className="text-gray-500">No assessments available.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {assessments.map(assessment => (
            <div 
              key={assessment._id} 
              onClick={() => navigate(`/student-dashboard/assessment/${assessment._id}`)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2 text-gray-900">{assessment.title}</h2>
              {assessment.dueDate && (
                <p className="text-sm text-gray-500 mb-4">
                  Due: {new Date(assessment.dueDate).toLocaleDateString()}
                </p>
              )}
              <div className="mt-4">
                {getStatusBadge(assessment.submissionStatus)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
