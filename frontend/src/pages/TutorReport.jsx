import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import ReactDiffViewer from 'react-diff-viewer-continued';
import Editor from '@monaco-editor/react';
import Disclaimer from '../components/Disclaimer';
import { useTheme } from '../components/ThemeContext';
import { generateReportPdf } from '../lib/generateReportPdf';

export default function TutorReport() {
  const { id, submissionId } = useParams();
  const { getToken } = useAuth();
  const { theme } = useTheme();
  
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
  const [assessmentTitle, setAssessmentTitle] = useState('Assessment');

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        const subRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubmission(subData);
          
          try {
            const aRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${subData.assessmentId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (aRes.ok) {
              const aData = await aRes.json();
              setAssessmentTitle(aData.title);
            }
          } catch (e) {
            console.error(e);
          }
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
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 bg-[var(--color-surface-hover)] rounded w-64"></div>
          <div className="h-10 bg-[var(--color-surface-hover)] rounded w-48"></div>
        </div>
        <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 bg-[var(--color-surface-hover)] rounded w-48"></div>
            <div className="flex gap-4">
              <div className="h-8 bg-[var(--color-surface-hover)] rounded w-24"></div>
              <div className="h-8 bg-[var(--color-surface-hover)] rounded w-32"></div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-6">
            <div className="h-32 bg-[var(--color-surface-hover)] rounded w-full"></div>
            <div className="h-32 bg-[var(--color-surface-hover)] rounded w-full"></div>
          </div>
          <div className="h-48 bg-[var(--color-surface-hover)] rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-[var(--color-danger)] text-center p-4 bg-[var(--color-surface)] border border-[var(--color-danger)] rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  if (!report || !submission) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Submission Report</h1>
        <div className="flex gap-4 w-full md:w-auto flex-wrap">
          <button
            onClick={() => generateReportPdf(report, { assessmentTitle, studentName: submission.studentId, submissionId: submission._id, submittedAt: submission.submittedAt }, true)}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium shadow-sm transition-colors whitespace-nowrap"
          >
            Download PDF
          </button>
          <button 
            onClick={handleRequestResubmission}
            disabled={requesting}
            className="w-full md:w-auto bg-[var(--color-warning)] bg-opacity-20 text-amber-700 dark:text-amber-300 border border-[var(--color-warning)] hover:bg-opacity-30 px-4 py-2 rounded-md font-medium shadow-sm transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {requesting ? 'Requesting...' : 'Request Resubmission'}
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] p-4 md:p-6 rounded-xl shadow-sm border border-[var(--color-border)] min-w-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center flex-wrap">
            <h2 className="text-2xl font-bold">Analysis Results</h2>
            <Disclaimer />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize border 
              ${report.decision === 'cleared' ? 'bg-[var(--color-success)] bg-opacity-20 text-emerald-800 dark:text-emerald-300 border-[var(--color-success)]' : 
                report.decision === 'flagged' ? 'bg-[var(--color-danger)] bg-opacity-20 text-red-800 dark:text-red-300 border-[var(--color-danger)]' : 
                report.decision === 'needs_review' ? 'bg-[var(--color-warning)] bg-opacity-20 text-amber-800 dark:text-amber-300 border-[var(--color-warning)]' : 
                'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border-[var(--color-border)]'}`}>
              Decision: {report.decision?.replace('_', ' ')}
            </span>
            <span className="text-lg font-semibold bg-[var(--color-surface-hover)] border border-[var(--color-border)] px-4 py-2 rounded-lg">
              Similarity Score: {report.similarityScore}%
            </span>
          </div>
        </div>

        {report.fingerprintMatch && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200">
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
                  <li key={i} className="text-[var(--color-text-secondary)]">{ev}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--color-text-secondary)] italic">No structural evidence provided.</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Logic Issues</h3>
            {report.contradictions?.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {report.contradictions.map((con, i) => (
                  <li key={i} className="text-[var(--color-text-secondary)]">
                    <span className="font-medium text-[var(--color-text-primary)]">{con.type}:</span> {con.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--color-text-secondary)] italic">No logic issues detected.</p>
            )}
          </div>
        </div>

        {report.llmReportText && (
          <div className="mb-6 min-w-0">
            <h3 className="text-lg font-semibold mb-2">Detailed LLM Report</h3>
            <div className="prose max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)] overflow-x-auto">
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
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                    diffTarget === comp.submissionId 
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' 
                      : 'bg-transparent text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  Student: {comp.studentId}
                </button>
              ))}
            </div>
          </div>
        )}

        {diffTarget && targetSubmission && (
          <div className="mb-6 mt-4 border border-[var(--color-border)] rounded-lg overflow-hidden min-w-0">
            <div className="bg-[var(--color-surface-hover)] px-4 py-2 flex justify-between items-center border-b border-[var(--color-border)]">
              <span className="font-medium text-[var(--color-text-primary)]">Diff Viewer</span>
              <button onClick={() => setDiffTarget(null)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Close</button>
            </div>
            {diffLoading ? (
               <div className="p-8 text-center text-[var(--color-text-secondary)]">Loading diff...</div>
            ) : (
               <div className="overflow-x-auto">
                 <div className="min-w-[600px]">
                   <ReactDiffViewer 
                     oldValue={targetSubmission.code} 
                     newValue={submission.code} 
                     splitView={true}
                     useDarkTheme={theme === 'dark'}
                     leftTitle={`Compared: ${targetSubmission.studentId}`}
                     rightTitle="This Submission"
                   />
                 </div>
               </div>
            )}
          </div>
        )}

        {submission.history && submission.history.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-6 mt-6 min-w-0">
            <div 
              className="flex justify-between items-center cursor-pointer mb-4"
              onClick={() => setShowHistory(!showHistory)}
            >
              <h3 className="text-lg font-semibold">Submission History</h3>
              <span className="text-[var(--color-text-secondary)]">{showHistory ? '▲ Hide' : '▼ Show'} ({submission.history.length})</span>
            </div>
            
            {showHistory && (
              <div className="space-y-6">
                {submission.history.map((hist, idx) => (
                  <div key={idx} className="bg-[var(--color-surface-hover)] p-4 rounded-lg border border-[var(--color-border)] min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                      <span className="font-medium text-[var(--color-text-primary)]">Version {hist.version}</span>
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        Submitted: {new Date(hist.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="border border-[var(--color-border)] rounded-md overflow-hidden min-w-0">
                      <Editor
                        height="200px"
                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        language={hist.language || submission.language}
                        value={hist.code}
                        options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-[var(--color-border)] pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-2">Tutor Decision</h3>
          <textarea 
            className="w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-md p-3 h-24 mb-4 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="Add a note for this student..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          ></textarea>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => handleDecision('cleared')}
              disabled={updating}
              className="flex-1 md:flex-none bg-[var(--color-success)] text-white px-6 py-2 rounded-md hover:brightness-110 shadow-sm font-medium transition-all disabled:opacity-50"
            >
              Clear
            </button>
            <button 
              onClick={() => handleDecision('needs_review')}
              disabled={updating}
              className="flex-1 md:flex-none bg-[var(--color-warning)] text-white px-6 py-2 rounded-md hover:brightness-110 shadow-sm font-medium transition-all disabled:opacity-50"
            >
              Needs Review
            </button>
            <button 
              onClick={() => handleDecision('flagged')}
              disabled={updating}
              className="flex-1 md:flex-none bg-[var(--color-danger)] text-white px-6 py-2 rounded-md hover:brightness-110 shadow-sm font-medium transition-all disabled:opacity-50"
            >
              Flag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
