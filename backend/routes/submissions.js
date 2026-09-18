const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Report = require('../models/Report');
const Assessment = require('../models/Assessment');
const { requireRole, getUserRole } = require('../middleware/auth');

// Generic error handler for Mongoose validation errors
const handleMongooseError = (err, res) => {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: messages.join(', ') });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal Server Error' });
};
// GET /api/submissions/:id
router.get('/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const role = await getUserRole(req.auth.userId);
    if (role === 'student' && submission.studentId !== req.auth.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    return res.status(200).json(submission);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid submission ID' });
    return handleMongooseError(err, res);
  }
});

// GET /api/submissions/:id/report
router.get('/:id/report', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const role = await getUserRole(req.auth.userId);

    if (role === 'student') {
      if (submission.studentId !== req.auth.userId) return res.status(403).json({ error: 'Forbidden' });
    } else if (role === 'tutor') {
      const assessment = await Assessment.findById(submission.assessmentId);
      if (!assessment || assessment.createdBy !== req.auth.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const report = await Report.findOne({ 
      submissionId: req.params.id,
      version: submission.version 
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const reportObj = report.toObject();
    if (role === 'student') {
      delete reportObj.comparedAgainst;
    }

    return res.status(200).json(reportObj);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID' });
    return handleMongooseError(err, res);
  }
});

// PATCH /api/submissions/:id/request-resubmission (Built ahead of Prompt 13 for UI integration)
router.patch('/:id/request-resubmission', requireRole('tutor'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const assessment = await Assessment.findById(submission.assessmentId);
    if (!assessment || assessment.createdBy !== req.auth.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    submission.status = 'resubmission_requested';
    await submission.save();

    return res.status(200).json({ message: 'Resubmission requested' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID' });
    return handleMongooseError(err, res);
  }
});

module.exports = router;
