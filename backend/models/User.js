const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
  name: { type: String, default: '' },
  role: { type: String, enum: ['student', 'tutor', null], default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
