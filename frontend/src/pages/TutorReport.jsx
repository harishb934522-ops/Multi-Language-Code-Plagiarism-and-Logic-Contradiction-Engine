import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import ReactDiffViewer from 'react-diff-viewer-continued';
import Editor from '@monaco-editor/react';
import Disclaimer from '../components/Disclaimer';

export default function TutorReport() {
  const { id, submissionId } = useParams();
  const { getToken } = useAuth();
  
  const [report, setReport] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [diffTarget, setDiffTarget] = useState(null);
  const [targetSubmission, setTargetSubmission] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        const subRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (subRes.ok) {
          setSubmission(await subRes.json());
        }

        const repRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/submissions/${submissionId}/report`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (repRes.ok) {
          const r = await repRes.json();
          setReport(r);
          setNote(r.tutorNote || '');
        } else {
           throw new Error("Endpoints may not be built yet.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [submissionId, getToken]);

  const loadDiff = async (targetId) => {
    setDiffLoading(true);
    setDiffTarget(targetId);
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/submissions/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch target submission');
      setTargetSubmission(await res.json());
    } catch (err) {
      toast.error(`Could not load diff: ${err.message}`);
      setDiffTarget(null);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleDecision = async (decision) => {
    if (!report || !report._id) return;
    setUpdating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/${report._id}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ decision, tutorNote: note })
      });
      if (!res.ok) throw new Error('Failed to save decision');
      toast.success('Decision saved');
      setReport({ ...report, decision, tutorNote: note });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRequestResubmission = async () => {
    setRequesting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/submissions/${submissionId}/request-resubmission`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to request resubmission');
      toast.success('Resubmission requested');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="flex gap-4">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-6">
            <div className="h-32 bg-gray-200 rounded w-full"></div>
            <div className="h-32 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="h-48 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center p-4 bg-red-100 rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  if (!report || !submission) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Submission Report</h1>
        <div className="flex gap-4">
          <button 
            onClick={handleRequestResubmission}
            disabled={requesting}
            className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-4 py-2 rounded-md font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {requesting ? 'Requesting...' : 'Request Resubmission'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
            <Disclaimer />
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize 
              ${report.decision === 'cleared' ? 'bg-green-100 text-green-800' : 
                report.decision === 'flagged' ? 'bg-red-100 text-red-800' : 
                report.decision === 'needs_review' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-gray-100 text-gray-800'}`}>
              Decision: {report.decision}
            </span>
            <span className="text-lg font-semibold bg-gray-100 px-4 py-2 rounded-lg">
              Similarity Score: {report.similarityScore}%
            </span>
          </div>
        </div>

        {report.fingerprintMatch && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-blue-700">
              This matches the common algorithm <strong>{report.fingerprintMatch}</strong> — similarity here is expected and not necessarily plagiarism.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-6">
          <div>
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

          <div>
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
        </div>

        {report.llmReportText && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Detailed LLM Report</h3>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap p-4 bg-gray-50 rounded-lg border border-gray-100">
              {report.llmReportText}
            </div>
          </div>
        )}

        {report.comparedAgainst?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Compared Against</h3>
            <div className="flex flex-wrap gap-2">
              {report.comparedAgainst.map((comp) => (
                <button
                  key={comp.submissionId}
                  onClick={() => loadDiff(comp.submissionId)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    diffTarget === comp.submissionId 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  Student: {comp.studentId}
                </button>
              ))}
            </div>
          </div>
        )}

        {diffTarget && targetSubmission && (
          <div className="mb-6 mt-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b border-gray-200">
              <span className="font-medium text-gray-700">Diff Viewer</span>
              <button onClick={() => setDiffTarget(null)} className="text-gray-500 hover:text-gray-800">Close</button>
            </div>
            {diffLoading ? (
               <div className="p-8 text-center text-gray-500">Loading diff...</div>
            ) : (
               <ReactDiffViewer 
                 oldValue={targetSubmission.code} 
                 newValue={submission.code} 
                 splitView={true}
                 leftTitle={`Compared: ${targetSubmission.studentId}`}
                 rightTitle="This Submission"
               />
            )}
          </div>
        )}

        {submission.history && submission.history.length > 0 && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div 
              className="flex justify-between items-center cursor-pointer mb-4"
              onClick={() => setShowHistory(!showHistory)}
            >
              <h3 className="text-lg font-semibold">Submission History</h3>
              <span className="text-gray-500">{showHistory ? '▲ Hide' : '▼ Show'} ({submission.history.length})</span>
            </div>
            
            {showHistory && (
              <div className="space-y-6">
                {submission.history.map((hist, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-gray-700">Version {hist.version}</span>
                      <span className="text-sm text-gray-500">
                        Submitted: {new Date(hist.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      <Editor
                        height="200px"
                        theme="vs-dark"
                        language={hist.language || submission.language}
                        value={hist.code}
                        options={{ readOnly: true, minimap: { enabled: false } }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-2">Tutor Decision</h3>
          <textarea 
            className="w-full border border-gray-300 rounded-md p-3 h-24 mb-4 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Add a note for this student..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          ></textarea>
          
          <div className="flex gap-4">
            <button 
              onClick={() => handleDecision('cleared')}
              disabled={updating}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 shadow-sm font-medium transition-colors disabled:opacity-50"
            >
              Clear
            </button>
            <button 
              onClick={() => handleDecision('needs_review')}
              disabled={updating}
              className="bg-yellow-500 text-white px-6 py-2 rounded-md hover:bg-yellow-600 shadow-sm font-medium transition-colors disabled:opacity-50"
            >
              Needs Review
            </button>
            <button 
              onClick={() => handleDecision('flagged')}
              disabled={updating}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 shadow-sm font-medium transition-colors disabled:opacity-50"
            >
              Flag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
