/**
 * statistics.routes.js — Routes for the API usage statistics dashboard
 *
 * Mounted under /statistics (see server.js).
 *
 * GET /statistics       → Serves the statistics HTML page (Chart.js dashboard)
 * GET /statistics/data  → Returns daily request counts for the last 20 days,
 *                          sourced from the swagger-stats /metrics endpoint.
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');
const path = require('path');

// Serve the statistics HTML dashboard
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'statistics.html'));
});

/**
 * /statistics/data — Aggregates swagger-stats timeline data into daily buckets.
 * Returns a JSON object shaped for Chart.js:
 *   { labels: ["YYYY-MM-DD", …], data: [<count>, …] }
 */
router.get('/data', async (req, res) => {
    try {
        // Fetch raw metrics from the public swagger-stats endpoint
        const response = await axios.get(`https://dump1090.ebctech.solutions//swagger-stats/metrics`);
        const timeline = response.data.timeline;

        const days = 20;
        const endDate   = moment();
        const startDate = moment().subtract(days - 1, 'days');
        
        // Pre-populate every day in the window with 0 so gaps are visible
        const dailyRequests = {};
        for (let i = 0; i < days; i++) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            dailyRequests[date] = 0;
        }

        // Sum requests per day from the swagger-stats timeline
        for (const entry of timeline) {
            const entryDate = moment(entry.ts);
            if (entryDate.isBetween(startDate, endDate, 'day', '[]')) {
                const dateKey = entryDate.format('YYYY-MM-DD');
                if (dailyRequests.hasOwnProperty(dateKey)) {
                    dailyRequests[dateKey] += entry.requests;
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