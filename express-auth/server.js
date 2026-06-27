const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { rateLimit } = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { initDb, query } = require('./db');
require('dotenv').config({ path: '../.env' }); // Load from root .env

const app = express();
const PORT = process.env.PORT || 5002;
const FLASK_URL = process.env.FLASK_SERVER_URL || 'http://localhost:5001';

// Initialize Database Tables
initDb().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

// Middlewares
app.use(cors());

// Global JSON parsing only for non-proxy routes
// Proxy routes need raw stream bodies, so we apply express.json() selectively
const authRouter = express.Router();
authRouter.use(express.json());

// Rate Limiter for OTP requests (max 100 requests per 15 minutes for development & testing)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many OTP requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure Nodemailer Transporter
let transporter;
if (process.env.SMTP_USER && process.env.SMTP_PASS && !process.env.SMTP_USER.includes('your_email')) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log(`Nodemailer SMTP configured for: ${process.env.SMTP_USER}`);
} else {
  console.warn('⚠️ SMTP settings not configured or using placeholders. Falling back to Console OTP mode.');
}

// Helper to send OTP
async function sendOtpEmail(email, otp, purpose) {
  const subject = purpose === 'signup' ? 'Verify your TravelEase account' : 'Your 2FA Login Code';
  const text = `Your OTP verification code for the TravelEase application is: ${otp}. It will expire in 5 minutes.`;
  const html = `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #07090f; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 30px rgba(0,0,0,0.15); border: 1px solid rgba(85, 107, 47, 0.2);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0a0a00 0%, #080808 50%, #111111 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div style="display: inline-block; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 50%; border: 1px solid rgba(85, 107, 47, 0.3); margin-bottom: 16px;">
            <img src="cid:logo" alt="TravelEase Logo" style="width: 60px; height: 60px; display: block; object-fit: contain;" />
          </div>
          <h1 style="color: #ffffff; font-family: Georgia, serif; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">TravelEase</h1>
          <p style="color: #64748b; font-size: 11px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Premium AI Journey Orchestrator</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px; color: #e2e8f0; background-color: #0a0e17;">
          <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #ffffff;">Verify Your Identity</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
            Hello,<br/><br/>
            Thank you for choosing TravelEase. To complete your account registration, please use the following one-time passcode (OTP). This code is active for <strong>5 minutes</strong>.
          </p>
          
          <!-- OTP Box -->
          <div style="background: rgba(7, 9, 15, 0.6); border: 1px solid rgba(85, 107, 47, 0.2); border-radius: 14px; padding: 24px; text-align: center; margin: 30px 0;">
            <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #6B8E23; font-weight: 800; margin-bottom: 8px;">Your verification code</span>
            <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ffffff; padding-left: 8px;">
              ${otp}
            </div>
          </div>
          
          <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 24px 0 0 0; text-align: center;">
            If you did not request this verification code, please ignore this email or contact support if you have security concerns.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #07090f; padding: 24px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.04);">
          <p style="color: #475569; font-size: 11px; margin: 0; line-height: 1.4;">
            © 2026 TravelEase Inc. All rights reserved.<br/>
            Multi-agent travel planning built for luxury and scale.
          </p>
        </div>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"TravelEase" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        text,
        html,
        attachments: [{
          filename: 'travelease_logo.png',
          path: 'c:/Users/HP/Desktop/AI-powered-Travel-Agent/frontend/public/travelease_logo.png',
          cid: 'logo'
        }]
      });
      console.log(`Email sent successfully to ${email}`);
      return true;
    } catch (err) {
      console.error(`Failed to send email to ${email}:`, err);
      // Fallback to console
    }
  }
  
  // Console logging fallback (always available for easy debugging/offline)
  console.log('\n======================================');
  console.log(`📩 OTP for: ${email}`);
  console.log(`🔑 Purpose: ${purpose.toUpperCase()}`);
  console.log(`👉 CODE:    ${otp}`);
  console.log('======================================\n');
  return false;
}

// Token generation utilities
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET || 'access_secret_123',
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(user) {
  const { randomUUID } = require('crypto');
  return jwt.sign(
    { id: user.id, email: user.email, jti: randomUUID() },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret_123',
    { expiresIn: '7d' }
  );
}

// Authentication Middleware
async function authenticateToken(req, res, next) {
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    // Fallback for SSE EventSource connections
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access_secret_123');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Token Verification Error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
}

// Database thread ownership check middleware
async function checkThreadOwnership(req, res, next) {
  const threadId = req.params.thread_id || req.body.thread_id || req.query.thread_id;
  if (!threadId) {
    return res.status(400).json({ error: 'Thread ID is required' });
  }

  try {
    const result = await query(
      'SELECT 1 FROM user_threads WHERE user_id = $1 AND thread_id = $2',
      [req.user.id, threadId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: You do not own this planning session' });
    }
    next();
  } catch (err) {
    console.error('Thread verification error:', err);
    res.status(500).json({ error: 'Internal server error verifying thread ownership' });
  }
}

// Auth Routes
authRouter.post('/signup', otpLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userCheck = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userCheck.rows.length > 0) {
      const existingUser = userCheck.rows[0];
      if (existingUser.is_verified) {
        return res.status(400).json({ error: 'Email is already registered' });
      }
      // If user started signup but never verified, we can let them update password and send a new OTP
      const passwordHash = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await query(
        'UPDATE users SET password_hash = $1, otp = $2, otp_expiry = $3 WHERE id = $4',
        [passwordHash, otp, otpExpiry, existingUser.id]
      );
      await sendOtpEmail(email.toLowerCase(), otp, 'signup');
      return res.json({ message: 'Signup verification OTP sent to your email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await query(
      'INSERT INTO users (email, password_hash, otp, otp_expiry) VALUES ($1, $2, $3, $4)',
      [email.toLowerCase(), passwordHash, otp, otpExpiry]
    );

    await sendOtpEmail(email.toLowerCase(), otp, 'signup');
    res.json({ message: 'Signup verification OTP sent to your email' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Database signup error' });
  }
});

authRouter.post('/verify-signup', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (user.is_verified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    if (user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark as verified
    await query('UPDATE users SET is_verified = true, otp = NULL, otp_expiry = NULL WHERE id = $1', [user.id]);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error('Verify signup error:', err);
    res.status(500).json({ error: 'Database verification error' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_verified) {
      return res.status(400).json({ error: 'Please verify your signup first' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Direct Login - Generate access and refresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database login error' });
  }
});

authRouter.post('/verify-login', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP
    await query('UPDATE users SET otp = NULL, otp_expiry = NULL WHERE id = $1', [user.id]);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error('Verify login error:', err);
    res.status(500).json({ error: 'Database login verification error' });
  }
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    // Verify token exists in database
    const dbResult = await query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (dbResult.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid or revoked refresh token' });
    }

    const dbToken = dbResult.rows[0];
    if (new Date() > new Date(dbToken.expires_at)) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [dbToken.id]);
      return res.status(403).json({ error: 'Expired refresh token' });
    }

    // Verify JWT signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret_123');
    const userResult = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Rotate refresh token: delete old, insert new
    await query('DELETE FROM refresh_tokens WHERE id = $1', [dbToken.id]);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, newRefreshToken, expiresAt]);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.sendStatus(204);
  }

  try {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Logout error:', err);
    res.sendStatus(500);
  }
});

authRouter.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Register auth router with body parser
app.use('/api/auth', authRouter);

// Database queries & lists need JSON parser, register separately
app.use(express.json());

// Return user specific thread lists
app.get('/api/threads', authenticateToken, async (req, res) => {
  try {
    const dbResult = await query(
      'SELECT thread_id AS id, title, updated_at FROM user_threads WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json({ threads: dbResult.rows });
  } catch (error) {
    console.error('Failed to query user threads:', error);
    res.status(500).json({ error: 'Database error fetching threads' });
  }
});

const CITY_TO_IATA = {
  "mumbai": "BOM",
  "srinagar": "SXR",
  "goa": "GOI",
  "new delhi": "DEL",
  "delhi": "DEL",
  "bangalore": "BLR",
  "kolkata": "CCU",
  "kolkate": "CCU",
  "pune": "PNQ",
  "chennai": "MAA",
  "hyderabad": "HYD",
  "ahmedabad": "AMD",
  "amritsar": "ATQ",
  "jaipur": "JAI",
  "udaipur": "UDR",
  "kochi": "COK",
  "trivandrum": "TRV",
  "guwahati": "GAU",
  "patna": "PAT",
  "lucknow": "LKO",
  "varanasi": "VNS",
  "agra": "AGR",
  "chandigarh": "IXC",
  "ranchi": "IXR",
  "bhubaneswar": "BBI",
  "visakhapatnam": "VTZ",
  "dehradun": "DED",
  "jammu": "IXJ",
  "jodhpur": "JDH",
  "surat": "STV",
  "vadodara": "BDQ",
  "rajkot": "RAJ",
  "bhopal": "BHO",
  "indore": "IDR",
  "nagpur": "NAG",
  "nashik": "ISK",
  "aurangabad": "IXU",
  "coimbatore": "CJB",
  "madurai": "IXM",
  "trichy": "TRZ",
  "shillong": "SHL",
  "itanagar": "HGI",
  "dibrugarh": "DIB",
  "silchar": "IXS",
  "jorhat": "JRH",
  "gaya": "GAY",
  "darbhanga": "DBG",
  "raipur": "RPR",
  "bilaspur": "PBF",
  "panaji": "GOI",
  "vasco da gama": "GOI",
  "dabolim": "GOI",
  "margao": "GOI",
  "bhavnagar": "BHU",
  "jamnagar": "JGA",
  "gurgaon": "DEL",
  "faridabad": "DEL",
  "ambala": "IXC",
  "shimla": "SLV",
  "kullu": "KUU",
  "dharamshala": "DHM",
  "jamshedpur": "IXW",
  "dhanbad": "IXR",
  "mangalore": "IXE",
  "mysore": "MYQ",
  "hubli": "HBX",
  "belgaum": "IXG",
  "kozhikode": "CCJ",
  "kannur": "CNN",
  "gwalior": "GWL",
  "jabalpur": "JLR",
  "shirdi": "SAG",
  "imphal": "IMF",
  "aizawl": "AJL",
  "dimapur": "DMU",
  "kohima": "DMU",
  "jharsuguda": "JRG",
  "ludhiana": "LUH",
  "jalandhar": "AIP",
  "pathankot": "IXP",
  "bikaner": "BKB",
  "ajmer": "KQG",
  "kota": "KTU",
  "gangtok": "PYG",
  "salem": "SXV",
  "tuticorin": "TCR",
  "warangal": "WGC",
  "agartala": "IXA",
  "kanpur": "KNU",
  "prayagraj": "IXD",
  "gorakhpur": "GOP",
  "bareilly": "BEK",
  "pantnagar": "PGH",
  "siliguri": "IXB",
  "durgapur": "RDP",
  "bagdogra": "IXB"
};

function getIataCode(city) {
  if (!city) return 'UNK';
  const clean = city.trim().toLowerCase();
  return CITY_TO_IATA[clean] || clean.substring(0, 3).toUpperCase();
}

// Start session handler: Intercepts to assign thread ownership
app.post('/api/start', authenticateToken, async (req, res, next) => {
  const { prompt, trip_details } = req.body;
  let threadId = req.body.thread_id;
  
  if (!threadId) {
    // Generate new thread id using built-in crypto
    const { randomUUID } = require('crypto');
    threadId = randomUUID();
    req.body.thread_id = threadId;
  }

  const origin = trip_details?.origin || 'Unknown';
  const destination = trip_details?.destination || 'Unknown';
  const originCode = getIataCode(origin);
  const destCode = getIataCode(destination);
  const title = `${originCode} ➔ ${destCode}`;

  try {
    // Save thread mapping to user
    await query(
      'INSERT INTO user_threads (user_id, thread_id, title) VALUES ($1, $2, $3) ON CONFLICT (thread_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP',
      [req.user.id, threadId, title]
    );
    console.log(`Saved thread mapping: user=${req.user.id}, thread=${threadId}, title=${title}`);
    next(); // Hand off to proxy
  } catch (err) {
    console.error('Failed to link thread to user:', err);
    res.status(500).json({ error: 'Failed to record session details' });
  }
});

// Get all generated itineraries for the user
app.get('/api/itineraries', authenticateToken, async (req, res) => {
  try {
    // 1. Get all threads owned by this user
    const dbResult = await query(
      'SELECT thread_id AS id, title, updated_at FROM user_threads WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    const threads = dbResult.rows;
    if (threads.length === 0) {
      return res.json({ itineraries: [] });
    }
    
    const threadIds = threads.map(t => t.id);
    
    // 2. Call Flask bulk API
    const response = await fetch(`${FLASK_URL}/api/itineraries/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_ids: threadIds })
    });
    
    if (!response.ok) {
      throw new Error(`Flask bulk itineraries returned status ${response.status}`);
    }
    
    const flaskData = await response.json();
    
    // 3. Merge title and updated_at from database
    const itineraries = flaskData.itineraries.map(item => {
      const dbThread = threads.find(t => t.id === item.thread_id);
      return {
        ...item,
        title: dbThread ? dbThread.title : 'Trip Plan',
        updated_at: dbThread ? dbThread.updated_at : null
      };
    });
    
    res.json({ itineraries });
  } catch (error) {
    console.error('Failed to fetch user itineraries:', error);
    res.status(500).json({ error: 'Internal server error fetching itineraries' });
  }
});

// Delete a thread/itinerary
app.delete('/api/threads/:thread_id', authenticateToken, checkThreadOwnership, async (req, res) => {
  const threadId = req.params.thread_id;
  try {
    // 1. Delete mapping from user_threads
    await query('DELETE FROM user_threads WHERE user_id = $1 AND thread_id = $2', [req.user.id, threadId]);
    
    // 2. Notify Flask to delete checkpoints
    try {
      await fetch(`${FLASK_URL}/api/threads/${threadId}`, { method: 'DELETE' });
    } catch (flaskErr) {
      console.warn(`Failed to notify Flask of thread deletion for ${threadId}:`, flaskErr);
    }
    
    res.json({ success: true, message: 'Itinerary deleted successfully' });
  } catch (error) {
    console.error('Failed to delete thread:', error);
    res.status(500).json({ error: 'Internal server error deleting thread' });
  }
});

// Proxy handler for authenticated Python graph operations
app.use('/api', authenticateToken, (req, res, next) => {

  // If request contains thread_id in URL param or path (like /api/stream/:thread_id or /api/threads/:thread_id)
  // we check ownership.
  const pathParts = req.path.split('/');
  
  // Patterns like /api/stream/<thread_id>, /api/threads/<thread_id>, /api/state/<thread_id>, /api/resume/<thread_id>
  // check ownership
  let threadIdToCheck = null;
  
  if (pathParts[2] && (
    pathParts[1] === 'stream' || 
    pathParts[1] === 'threads' || 
    pathParts[1] === 'state' ||
    pathParts[1] === 'resume' ||
    pathParts[1] === 'approve'
  )) {
    threadIdToCheck = pathParts[2];
  } else if (req.body && req.body.thread_id) {
    threadIdToCheck = req.body.thread_id;
  } else if (req.query && req.query.thread_id) {
    threadIdToCheck = req.query.thread_id;
  }

  if (threadIdToCheck) {
    query('SELECT 1 FROM user_threads WHERE user_id = $1 AND thread_id = $2', [req.user.id, threadIdToCheck])
      .then(dbResult => {
        if (dbResult.rows.length === 0) {
          return res.status(403).json({ error: 'Access denied: You do not own this planning session' });
        }
        next();
      })
      .catch(err => {
        console.error('Failed to verify thread ownership inside proxy:', err);
        res.status(500).json({ error: 'Server authentication verification error' });
      });
  } else {
    // If no thread id check is needed, just pass
    next();
  }
});

// Create Proxy to Flask Backend on root with pathFilter to preserve prefix
const graphProxy = createProxyMiddleware({
  target: FLASK_URL,
  changeOrigin: true,
  ws: true,
  pathFilter: (path, req) => {
    // Only proxy requests starting with /api, excluding auth routes
    return path.startsWith('/api') && !path.startsWith('/api/auth');
  },
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Re-encode JSON body if it was parsed by express.json()
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, req, res) => {
      console.error('Proxy connection error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Flask agent server is offline' });
      }
    }
  }
});

app.use(graphProxy);

app.listen(PORT, () => {
  console.log(`Express auth and gateway server listening on port ${PORT}`);
  console.log(`Proxying requests to Flask server at ${FLASK_URL}`);
});
