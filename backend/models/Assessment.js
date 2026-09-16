const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  allowedLanguages: { 
    type: [String], 
    enum: ['java', 'python'],
    default: ['java', 'python'] 
  },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Assessment', assessmentSchema);
