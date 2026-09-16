const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
  comparedAgainst: [{
    submissionId: { type: mongoose.Schema.Types.ObjectId },
    studentId: { type: String }
  }],
  similarityScore: { type: Number, default: 0 },
  fingerprintMatch: { type: String, default: null },
  fingerprintConfidence: { type: Number, default: null },
  contradictions: [{
    type: { type: String }, // 'type' is a reserved keyword in Mongoose, but wrapping it in an object like this is correct for defining a field named 'type'
    description: String,
    lineRef: [Number]
  }],
  structuralEvidence: [String],
  llmReportText: { type: String, default: '' },
  decision: { 
    type: String, 
    enum: ['pending', 'cleared', 'flagged', 'needs_review'], 
    default: 'pending' 
  },
  tutorNote: { type: String, default: null },
  decidedBy: { type: String, default: null },
  decidedAt: { type: Date, default: null },
  partial: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
