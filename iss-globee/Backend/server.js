import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());

let latestTLE = null;
let latestISSPosition = null;

// ----------------------
// Fetch TLE safely (FIXED PARSING)
async function fetchTLE() {
  console.log('Fetching TLE from Celestrak...');
  try {
    const res = await fetch('https://celestrak.org/NORAD/elements/stations.txt');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const text = await res.text();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('ISS (ZARYA)')) {
        latestTLE = {
          line1: lines[i + 1].trim(),
          line2: lines[i + 2].trim()
        };

        console.log('TLE fetched successfully');
        return;
      }
    }

    throw new Error('ISS TLE not found');

  } catch (err) {
    console.error('Failed to fetch TLE:', err);
  }
}

fetchTLE();
setInterval(fetchTLE, 1000 * 60 * 60 * 2);

// ----------------------
// Fetch ISS position
async function fetchISSPosition() {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    if (!res.ok) throw new Error(`ISS fetch failed ${res.status}`);

    const data = await res.json();

    latestISSPosition = {
      latitude: data.latitude,
      longitude: data.longitude
    };

  } catch (err) {
    console.error('Failed to fetch ISS position:', err);
  }
}

fetchISSPosition();
setInterval(fetchISSPosition, 5000);

// ----------------------
// Routes
app.get('/iss-tle', (req, res) => {
  if (!latestTLE) return res.status(503).json({ error: 'TLE not ready yet' });
  res.json(latestTLE);
});

app.get('/iss-position', (req, res) => {
  if (!latestISSPosition) return res.status(503).json({ error: 'ISS position not ready yet' });
  res.json(latestISSPosition);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ----------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`ISS backend running at http://localhost:${PORT}`);
});