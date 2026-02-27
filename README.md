# ebcAircraftAPI

REST API for aircraft lookup backed by a MySQL database populated from [dump1090](https://github.com/flightaware/dump1090) data.  
Built for the **Dump1090 Android** app (≥ V2023.01) — clients query aircraft details by ICAO 24-bit hex address in real time.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│  Node.js Master Process  (cluster manager)   │
│  Forks one worker per logical CPU core        │
└──────────┬───────────────────────────────────┘
           │  cluster.fork() × N
┌──────────▼───────────────────────────────────┐
│  Worker Process (Express app)                │
│                                              │
│  Helmet ── Body parsers ── swagger-stats     │
│                │                             │
│     ┌──────────┴──────────┐                  │
│     │                     │                  │
│  /api/aircraft        /statistics            │
│     │                     │                  │
│  node-cache (5 min)   swStats.getCoreStats() │
│     │                                        │
│  MySQL pool (mysql2/promise, limit 50)       │
└──────────────────────────────────────────────┘
```

- **Cluster**: one worker per `os.cpus().length`; crashed workers are automatically restarted.  
- **Caching**: ICAO24 lookups are cached in-process with a 5-minute TTL (node-cache) to reduce DB load.  
- **Security**: [Helmet](https://helmetjs.github.io/) sets security-relevant HTTP headers (CSP, HSTS, X-Frame-Options, etc.).  
- **Monitoring**: [swagger-stats](https://swaggerstats.io/) collects per-endpoint metrics with 2-minute timeline buckets; exposed at `/swagger-stats/ui`.

---

## Requirements

| Dependency | Version |
|---|---|
| Node.js | 24 (see `.node-version`) |
| MySQL / MariaDB | 5.7 + / 10.3 + |

---

## Installation

```bash
git clone https://github.com/ebc81/ebcaircraftAPI.git
cd ebcaircraftAPI
npm install
```

### Environment variables

Copy the example file and fill in your database credentials:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | TCP port the API listens on |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_USER` | `dump1090User` | MySQL user |
| `DB_PASSWORD` | *(empty)* | MySQL password |
| `DB_NAME` | `dump1090` | MySQL database name |

### Database

The API expects an `aircrafts` table with at least the following columns:

```sql
CREATE TABLE IF NOT EXISTS aircrafts (
  icao24           VARCHAR(6)   NOT NULL PRIMARY KEY,  -- 24-bit ICAO hex address
  registration     VARCHAR(20),
  manufacturername VARCHAR(100),
  model            VARCHAR(100),
  typecode         VARCHAR(10),
  serialnumber     VARCHAR(50),
  icaoaircrafttype VARCHAR(10),
  operator         VARCHAR(100),
  owner            VARCHAR(100)
);
```

The database user needs `SELECT` privileges on this table.

---

## Running

```bash
# Production (cluster mode)
node server.js

# Single-process (development)
node -e "process.env.NODE_APP_INSTANCE=0" server.js
```

The master process logs forked workers; each worker prints its PID and port on startup:

```
Worker 12345 running on port 8080.
```

---

## API Reference

### `GET /`

Health-check / welcome endpoint.

**Response `200`**
```json
{ "message": "Welcome to ebctech web app RestAPI for Dump1090 Android V2023.01" }
```

---

### `GET /api/aircraft/:id`

Returns full aircraft details for the given ICAO 24-bit hex address.  
Results are served from the in-memory cache when available (TTL 5 min).

**Path parameter**

| Parameter | Type | Example | Description |
|---|---|---|---|
| `id` | string | `3c6444` | ICAO24 hex code (case-insensitive) |

**Response `200`**
```json
{
  "icao24":           "3c6444",
  "registration":     "D-AIBL",
  "manufacturername": "Airbus",
  "model":            "A319-114",
  "typecode":         "A319",
  "serialnumber":     "648",
  "icaoaircrafttype": "L2J",
  "operator":         "Lufthansa",
  "owner":            "Lufthansa"
}
```

**Response `404`** — aircraft not in the database
```json
{ "icao24": "3c6444", "message": "Not found Aircraft with icao24 3c6444." }
```

**Response `500`** — database / server error
```json
{ "message": "Server error" }
```

---

### `GET /statistics`

Serves an HTML dashboard (Chart.js bar chart) showing API request counts for the last 20 days.

---

### `GET /statistics/data`

Returns the aggregated daily request counts used by the dashboard.  
Data is read directly from the in-process swagger-stats core — no HTTP round-trip.

**Response `200`**
```json
{
  "labels": ["2026-02-08", "2026-02-09", "…", "2026-02-27"],
  "data":   [142, 398, 0, 271, "…", 504]
}
```

Both arrays are sorted chronologically (ascending). Days with no traffic return `0`.

---

### `GET /swagger-stats/ui`

swagger-stats built-in monitoring dashboard — request rates, response codes, latency histograms, and the 2-minute-bucket timeline used by `/statistics/data`.

---

## Project structure

```
ebcaircraftAPI/
├── server.js                        # Entry point — cluster + Express bootstrap
├── .env.example                     # Environment variable template
├── app/
│   ├── config/
│   │   └── db.config.js             # DB connection parameters (reads from env)
│   ├── models/
│   │   ├── db.js                    # mysql2 promise pool (limit 50)
│   │   └── aircraft.model.js        # Aircraft constructor + findById()
│   ├── controllers/
│   │   └── aircraft.controller.js   # findOne handler + node-cache layer
│   ├── routes/
│   │   ├── aircraft.routes.js       # GET /api/aircraft/:id
│   │   └── statistics.routes.js     # GET /statistics, GET /statistics/data
│   └── views/
│       └── statistics.html          # Chart.js dashboard (served statically)
└── public/                          # Static assets (if any)
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP framework |
| `helmet` | Security headers |
| `mysql2` | MySQL client with promise pool support |
| `node-cache` | In-memory result cache (TTL-based) |
| `swagger-stats` | API metrics collection and UI |
| `moment` | Date parsing and formatting for statistics aggregation |
| `axios` | HTTP client (available; currently unused in routes) |
| `express-rate-limit` | Rate limiting middleware (available; attach as needed) |

---

## License

ISC — © [ebctech.eu](https://ebctech.eu)
