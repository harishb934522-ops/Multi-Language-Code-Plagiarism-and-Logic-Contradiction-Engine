require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { clerkMiddleware, clerkClient } = require('@clerk/express');
const { Webhook } = require('svix');
const User = require('./models/User');
const { requireRole, roleCache } = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 4000;

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

app.use(cors());

// Webhook endpoint MUST use express.raw before any global express.json()
app.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    return res.status(400).json({ error: 'Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env' });
  }

  const svix_id = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Error: Missing Svix headers' });
  }

  const payload = req.body;
  const wh = new Webhook(SIGNING_SECRET);

  let evt;
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error: Could not verify webhook:', err.message);
    return res.status(400).json({ error: 'Error: Verification error' });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const email = evt.data.email_addresses?.[0]?.email_address || '';
    const name = `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim();
    
    await User.findOneAndUpdate(
      { clerkUserId: id },
      { email, name, role: null },
      { upsert: true, new: true }
    );
  }

  if (eventType === 'user.updated') {
    const newRole = evt.data.public_metadata?.role;
    if (newRole !== undefined) {
      await User.findOneAndUpdate(
        { clerkUserId: id },
        { role: newRole }
      );
      if (roleCache[id]) {
        delete roleCache[id];
      }
    }
  }

  res.status(200).json({ success: true, message: 'Webhook received' });
});

app.use(express.json());
app.use(clerkMiddleware());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.post('/api/users/set-role', async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { role } = req.body;
  
  if (role !== 'student' && role !== 'tutor') {
    return res.status(400).json({ error: 'Invalid role. Must be student or tutor' });
  }

  const userId = req.auth.userId;

  try {
    const userClerk = await clerkClient.users.getUser(userId);
    if (userClerk.publicMetadata?.role) {
      return res.status(409).json({ error: 'Role already set' });
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role }
    });

    const email = userClerk.emailAddresses?.[0]?.emailAddress || '';
    const name = `${userClerk.firstName || ''} ${userClerk.lastName || ''}`.trim();

    await User.findOneAndUpdate(
      { clerkUserId: userId },
      { email, name, role },
      { upsert: true, new: true }
    );

    roleCache[userId] = {
      role: role,
      timestamp: Date.now()
    };

    res.json({ success: true, role });
  } catch (error) {
    console.error('Error setting role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/reports', require('./routes/reports'));

app.listen(port, () => {
  console.log(`Backend service listening on port ${port}`);
});
