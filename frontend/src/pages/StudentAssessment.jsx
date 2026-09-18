import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Editor from '@monaco-editor/react';
import Disclaimer from '../components/Disclaimer';
import { useTheme } from '../components/ThemeContext';
import { generateReportPdf } from '../lib/generateReportPdf';

export default function StudentAssessment() {
  const { theme } = useTheme();
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
        <div className="h-10 bg-[var(--color-surface-hover)] rounded w-64 mb-2"></div>
        <div className="h-4 bg-[var(--color-surface-hover)] rounded w-1/2 mb-8"></div>
        <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)]">
          <div className="h-6 bg-[var(--color-surface-hover)] rounded w-48 mb-4"></div>
          <div className="h-4 bg-[var(--color-surface-hover)] rounded w-32 mb-1"></div>
          <div className="h-10 bg-[var(--color-surface-hover)] rounded w-full mb-4"></div>
          <div className="h-64 bg-[var(--color-surface-hover)] rounded w-full mb-4"></div>
          <div className="h-10 bg-[var(--color-surface-hover)] rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-[var(--color-danger)] text-center p-4 bg-[var(--color-surface)] border border-[var(--color-danger)] rounded-lg mt-8 mx-auto max-w-2xl">Error: {error}</div>;
  }

  if (!assessment) return null;

  const isResubmission = submission?.status === 'resubmission_requested';
  const showEditor = !submission || isResubmission;

  const getStatusBadge = (status, reportDecision) => {
    switch (status) {
      case 'submitted':
      case 'analyzing':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">Submitted — analyzing</span>;
      case 'reviewed':
        if (reportDecision === 'cleared') return <span className="px-3 py-1 bg-[var(--color-success)] bg-opacity-20 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium border border-[var(--color-success)]">Reviewed — Cleared</span>;
        if (reportDecision === 'flagged') return <span className="px-3 py-1 bg-[var(--color-danger)] bg-opacity-20 text-red-800 dark:text-red-300 rounded-full text-sm font-medium border border-[var(--color-danger)]">Reviewed — Flagged</span>;
        return <span className="px-3 py-1 bg-[var(--color-success)] bg-opacity-20 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium border border-[var(--color-success)]">Reviewed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">{assessment.title}</h1>
      <p className="text-[var(--color-text-secondary)] mb-8">{assessment.description}</p>

      {showEditor ? (
        <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)]">
          <h2 className="text-xl font-semibold mb-4">{isResubmission ? 'Resubmit your code' : 'Submit your code'}</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Language</label>
            <select 
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] sm:text-sm rounded-md shadow-sm border"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {assessment.allowedLanguages?.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div className="border border-[var(--color-border)] rounded-md overflow-hidden mb-4">
            <Editor
              height="400px"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              language={language}
              value={code}
              onChange={setCode}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Submission</h2>
              {getStatusBadge(submission.status, report?.decision)}
            </div>
            
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">Language: {submission.language}</p>
            
            <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
              <Editor
                height="300px"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                language={submission.language}
                value={submission.code}
                options={{ readOnly: true }}
              />
            </div>
          </div>

          {submission.status === 'reviewed' && report && (
            <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">Analysis Report</h2>
                  <Disclaimer />
                  <span className="text-lg font-semibold bg-[var(--color-bg)] px-3 py-1 rounded-lg border border-[var(--color-border)]">
                    Score: {report.similarityScore}%
                  </span>
                </div>
                <button
                  onClick={() => generateReportPdf(report, { assessmentTitle: assessment.title, submissionId: submission._id, submittedAt: submission.submittedAt }, false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
                >
                  Download PDF
                </button>
              </div>

              {report.fingerprintMatch && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
                  <p className="text-blue-800 dark:text-blue-200">
                    This matches the common algorithm <strong>{report.fingerprintMatch}</strong> — similarity here is expected and not necessarily plagiarism.
                  </p>
                </div>
              )}

              {report.tutorNote && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-[var(--color-warning)] p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Note from your tutor:</h3>
                  <p className="text-yellow-700 dark:text-yellow-300">{report.tutorNote}</p>
                </div>
              )}

              <div className="mb-6">
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

              <div className="mb-6">
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

              {report.llmReportText && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Detailed Report</h3>
                  <div className="prose max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap">
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
