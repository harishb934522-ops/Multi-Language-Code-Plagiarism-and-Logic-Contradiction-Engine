import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Editor from '@monaco-editor/react';
import Disclaimer from '../components/Disclaimer';

export default function StudentAssessment() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const [assessment, setAssessment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        // Fetch assessment (includes submission if it exists)
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch assessment details');
        const data = await res.json();
        setAssessment(data);
        setSubmission(data.submission || null);

        if (data.allowedLanguages?.length > 0 && !language) {
          setLanguage(data.allowedLanguages[0]);
        }
        
        if (data.submission && data.submission.status === 'reviewed') {
          // Fetch report
          const reportRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/submissions/${data.submission._id}/report`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (reportRes.ok) {
            const reportData = await reportRes.json();
            setReport(reportData);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, getToken]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${id}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ language, code })
      });
      if (!res.ok) throw new Error('Submission failed');
      const data = await res.json();
      setSubmission(data.submission || data); 
      // Switch view (we now have a submission)
    } catch (err) {
      alert(`Error submitting: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-64 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center p-4 bg-red-100 rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  if (!assessment) return null;

  const isResubmission = submission?.status === 'resubmission_requested';
  const showEditor = !submission || isResubmission;

  const getStatusBadge = (status, reportDecision) => {
    switch (status) {
      case 'submitted':
      case 'analyzing':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Submitted — analyzing</span>;
      case 'reviewed':
        if (reportDecision === 'cleared') return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Reviewed — Cleared</span>;
        if (reportDecision === 'flagged') return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Reviewed — Flagged</span>;
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Reviewed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">{assessment.title}</h1>
      <p className="text-gray-600 mb-8">{assessment.description}</p>

      {showEditor ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">{isResubmission ? 'Resubmit your code' : 'Submit your code'}</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select 
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {assessment.allowedLanguages?.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div className="border border-gray-300 rounded-md overflow-hidden mb-4">
            <Editor
              height="400px"
              theme="vs-dark"
              language={language}
              value={code}
              onChange={setCode}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Submission</h2>
              {getStatusBadge(submission.status, report?.decision)}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">Language: {submission.language}</p>
            
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <Editor
                height="300px"
                theme="vs-dark"
                language={submission.language}
                value={submission.code}
                options={{ readOnly: true }}
              />
            </div>
          </div>

          {submission.status === 'reviewed' && report && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Analysis Report</h2>
                  <Disclaimer />
                </div>
                <span className="text-lg font-semibold bg-gray-100 px-4 py-2 rounded-lg">
                  Similarity Score: {report.similarityScore}%
                </span>
              </div>

              {report.fingerprintMatch && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <p className="text-blue-700">
                    This matches the common algorithm <strong>{report.fingerprintMatch}</strong> — similarity here is expected and not necessarily plagiarism.
                  </p>
                </div>
              )}

              {report.tutorNote && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 mb-1">Note from your tutor:</h3>
                  <p className="text-yellow-700">{report.tutorNote}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Evidence</h3>
                {report.structuralEvidence?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {report.structuralEvidence.map((ev, i) => (
                      <li key={i} className="text-gray-700">{ev}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No structural evidence provided.</p>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Logic Issues</h3>
                {report.contradictions?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {report.contradictions.map((con, i) => (
                      <li key={i} className="text-gray-700">
                        <span className="font-medium">{con.type}:</span> {con.description}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No logic issues detected.</p>
                )}
              </div>

              {report.llmReportText && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Detailed Report</h3>
                  <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                    {report.llmReportText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
