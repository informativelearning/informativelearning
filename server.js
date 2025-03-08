const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./devices.db'); // Creates or opens devices.db in your project folderconst express = require('express');
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (like your HTML and JS files) from the current directory
app.use(express.static(__dirname));

// In-memory storage for device IDs (temporary solution)
const deviceRegistry = new Map();

// Define the /register-device endpoint
app.post('/register-device', (req, res) => {
  console.log('Received request body:', req.body); // Log for debugging
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).send('Device ID is required');
  }
  if (!deviceRegistry.has(deviceId)) {
    deviceRegistry.set(deviceId, { verified: false, lastAccessStart: null });
    console.log(`Registered device: ${deviceId}`);
    res.send('Device registered successfully');
  } else {
    console.log(`Device already registered: ${deviceId}`);
    res.send('Device already registered');
  }
});

// Check verification status
app.get('/check-verification', (req, res) => {
  const { deviceId } = req.query;
  const device = deviceRegistry.get(deviceId);
  res.json({ verified: device ? device.verified : false });
});

// Verify device (admin endpoint)
app.post('/verify-device', (req, res) => {
  const { deviceId } = req.body;
  const device = deviceRegistry.get(deviceId);
  if (device) {
    device.verified = true;
    res.send('Device verified successfully');
  } else {
    res.status(404).send('Device not found');
  }
});

// Get access status for coursebooks.html
app.get('/get-access-status', (req, res) => {
  const { deviceId } = req.query;
  const device = deviceRegistry.get(deviceId);
  if (!device || !device.verified) {
    return res.json({ accessGranted: false, reason: 'Not verified' });
  }
  const now = Date.now();
  const threeHours = 3 * 60 * 60 * 1000; // 3-hour cooldown period
  const fortyMinutes = 40 * 60 * 1000;   // 40-minute access window
  if (!device.lastAccessStart || now - device.lastAccessStart >= threeHours) {
    // Start a new access window
    device.lastAccessStart = now;
    res.json({ accessGranted: true, remainingTime: fortyMinutes });
  } else if (now - device.lastAccessStart < fortyMinutes) {
    // Still within the 40-minute window
    const remaining = fortyMinutes - (now - device.lastAccessStart);
    res.json({ accessGranted: true, remainingTime: remaining });
  } else {
    // Access denied until the 3-hour cooldown expires
    const nextWindowAt = device.lastAccessStart + threeHours;
    res.json({ accessGranted: false, nextWindowAt });
  }
});

// Server-side functionality
// - Manages device registration (/register-device endpoint)
// - Handles device verification (/check-verification endpoint)
// - Controls access windows with 40-minute duration
// - Implements 3-hour cooldown between access periods
// - Serves static files
// - Runs on port 8080 by default

// Start the server on the port Fly.io provides or default to 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});