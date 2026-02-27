/**
 * db.config.js — MySQL connection parameters
 *
 * Values are read from environment variables so that credentials are never
 * committed to source control.  Copy .env.example to .env and fill in the
 * values for local development.
 */
module.exports = {
  HOST:     process.env.DB_HOST     || "localhost",
  USER:     process.env.DB_USER     || "dump1090User",
  PASSWORD: process.env.DB_PASSWORD || "",
  DB:       process.env.DB_NAME     || "dump1090"
};