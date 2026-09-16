const { clerkClient } = require('@clerk/express');

// Simple in-memory cache
const roleCache = {};
const CACHE_TTL = 60 * 1000; // 60 seconds

async function getUserRole(userId) {
  const now = Date.now();
  if (roleCache[userId] && (now - roleCache[userId].timestamp < CACHE_TTL)) {
    return roleCache[userId].role;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const role = user.publicMetadata?.role;
    
    roleCache[userId] = {
      role: role,
      timestamp: now
    };
    
    return role;
  } catch (error) {
    console.error(`Error fetching user role for ${userId}:`, error);
    return null;
  }
}

function requireRole(role) {
  return async (req, res, next) => {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userRole = await getUserRole(req.auth.userId);
    
    if (userRole !== role) {
      return res.status(403).json({ error: `Forbidden: requires ${role} role` });
    }
    
    next();
  };
}

module.exports = {
  getUserRole,
  requireRole,
  roleCache
};
