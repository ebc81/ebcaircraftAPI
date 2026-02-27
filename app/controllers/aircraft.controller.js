/**
 * aircraft.controller.js — Request handlers for the /api/aircraft routes
 *
 * Results are cached in memory with a 5-minute TTL (node-cache) to reduce
 * unnecessary database round-trips for repeated lookups of the same ICAO24.
 */
const Aircraft = require("../models/aircraft.model.js");
const NodeCache = require("node-cache");

// In-memory cache — entries expire automatically after 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

/**
 * findOne — GET /api/aircraft/:id
 * Returns the aircraft record matching the given ICAO24 hex identifier.
 * Responds with 404 when the aircraft is not found, 500 on DB errors.
 */
exports.findOne = async (req, res) => {
  const id = req.params.id;

  // Return cached result immediately if available
  const cached = cache.get(id);
  if (cached) return res.send(cached);

  try {
    const data = await Aircraft.findById(id);
    cache.set(id, data);
    res.send(data);
  } catch (err) {
    if (err.kind === "not_found") {
      res.status(404).send({
        icao24: id,
        message: `Not found Aircraft with icao24 ${id}.`
      });
    } else {
      res.status(500).send({
        message: "Server error"
      });
    }
  }
};