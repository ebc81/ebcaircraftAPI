/**
 * statistics.routes.js — Routes for the API usage statistics dashboard
 *
 * Mounted under /statistics (see server.js).
 *
 * GET /statistics       → Serves the statistics HTML page (Chart.js dashboard)
 * GET /statistics/data  → Returns daily request counts for the last 20 days,
 *                          read directly from the in-process swagger-stats core
 *                          (no HTTP round-trip needed).
 */
const express = require('express');
const router  = express.Router();
const moment  = require('moment');
const path    = require('path');
// Access swagger-stats data directly — avoids a self-referencing HTTP call
// and works correctly in a cluster (each worker reports its own stats).
const swStats = require('swagger-stats');

// Serve the statistics HTML dashboard
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'statistics.html'));
});

/**
 * /statistics/data — Aggregates swagger-stats timeline data into daily buckets.
 *
 * swagger-stats stores timeline as parallel arrays inside `timeline.data`:
 *   { ts: [epochMs, …], requests: [count, …], … }
 *
 * Returns a JSON object shaped for Chart.js:
 *   { labels: ["YYYY-MM-DD", …], data: [<count>, …] }
 */
router.get('/data', (req, res) => {
    try {
        const coreStats    = swStats.getCoreStats();
        const timelineData = coreStats && coreStats.timeline && coreStats.timeline.data;

        const days      = 20;
        const endDate   = moment();
        const startDate = moment().subtract(days - 1, 'days');

        // Pre-populate every day in the window with 0 so gaps are visible in the chart
        const dailyRequests = {};
        for (let i = 0; i < days; i++) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            dailyRequests[date] = 0;
        }

        // timeline.data uses parallel arrays: ts[i] is the bucket timestamp,
        // requests[i] is the request count for that bucket.
        if (timelineData && Array.isArray(timelineData.ts)) {
            for (let i = 0; i < timelineData.ts.length; i++) {
                const entryDate = moment(timelineData.ts[i]);
                if (entryDate.isBetween(startDate, endDate, 'day', '[]')) {
                    const dateKey = entryDate.format('YYYY-MM-DD');
                    if (Object.prototype.hasOwnProperty.call(dailyRequests, dateKey)) {
                        dailyRequests[dateKey] += timelineData.requests[i] || 0;
                    }
                }
            }
        }

        // Sort labels ascending so the chart reads left-to-right chronologically
        const labels = Object.keys(dailyRequests).sort();
        const data   = labels.map(label => dailyRequests[label]);

        res.json({ labels, data });

    } catch (error) {
        console.error("Error fetching statistics data:", error);
        res.status(500).json({
            message: "Could not load statistics data.",
            error: error.message || error.toString()
        });
    }
});

module.exports = router;