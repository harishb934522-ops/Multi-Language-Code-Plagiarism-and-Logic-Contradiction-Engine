const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const Submission = require('../models/Submission');
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

// POST /api/assessments (tutor only)
router.post('/', requireRole('tutor'), async (req, res) => {
  try {
    const { title, description, dueDate, allowedLanguages } = req.body;
    
    // Manual validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required and must be non-empty' });
    }

    if (allowedLanguages) {
      if (!Array.isArray(allowedLanguages) || allowedLanguages.length === 0) {
        return res.status(400).json({ error: 'allowedLanguages must be a non-empty array' });
      }
      const validLangs = ['java', 'python'];
      const isValid = allowedLanguages.every(lang => validLangs.includes(lang));
      if (!isValid) {
        return res.status(400).json({ error: 'allowedLanguages must be a subset of ["java", "python"]' });
      }
    }

    const assessment = new Assessment({
      title,
      description,
      dueDate,
      allowedLanguages: allowedLanguages || ['java', 'python'], // default is handled by schema too
      createdBy: req.auth.userId
    });

    await assessment.save();
    return res.status(201).json(assessment);
  } catch (err) {
    return handleMongooseError(err, res);
  }
});

// GET /api/assessments (any authenticated user)
router.get('/', async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const role = await getUserRole(req.auth.userId);

    if (role === 'tutor') {
      const assessments = await Assessment.find({ createdBy: req.auth.userId }).sort({ createdAt: -1 });
      return res.status(200).json(assessments);
    } else if (role === 'student') {
      const assessments = await Assessment.find({}).sort({ createdAt: -1 });
      
      // Get all submissions for this student to attach submissionStatus
      const submissions = await Submission.find({ studentId: req.auth.userId });
      const submissionMap = {};
      submissions.forEach(sub => {
        // If they have multiple, we want the latest. Assuming find returns in some order, 
        // we can take the one with the latest submittedAt
        if (!submissionMap[sub.assessmentId] || new Date(sub.submittedAt) > new Date(submissionMap[sub.assessmentId].submittedAt)) {
          submissionMap[sub.assessmentId] = sub;
        }
      });

      const responseData = assessments.map(assessment => {
        const sub = submissionMap[assessment._id];
        return {
          ...assessment.toObject(),
          submissionStatus: sub ? sub.status : null
        };
      });

      return res.status(200).json(responseData);
    } else {
      return res.status(403).json({ error: 'Forbidden: missing valid role' });
    }
  } catch (err) {
    return handleMongooseError(err, res);
  }
});

// GET /api/assessments/:id (any authenticated user)
router.get('/:id', async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const role = await getUserRole(req.auth.userId);
    let responseData = assessment.toObject();

    if (role === 'student') {
      // Find the latest submission for this specific student and assessment
      const submission = await Submission.findOne({ 
        assessmentId: assessment._id, 
        studentId: req.auth.userId 
      }).sort({ submittedAt: -1 }); // Get the latest one

      responseData.submission = submission || null;
    }

    return res.status(200).json(responseData);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid assessment ID format' });
    }
    return handleMongooseError(err, res);
  }
});

// GET /api/assessments/:id/submission-count (tutor only)
router.get('/:id/submission-count', requireRole('tutor'), async (req, res) => {
  try {
    const count = await Submission.countDocuments({ assessmentId: req.params.id });
    return res.status(200).json({ count });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid assessment ID format' });
    }
    return handleMongooseError(err, res);
  }
});

// POST /api/assessments/:id/submissions (any authenticated student)
router.post('/:id/submissions', requireRole('student'), async (req, res) => {
  try {
    const { language, code } = req.body;
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    if (!assessment.allowedLanguages.includes(language)) {
      return res.status(400).json({ error: 'Language not allowed for this assessment' });
    }
    if (!code || code.trim().length === 0 || code.length > 20000) {
      return res.status(400).json({ error: 'Code must be between 1 and 20000 characters' });
    }

    let submission = await Submission.findOne({ assessmentId: req.params.id, studentId: req.auth.userId });
    if (submission) {
      if (submission.status !== 'resubmission_requested') {
        return res.status(409).json({ error: 'Already submitted' });
      }
      submission.history.push({
        code: submission.code,
        language: submission.language,
        submittedAt: submission.submittedAt,
        version: submission.version
      });
      submission.code = code;
      submission.language = language;
      submission.submittedAt = Date.now();
      submission.version += 1;
      submission.status = 'submitted';
      await submission.save();
    } else {
      submission = new Submission({
        assessmentId: req.params.id,
        studentId: req.auth.userId,
        language,
        code
      });
      await submission.save();
    }

    res.status(201).json(submission);
    
    const { runAnalysis } = require('../services/analysis');
    runAnalysis(submission._id).catch(err => {
      console.error('Unhandled runAnalysis error', err);
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid assessment ID format' });
    return handleMongooseError(err, res);
  }
});

// GET /api/assessments/:id/submissions (tutor only, must own assessment)
router.get('/:id/submissions', requireRole('tutor'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    if (assessment.createdBy !== req.auth.userId) return res.status(403).json({ error: 'Forbidden' });

    const submissions = await Submission.find({ assessmentId: req.params.id }).lean();
    
    const Report = require('../models/Report');
    const enriched = await Promise.all(submissions.map(async (sub) => {
      const report = await Report.findOne({ submissionId: sub._id }).lean();
      if (report) {
        sub.similarityScore = report.similarityScore;
        sub.contradictionsCount = report.contradictions ? report.contradictions.length : 0;
        sub.decision = report.decision;
      }
      return sub;
    }));

    return res.status(200).json(enriched);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid assessment ID format' });
    return handleMongooseError(err, res);
  }
});

// GET /api/assessments/:id/graph (tutor only, must own assessment)
router.get('/:id/graph', requireRole('tutor'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    if (assessment.createdBy !== req.auth.userId) return res.status(403).json({ error: 'Forbidden' });

    const submissions = await Submission.find({ assessmentId: req.params.id }).lean();
    const Report = require('../models/Report');
    
    const nodes = [];
    const edges = [];
    const edgeSet = new Set(); // to avoid duplicates if A->B and B->A exist

    for (const sub of submissions) {
      const report = await Report.findOne({ submissionId: sub._id }).lean();
      
      nodes.push({
        id: sub._id.toString(),
        label: sub.studentId,
        language: sub.language,
        decision: report ? report.decision : 'pending'
      });

      if (report && report.comparedAgainst) {
        for (const comp of report.comparedAgainst) {
          if (comp.score >= 40) {
            // Create a unique key for the edge so we don't duplicate (A->B == B->A)
            const id1 = sub._id.toString();
            const id2 = comp.submissionId.toString();
            const edgeKey = [id1, id2].sort().join('-');
            
            if (!edgeSet.has(edgeKey)) {
              edgeSet.add(edgeKey);
              edges.push({
                source: id1,
                target: id2,
                similarity: comp.score
              });
            }
          }
        }
      }
    }

    return res.status(200).json({ nodes, edges });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid assessment ID format' });
    return handleMongooseError(err, res);
  }
});

module.exports = router;
