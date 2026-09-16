const Submission = require('../models/Submission');
const Report = require('../models/Report');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const JAVA_SERVICE_URL = process.env.JAVA_SERVICE_URL || 'http://localhost:8080';

async function parseCode(language, code) {
  const url = language === 'python' ? `${PYTHON_SERVICE_URL}/parse` : `${JAVA_SERVICE_URL}/parse`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error(`Parse failed for ${language}: ${res.status}`);
  return await res.json();
}

async function sharedComparator(ir1, ir2) {
  // Stubbed for Prompt 9
  return { similarityScore: 0, structuralEvidence: [] };
}

async function compareIRs(ir1, ir2, lang1, lang2) {
  if (lang1 === 'python' && lang2 === 'python') {
    const res = await fetch(`${PYTHON_SERVICE_URL}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ir1, ir2 })
    });
    if (!res.ok) throw new Error(`Compare failed for python: ${res.status}`);
    return await res.json();
  } else {
    // Java or mixed use shared comparator
    return await sharedComparator(ir1, ir2);
  }
}

async function runAnalysis(submissionId) {
  let partial = false;
  try {
    console.log(`[Analysis] Starting analysis for submission ${submissionId}`);
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      console.log(`[Analysis] Submission ${submissionId} not found`);
      return;
    }

    submission.status = 'analyzing';
    await submission.save();

    const otherSubmissions = await Submission.find({ 
      assessmentId: submission.assessmentId,
      studentId: { $ne: submission.studentId }
    });
    console.log(`[Analysis] Found ${otherSubmissions.length} other submissions to compare against`);

    let highestScore = 0;
    const comparedAgainst = [];
    const structuralEvidence = [];

    let mainIR = null;
    try {
      mainIR = await parseCode(submission.language, submission.code);
    } catch (err) {
      console.error(`[Analysis] Failed to parse main submission:`, err);
      partial = true;
    }

    if (mainIR) {
      for (const other of otherSubmissions) {
        try {
          console.log(`[Analysis] Comparing against ${other.studentId} (${other.language})`);
          const otherIR = await parseCode(other.language, other.code);
          const compResult = await compareIRs(mainIR, otherIR, submission.language, other.language);
          
          if (compResult.similarityScore > highestScore) {
            highestScore = compResult.similarityScore;
            if (compResult.structuralEvidence) {
               structuralEvidence.splice(0, structuralEvidence.length, ...compResult.structuralEvidence);
            }
          }
          if (compResult.similarityScore >= 40) {
            comparedAgainst.push({
              submissionId: other._id.toString(),
              studentId: other.studentId,
              score: compResult.similarityScore
            });
          }
        } catch (err) {
          console.error(`[Analysis] Failed comparison with ${other.studentId}:`, err);
          partial = true;
        }
      }
    }

    // Fingerprint check
    let fingerprintMatch = null;
    if (mainIR) {
      try {
        console.log(`[Analysis] Running fingerprint check`);
        const fpRes = await fetch(`${PYTHON_SERVICE_URL}/fingerprint-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ir: mainIR })
        });
        if (fpRes.ok) {
          const fpData = await fpRes.json();
          fingerprintMatch = fpData.match;
        } else {
          partial = true;
        }
      } catch (err) {
        console.error(`[Analysis] Fingerprint check failed:`, err);
        partial = true;
      }
    }

    // Contradiction check
    let contradictions = [];
    if (submission.language === 'python' && mainIR) {
      try {
        console.log(`[Analysis] Running contradiction check for python`);
        const conRes = await fetch(`${PYTHON_SERVICE_URL}/contradiction-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ir: mainIR })
        });
        if (conRes.ok) {
          const conData = await conRes.json();
          contradictions = conData.contradictions || [];
        } else {
          partial = true;
        }
      } catch (err) {
        console.error(`[Analysis] Contradiction check failed:`, err);
        partial = true;
      }
    } else if (submission.language === 'java') {
      console.log(`[Analysis] Contradiction check is python-only for this MVP`);
      // java submissions get an empty contradictions array
    }

    console.log(`[Analysis] Saving Report`);
    const report = new Report({
      submissionId: submission._id,
      similarityScore: highestScore,
      comparedAgainst,
      fingerprintMatch,
      contradictions,
      structuralEvidence,
      llmReportText: "",
      decision: "pending",
      partial
    });
    await report.save();

    submission.status = 'reviewed';
    await submission.save();
    console.log(`[Analysis] Completed analysis for ${submissionId}`);

  } catch (err) {
    console.error(`[Analysis] Fatal error in analysis pipeline for ${submissionId}:`, err);
    try {
      const submission = await Submission.findById(submissionId);
      if (submission) {
        submission.status = 'reviewed';
        await submission.save();
        const report = new Report({
          submissionId: submission._id,
          similarityScore: 0,
          comparedAgainst: [],
          contradictions: [],
          structuralEvidence: [],
          llmReportText: "Analysis failed due to fatal pipeline error.",
          decision: "pending",
          partial: true
        });
        await report.save();
      }
    } catch (fallbackErr) {
      console.error(`[Analysis] Fallback state update failed:`, fallbackErr);
    }
  }
}

module.exports = { runAnalysis };
