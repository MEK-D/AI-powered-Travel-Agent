require('dotenv').config({ path: '../.env' });
const { Pool } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;
console.log('Testing Neon connection via @neondatabase/serverless driver...');

const pool = new Pool({ connectionString });

async function run() {
  console.log('Connecting...');
  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    const res = await client.query('SELECT NOW()');
    console.log('Current time from Neon:', res.rows[0].now);

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('\n📋 Tables:', tables.rows.map(r => r.table_name));

    const users = await client.query('SELECT id, email, is_verified FROM users');
    console.log('\n👤 Users:', users.rows);

    const threads = await client.query('SELECT id, user_id, thread_id, title, trip_details FROM user_threads');
    console.log('\n🗂️ User threads:', threads.rows);

    client.release();
  } catch (err) {
    console.error('❌ Connection failed:', err);
  } finally {
    await pool.end();
  }
}

run();
