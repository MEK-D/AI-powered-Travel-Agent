const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Load from root .env

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/travel_agent';

const pool = new Pool({
  connectionString,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Initialize database tables
async function initDb() {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Database tables initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize database tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDb,
  query: (text, params) => pool.query(text, params),
};
