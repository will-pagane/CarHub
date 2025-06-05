const { OAuth2Client } = require('google-auth-library');
const { GSI_CLIENT_ID } = process.env;
const authClient = new OAuth2Client(GSI_CLIENT_ID);

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: Missing or invalid Authorization header.');
  }
  const idToken = authHeader.split('Bearer ')[1];
  if (!GSI_CLIENT_ID) {
    console.error('Authentication cannot proceed: GSI_CLIENT_ID is not configured.');
    return res.status(500).send('Internal Server Error: Authentication service misconfigured.');
  }
  try {
    const ticket = await authClient.verifyIdToken({ idToken, audience: GSI_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return res.status(401).send('Unauthorized: Invalid token payload.');
    }
    req.user = { uid: payload.sub, email: payload.email };
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    if (error.message && (error.message.includes('Token used too late') || error.message.includes('Token expired'))) {
      return res.status(401).send('Unauthorized: Token expired.');
    }
    return res.status(401).send('Unauthorized: Token verification failed.');
  }
}

module.exports = { authenticateToken };
