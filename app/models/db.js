/**
 * db.js — MySQL connection pool
 *
 * Creates a shared mysql2 promise-based pool that is reused across the
 * application.  Pool settings are tuned for a moderately loaded API:
 *   - connectionLimit: maximum simultaneous connections kept alive
 *   - waitForConnections: queue requests when the pool is exhausted
 *   - queueLimit: 0 means the queue is unlimited
 */
const mysql = require("mysql2/promise");
const dbConfig = require("../config/db.config.js");

const pool = mysql.createPool({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
  connectionLimit: 50,
  queueLimit: 0,
  waitForConnections: true
});

module.exports = pool;