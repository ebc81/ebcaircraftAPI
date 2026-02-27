/**
 * server.js — Entry point for the ebcAircraftAPI
 *
 * Uses Node.js cluster to spawn one worker per CPU core so that the API
 * can handle concurrent requests without blocking.  Each worker runs an
 * Express application secured by Helmet and monitored by swagger-stats.
 */

const express = require("express");
const app = express();
const helmet = require('helmet');
const cluster = require("cluster");
const os = require("os");
var swStats = require('swagger-stats');

if (cluster.isMaster) {
  // Fork one worker process per logical CPU core
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Automatically restart a worker if it crashes
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // ── Monitoring ──────────────────────────────────────────────────────────────
  // swagger-stats collects API metrics; timeline buckets are 2 minutes wide
  app.use(swStats.getMiddleware({timelineBucketDuration: 120000}));

  // ── Security ─────────────────────────────────────────────────────────────────
  // Helmet sets security-related HTTP headers (CSP, HSTS, X-Frame-Options, …)
  app.use(helmet());

  // ── Body parsers ─────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Health-check / welcome route ─────────────────────────────────────────────
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to ebctech web app RestAPI for Dump1090 Android V2023.01" });
  });

  // ── Application routes ───────────────────────────────────────────────────────
  const statisticsRoutes = require("./app/routes/statistics.routes.js");
  app.use('/statistics', statisticsRoutes);

  require("./app/routes/aircraft.routes.js")(app);

  // ── Start listening ──────────────────────────────────────────────────────────
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on port ${PORT}.`);
  });
}