const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
  studentId: { type: String, required: true, index: true },
  language: { type: String, enum: ['java', 'python'], required: true },
  code: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['submitted', 'analyzing', 'reviewed', 'resubmission_requested'], 
    default: 'submitted' 
  },
  version: { type: Number, default: 1 },
  history: [{
    code: String,
    language: String,
    submittedAt: Date,
    version: Number
  }]
});

module.exports = mongoose.model('Submission', submissionSchema);
