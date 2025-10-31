// config/db.js
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config(); // make sure env loads before pool

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(() => console.log("✅ Connected to Neon PostgreSQL from backend"))
  .catch(err => console.error("❌ DB connection error:", err));

export default pool;
