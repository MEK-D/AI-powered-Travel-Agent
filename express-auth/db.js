const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' }); // Load from root .env

const rawConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/travel_agent';
const isNeon = rawConnectionString.includes('neon.tech');

// For Neon: use @neondatabase/serverless which connects over HTTP/WebSockets.
// The standard pg library fails on Neon with Node v24 due to SSL TLS changes
// (it now treats sslmode=require as verify-full which fails on Neon's certs).
// @neondatabase/serverless is Neon's official driver and bypasses this entirely.
let Pool;
if (isNeon) {
  try {
    const neon = require('@neondatabase/serverless');
    Pool = neon.Pool;
    console.log('Using @neondatabase/serverless driver for Neon PostgreSQL');
  } catch (e) {
    console.warn('⚠️ @neondatabase/serverless not found, falling back to pg:', e.message);
    Pool = require('pg').Pool;
  }
} else {
  Pool = require('pg').Pool;
}

const connectionString = rawConnectionString;

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 10000,
  ssl: isNeon ? { rejectUnauthorized: false } : false,
});


let useLocalDb = false;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TOKENS_FILE = path.join(DATA_DIR, 'refresh_tokens.json');
const THREADS_FILE = path.join(DATA_DIR, 'user_threads.json');

// Ensure local JSON files are initialized so they are ready if we fall back dynamically
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  try {
    fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  } catch (err) {
    console.error(`Error initializing ${USERS_FILE}:`, err);
  }
}
if (!fs.existsSync(TOKENS_FILE)) {
  try {
    fs.writeFileSync(TOKENS_FILE, '[]', 'utf8');
  } catch (err) {
    console.error(`Error initializing ${TOKENS_FILE}:`, err);
  }
}
if (!fs.existsSync(THREADS_FILE)) {
  try {
    fs.writeFileSync(THREADS_FILE, '[]', 'utf8');
  } catch (err) {
    console.error(`Error initializing ${THREADS_FILE}:`, err);
  }
}

// File DB helper functions
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

function writeJsonFile(filePath, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
  }
}

// Local mock query execution
async function localQuery(text, params = []) {
  const normalizedSql = text.replace(/\s+/g, ' ').trim().toLowerCase();

  // Transaction control
  if (normalizedSql === 'begin' || normalizedSql === 'commit' || normalizedSql === 'rollback') {
    return { rows: [] };
  }

  // 1. SELECT * FROM users WHERE email = $1
  if (normalizedSql.startsWith('select * from users where email = $1')) {
    const users = readJsonFile(USERS_FILE);
    const email = params[0].toLowerCase();
    const rows = users.filter(u => u.email === email);
    return { rows };
  }

  // 2. SELECT * FROM users WHERE id = $1
  if (normalizedSql.startsWith('select * from users where id = $1')) {
    const users = readJsonFile(USERS_FILE);
    const id = Number(params[0]);
    const rows = users.filter(u => u.id === id);
    return { rows };
  }

  // 3. INSERT INTO users (email, password_hash, otp, otp_expiry) VALUES ($1, $2, $3, $4)
  if (normalizedSql.startsWith('insert into users') && normalizedSql.includes('values ($1, $2, $3, $4)')) {
    const users = readJsonFile(USERS_FILE);
    const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: nextId,
      email: params[0].toLowerCase(),
      password_hash: params[1],
      is_verified: false,
      otp: params[2],
      otp_expiry: params[3],
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    writeJsonFile(USERS_FILE, users);
    return { rows: [newUser] };
  }

  // 4. UPDATE users SET password_hash = $1, otp = $2, otp_expiry = $3 WHERE id = $4
  if (normalizedSql.startsWith('update users set password_hash = $1, otp = $2, otp_expiry = $3 where id = $4')) {
    const users = readJsonFile(USERS_FILE);
    const id = Number(params[3]);
    let updated = false;
    for (let u of users) {
      if (u.id === id) {
        u.password_hash = params[0];
        u.otp = params[1];
        u.otp_expiry = params[2];
        updated = true;
        break;
      }
    }
    if (updated) {
      writeJsonFile(USERS_FILE, users);
    }
    return { rows: [] };
  }

  // 5. UPDATE users SET is_verified = true, otp = NULL, otp_expiry = NULL WHERE id = $1
  if (normalizedSql.includes('is_verified = true') && normalizedSql.includes('where id = $1')) {
    const users = readJsonFile(USERS_FILE);
    const id = Number(params[0]);
    let updated = false;
    for (let u of users) {
      if (u.id === id) {
        u.is_verified = true;
        u.otp = null;
        u.otp_expiry = null;
        updated = true;
        break;
      }
    }
    if (updated) {
      writeJsonFile(USERS_FILE, users);
    }
    return { rows: [] };
  }

  // 6. UPDATE users SET otp = NULL, otp_expiry = NULL WHERE id = $1
  if (normalizedSql.startsWith('update users set otp = null, otp_expiry = null where id = $1')) {
    const users = readJsonFile(USERS_FILE);
    const id = Number(params[0]);
    let updated = false;
    for (let u of users) {
      if (u.id === id) {
        u.otp = null;
        u.otp_expiry = null;
        updated = true;
        break;
      }
    }
    if (updated) {
      writeJsonFile(USERS_FILE, users);
    }
    return { rows: [] };
  }

  // 7. INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)
  if (normalizedSql.startsWith('insert into refresh_tokens') && normalizedSql.includes('values ($1, $2, $3)')) {
    const tokens = readJsonFile(TOKENS_FILE);
    const nextId = tokens.length > 0 ? Math.max(...tokens.map(t => t.id)) + 1 : 1;
    const newToken = {
      id: nextId,
      user_id: Number(params[0]),
      token: params[1],
      expires_at: params[2],
      created_at: new Date().toISOString()
    };
    tokens.push(newToken);
    writeJsonFile(TOKENS_FILE, tokens);
    return { rows: [newToken] };
  }

  // 8. SELECT * FROM refresh_tokens WHERE token = $1
  if (normalizedSql.startsWith('select * from refresh_tokens where token = $1')) {
    const tokens = readJsonFile(TOKENS_FILE);
    const token = params[0];
    const rows = tokens.filter(t => t.token === token);
    return { rows };
  }

  // 9. DELETE FROM refresh_tokens WHERE id = $1
  if (normalizedSql.startsWith('delete from refresh_tokens where id = $1')) {
    let tokens = readJsonFile(TOKENS_FILE);
    const id = Number(params[0]);
    tokens = tokens.filter(t => t.id !== id);
    writeJsonFile(TOKENS_FILE, tokens);
    return { rows: [] };
  }

  // 10. DELETE FROM refresh_tokens WHERE token = $1
  if (normalizedSql.startsWith('delete from refresh_tokens where token = $1')) {
    let tokens = readJsonFile(TOKENS_FILE);
    const token = params[0];
    tokens = tokens.filter(t => t.token !== token);
    writeJsonFile(TOKENS_FILE, tokens);
    return { rows: [] };
  }

  // 11. SELECT thread_id AS id, title, trip_details, updated_at FROM user_threads WHERE user_id = $1 ORDER BY updated_at DESC
  if (normalizedSql.startsWith('select thread_id as id, title, trip_details, updated_at from user_threads where user_id = $1')) {
    const threads = readJsonFile(THREADS_FILE);
    const userId = Number(params[0]);
    const rows = threads
      .filter(t => t.user_id === userId)
      .map(t => ({ 
        id: t.thread_id, 
        title: t.title, 
        trip_details: t.trip_details || {}, 
        updated_at: t.updated_at 
      }))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return { rows };
  }

  // 12. SELECT 1 FROM user_threads WHERE user_id = $1 AND thread_id = $2
  if (normalizedSql.startsWith('select 1 from user_threads where user_id = $1 and thread_id = $2')) {
    const threads = readJsonFile(THREADS_FILE);
    const userId = Number(params[0]);
    const threadId = params[1];
    const rows = threads.filter(t => t.user_id === userId && t.thread_id === threadId).map(() => ({ 1: 1 }));
    return { rows };
  }

  // 13. INSERT INTO user_threads (user_id, thread_id, title, trip_details) VALUES ($1, $2, $3, $4) ON CONFLICT (thread_id) DO UPDATE SET title = EXCLUDED.title, trip_details = EXCLUDED.trip_details, updated_at = CURRENT_TIMESTAMP
  if (normalizedSql.startsWith('insert into user_threads')) {
    const threads = readJsonFile(THREADS_FILE);
    const userId = Number(params[0]);
    const threadId = params[1];
    const title = params[2];
    let tripDetails = {};
    if (params[3]) {
      try {
        tripDetails = typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3];
      } catch (e) {
        tripDetails = params[3];
      }
    }
    const existingIndex = threads.findIndex(t => t.thread_id === threadId);
    if (existingIndex !== -1) {
      threads[existingIndex].title = title;
      threads[existingIndex].trip_details = tripDetails;
      threads[existingIndex].updated_at = new Date().toISOString();
    } else {
      const nextId = threads.length > 0 ? Math.max(...threads.map(t => t.id)) + 1 : 1;
      threads.push({
        id: nextId,
        user_id: userId,
        thread_id: threadId,
        title: title,
        trip_details: tripDetails,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    writeJsonFile(THREADS_FILE, threads);
    return { rows: [] };
  }

  // 14. DELETE FROM user_threads WHERE user_id = $1 AND thread_id = $2
  if (normalizedSql.startsWith('delete from user_threads where user_id = $1 and thread_id = $2')) {
    let threads = readJsonFile(THREADS_FILE);
    const userId = Number(params[0]);
    const threadId = params[1];
    threads = threads.filter(t => !(t.user_id === userId && t.thread_id === threadId));
    writeJsonFile(THREADS_FILE, threads);
    return { rows: [] };
  }

  console.warn(`[LocalDB] Query not recognized: "${text}" with params:`, params);
  return { rows: [] };
}

pool.on('error', (err) => {
  if (!useLocalDb) {
    console.error('Unexpected error on idle database client', err);
  }
});

// Initialize database tables or set up local files if Postgres fails
async function initDb() {
  try {
    console.log('Connecting to PostgreSQL database...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_verified BOOLEAN DEFAULT FALSE,
          otp VARCHAR(6),
          otp_expiry TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create refresh_tokens table
      await client.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(512) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create user_threads table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_threads (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          thread_id VARCHAR(255) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL DEFAULT 'New Trip Plan',
          trip_details JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Ensure trip_details column exists if table was already created without it
      await client.query(`
        ALTER TABLE user_threads ADD COLUMN IF NOT EXISTS trip_details JSONB;
      `);

      await client.query('COMMIT');
      console.log('PostgreSQL database tables initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn(`⚠️ PostgreSQL unavailable (${error.message}). Switching to local JSON database.`);
    useLocalDb = true;

    // Initialize local json directory and files
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) writeJsonFile(USERS_FILE, []);
    if (!fs.existsSync(TOKENS_FILE)) writeJsonFile(TOKENS_FILE, []);
    if (!fs.existsSync(THREADS_FILE)) writeJsonFile(THREADS_FILE, []);
    
    console.log('Local JSON database initialized successfully in:', DATA_DIR);
  }
}

module.exports = {
  pool,
  initDb,
  query: async (text, params) => {
    if (useLocalDb) {
      return localQuery(text, params);
    }
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.warn(`⚠️ PostgreSQL query failed (${error.message}). Switching to local JSON database.`);
      useLocalDb = true;
      return localQuery(text, params);
    }
  },
};
