/**
 * aircraft.model.js — Aircraft data-access layer
 *
 * Exposes static helper methods that query the `aircrafts` table via the
 * shared MySQL connection pool.  The Aircraft constructor mirrors the
 * database columns and can be used when inserting/updating records.
 */
const pool = require("./db.js");

/**
 * Aircraft — lightweight model constructor.
 * @param {Object} aircraft  Plain object whose properties match DB columns.
 */
const Aircraft = function(aircraft) {
  this.icao24          = aircraft.icao24;
  this.registration    = aircraft.registration;
  this.manufacturername = aircraft.manufacturername;
  this.model           = aircraft.model;
  this.typecode        = aircraft.typecode;
  this.serialnumber    = aircraft.serialnumber;
  this.icaoaircrafttype = aircraft.icaoaircrafttype;
  this.operator        = aircraft.operator;
  this.owner           = aircraft.owner;
};

/**
 * findById — Looks up one aircraft by its 24-bit ICAO hex address.
 * @param  {string} id  ICAO24 hex code (e.g. "3c6444").
 * @returns {Promise<Object>}  The matching row or throws {kind:"not_found"}.
 */
Aircraft.findById = async (id) => {
  try {
    const [rows] = await pool.query("SELECT * FROM aircrafts WHERE icao24 = ?", [id]);
    if (rows.length) return rows[0];
    throw { kind: "not_found" };
  } catch (err) {
    console.error("DB error: ", err);
    throw err;
  }
};

module.exports = Aircraft;