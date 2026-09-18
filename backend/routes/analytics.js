const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const Submission = require('../models/Submission');
const Report = require('../models/Report');
const { requireRole } = require('../middleware/auth');

// GET /api/analytics/tutor/overview
router.get('/tutor/overview', requireRole('tutor'), async (req, res) => {
  try {
    const assessments = await Assessment.find({ createdBy: req.auth.userId }).lean();
    const assessmentIds = assessments.map(a => a._id);
    const submissions = await Submission.find({ assessmentId: { $in: assessmentIds } }).lean();
    const subIds = submissions.map(s => s._id);
    const reports = await Report.find({ submissionId: { $in: subIds } }).lean();

    const decisionBreakdown = { pending: 0, cleared: 0, flagged: 0, needs_review: 0 };
    let totalSimilarity = 0;
    let totalContradictionsFound = 0;
    let reportCount = 0;
    const languageBreakdown = { java: 0, python: 0 };

    submissions.forEach(sub => {
      languageBreakdown[sub.language] = (languageBreakdown[sub.language] || 0) + 1;
      const report = reports.find(r => r.submissionId.toString() === sub._id.toString());
      if (report) {
        decisionBreakdown[report.decision || 'pending']++;
        totalSimilarity += (report.similarityScore || 0);
        if (report.contradictions) {
          totalContradictionsFound += report.contradictions.length;
        }
        reportCount++;
      } else {
        decisionBreakdown.pending++;
      }
    });

    const averageSimilarityScore = reportCount > 0 ? Math.round(totalSimilarity / reportCount) : 0;

    return res.status(200).json({
      totalAssessments: assessments.length,
      totalSubmissions: submissions.length,
      decisionBreakdown,
      averageSimilarityScore,
      totalContradictionsFound,
      languageBreakdown
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/analytics/student/overview
router.get('/student/overview', requireRole('student'), async (req, res) => {
  try {
    const allSubmissions = await Submission.find({ studentId: req.auth.userId }).lean();
    
    // Group to get latest per assessment
    const subMap = {};
    allSubmissions.forEach(sub => {
      if (!subMap[sub.assessmentId] || new Date(sub.submittedAt) > new Date(subMap[sub.assessmentId].submittedAt)) {
        subMap[sub.assessmentId] = sub;
      }
    });
    const latestSubmissions = Object.values(subMap);
    const subIds = latestSubmissions.map(s => s._id);
    const reports = await Report.find({ submissionId: { $in: subIds } }).lean();

    const decisionBreakdown = { pending: 0, cleared: 0, flagged: 0, needs_review: 0 };
    let totalSimilarity = 0;
    let reportCount = 0;

    latestSubmissions.forEach(sub => {
      const report = reports.find(r => r.submissionId.toString() === sub._id.toString());
      if (report) {
        decisionBreakdown[report.decision || 'pending']++;
        totalSimilarity += (report.similarityScore || 0);
        reportCount++;
      } else {
        decisionBreakdown.pending++;
      }
    });

    const averageSimilarityScore = reportCount > 0 ? Math.round(totalSimilarity / reportCount) : 0;

    return res.status(200).json({
      totalSubmitted: latestSubmissions.length,
      decisionBreakdown,
      averageSimilarityScore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
