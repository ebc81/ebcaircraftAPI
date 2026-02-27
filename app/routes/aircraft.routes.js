/**
 * aircraft.routes.js — Routes for the Aircraft resource
 *
 * All routes are mounted under /api/aircraft (see server.js).
 *
 * GET /api/aircraft/:id  →  look up one aircraft by ICAO24 hex code
 */
module.exports = app => {
  const aircraft = require("../controllers/aircraft.controller.js");
  
  var router = require("express").Router();
  
  // Retrieve a single Aircraft with icao24 hex id
  router.get("/:id", aircraft.findOne);
  
  app.use('/api/aircraft', router);
};