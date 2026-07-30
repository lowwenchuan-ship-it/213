const jwt = require('jsonwebtoken');

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function verify(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function getTokenFromEvent(event) {
  const h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const m = h.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(obj),
  };
}

function requireAuth(event) {
  const token = getTokenFromEvent(event);
  const payload = token && verify(token);
  return payload; // null if not authenticated
}

module.exports = { sign, verify, getTokenFromEvent, json, requireAuth };
