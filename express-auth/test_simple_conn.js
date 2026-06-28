const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log("Connecting using standard pg...");
client.connect()
  .then(() => {
    console.log("Connected standard pg!");
    return client.query("SELECT NOW()");
  })
  .then(res => {
    console.log("Result:", res.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error("Error standard pg:", err);
    process.exit(1);
  });
