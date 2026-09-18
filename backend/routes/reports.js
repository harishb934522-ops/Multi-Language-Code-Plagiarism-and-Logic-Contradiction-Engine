const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Submission = require('../models/Submission');
const Assessment = require('../models/Assessment');
const { requireRole } = require('../middleware/auth');

// Generic error handler for Mongoose validation errors
const handleMongooseError = (err, res) => {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: messages.join(', ') });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal Server Error' });
};

// PATCH /api/reports/:id/decision
router.patch('/:id/decision', requireRole('tutor'), async (req, res) => {
  try {
    const { decision, tutorNote } = req.body;
    if (!['cleared', 'flagged', 'needs_review'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const submission = await Submission.findById(report.submissionId);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const assessment = await Assessment.findById(submission.assessmentId);
    if (!assessment || assessment.createdBy !== req.auth.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    report.decision = decision;
    if (tutorNote !== undefined) {
      report.tutorNote = tutorNote;
    }
    report.decidedBy = req.auth.userId;
    report.decidedAt = Date.now();

    await report.save();

    return res.status(200).json(report);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID format' });
    return handleMongooseError(err, res);
  }
});

module.exports = router;
