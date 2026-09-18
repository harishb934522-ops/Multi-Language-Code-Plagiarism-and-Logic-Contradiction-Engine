import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function TutorDashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
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

  const fetchAssessments = async () => {
    try {
      const token = await getToken();
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
    fetchAssessments();
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
      fetchAssessments();
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
          <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-36 animate-pulse"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-48 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="mt-auto h-10 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center p-4 bg-red-100 rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Tutor Dashboard</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm font-medium"
        >
          Create Assessment
        </button>
      </div>

      {assessments.length === 0 ? (
        <p className="text-gray-500">No assessments yet — create one to get started</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assessments.map(a => (
            <div key={a._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">{a.title}</h2>
              {a.dueDate && (
                <p className="text-sm text-gray-500 mb-2">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
              )}
              <p className="text-sm text-gray-600 mb-6 bg-gray-50 inline-block px-2 py-1 rounded w-max">
                {a.submissionCount} Submissions
              </p>
              
              <div className="mt-auto">
                <button 
                  onClick={() => navigate(`/tutor-dashboard/assessment/${a._id}`)}
                  className="w-full bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  View Submissions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create Assessment</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required type="text" className="w-full border border-gray-300 rounded-md p-2" value={newTitle} onChange={e=>setNewTitle(e.target.value)} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full border border-gray-300 rounded-md p-2 h-24" value={newDesc} onChange={e=>setNewDesc(e.target.value)}></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" className="w-full border border-gray-300 rounded-md p-2" value={newDate} onChange={e=>setNewDate(e.target.value)} />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Languages *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="checkbox" checked={newJava} onChange={e=>setNewJava(e.target.checked)} className="mr-2" /> Java
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={newPython} onChange={e=>setNewPython(e.target.checked)} className="mr-2" /> Python
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
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
